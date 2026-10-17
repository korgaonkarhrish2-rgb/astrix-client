import { promises as dns } from 'node:dns';
import net from 'node:net';
import { normalizeAddress } from './server-store';

export type ServerStatus = {
  online: boolean;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
};

const TIMEOUT_MS = 5000;
const MAX_PACKET_BYTES = 1024 * 1024;

function varInt(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value >>> 0;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining) byte |= 0x80;
    bytes.push(byte);
  } while (remaining);
  return Buffer.from(bytes);
}

function readVarInt(buffer: Buffer, start = 0): { value: number; end: number } | null {
  let result = 0;
  for (let index = 0; index < 5; index++) {
    const position = start + index;
    if (position >= buffer.length) return null;
    const byte = buffer[position];
    result |= (byte & 0x7f) << (index * 7);
    if (!(byte & 0x80)) return { value: result >>> 0, end: position + 1 };
  }
  throw new Error('Invalid Minecraft status packet.');
}

function packet(payload: Buffer): Buffer {
  return Buffer.concat([varInt(payload.length), payload]);
}

function parseAddress(address: string): { host: string; port: number; explicitPort: boolean } {
  const normalized = normalizeAddress(address);
  const match = /^(\[[0-9a-f:]+\]|[^:]+)(?::(\d+))?$/.exec(normalized)!;
  return { host: match[1].startsWith('[') ? match[1].slice(1, -1) : match[1], port: match[2] ? Number(match[2]) : 25565, explicitPort: !!match[2] };
}

async function connectionTarget(host: string, port: number, explicitPort: boolean) {
  if (explicitPort || net.isIP(host) || host === 'localhost') return { host, port };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      dns.resolveSrv(`_minecraft._tcp.${host}`),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('SRV lookup timed out')), 1500); }),
    ]);
    const chosen = [...records].sort((a, b) => a.priority - b.priority || b.weight - a.weight)[0];
    if (chosen?.name && chosen.port > 0 && chosen.port <= 65535) return { host: chosen.name, port: chosen.port };
  } catch {
    // Servers without SRV records use the address and default port directly.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return { host, port };
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function versionName(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80) : null;
}

export async function queryServerStatus(addressValue: unknown): Promise<ServerStatus> {
  const { host, port, explicitPort } = parseAddress(addressValue as string);
  const target = await connectionTarget(host, port, explicitPort);
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host: target.host, port: target.port });
    let pending = Buffer.alloc(0);
    let status: ServerStatus | null = null;
    let settled = false;
    let pingSentAt = 0;
    const finish = (result: ServerStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    const fail = (reason: string) => finish(status || {
      online: false, playersOnline: null, playersMax: null, version: null,
      latencyMs: null, checkedAt: Date.now(), error: reason,
    });

    socket.setTimeout(TIMEOUT_MS, () => fail('Server did not respond in time.'));
    socket.on('error', () => fail('Server is offline or unreachable.'));
    socket.on('end', () => fail('Server closed the status connection.'));
    socket.on('connect', () => {
      const addressBytes = Buffer.from(host, 'utf8');
      const serverPort = Buffer.alloc(2);
      serverPort.writeUInt16BE(target.port);
      const handshake = Buffer.concat([varInt(0), varInt(-1), varInt(addressBytes.length), addressBytes, serverPort, varInt(1)]);
      socket.write(Buffer.concat([packet(handshake), packet(Buffer.from([0]))]));
    });
    socket.on('data', (chunk) => {
      if (settled) return;
      pending = Buffer.concat([pending, chunk]);
      if (pending.length > MAX_PACKET_BYTES + 5) return fail('Server status response is too large.');
      try {
        while (pending.length) {
          const length = readVarInt(pending);
          if (!length) return;
          if (length.value > MAX_PACKET_BYTES) return fail('Server status response is too large.');
          if (pending.length < length.end + length.value) return;
          const body = pending.subarray(length.end, length.end + length.value);
          pending = pending.subarray(length.end + length.value);
          const id = readVarInt(body);
          if (!id) throw new Error('Invalid Minecraft status packet.');
          if (!status) {
            if (id.value !== 0) throw new Error('Unexpected Minecraft status packet.');
            const jsonLength = readVarInt(body, id.end);
            if (!jsonLength || jsonLength.value > MAX_PACKET_BYTES || jsonLength.end + jsonLength.value !== body.length) throw new Error('Invalid Minecraft status response.');
            const response = JSON.parse(body.subarray(jsonLength.end).toString('utf8')) as { players?: { online?: unknown; max?: unknown }; version?: { name?: unknown } };
            status = {
              online: true,
              playersOnline: count(response?.players?.online),
              playersMax: count(response?.players?.max),
              version: versionName(response?.version?.name),
              latencyMs: Date.now() - startedAt,
              checkedAt: Date.now(),
            };
            const payload = Buffer.alloc(9);
            payload[0] = 1;
            payload.writeBigInt64BE(BigInt(Date.now()), 1);
            pingSentAt = Date.now();
            socket.write(packet(payload));
          } else if (id.value === 1 && body.length === 9) {
            finish({ ...status, latencyMs: Date.now() - pingSentAt, checkedAt: Date.now() });
            return;
          }
        }
      } catch {
        fail('Server sent an invalid status response.');
      }
    });
  });
}
