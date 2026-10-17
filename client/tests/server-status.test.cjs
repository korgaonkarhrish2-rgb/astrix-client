const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { queryServerStatus } = require('../dist-electron/server-status.js');

function varInt(value) {
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value) byte |= 0x80;
    bytes.push(byte);
  } while (value);
  return Buffer.from(bytes);
}

function packet(payload) {
  return Buffer.concat([varInt(payload.length), payload]);
}

test('reads a Java Edition server status and ping latency', async () => {
  const server = net.createServer((socket) => {
    let requested = false;
    socket.on('data', (data) => {
      if (!requested) {
        requested = true;
        const json = Buffer.from(JSON.stringify({
          version: { name: '1.21.8', protocol: 772 },
          players: { online: 7, max: 20 },
          description: { text: 'Local test server' },
        }));
        socket.write(packet(Buffer.concat([Buffer.from([0]), varInt(json.length), json])));
      } else if (data.includes(1)) {
        socket.end(packet(Buffer.concat([Buffer.from([1]), Buffer.alloc(8)])));
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const status = await queryServerStatus(`127.0.0.1:${port}`);
    assert.equal(status.online, true);
    assert.equal(status.playersOnline, 7);
    assert.equal(status.playersMax, 20);
    assert.equal(status.version, '1.21.8');
    assert.ok(Number.isInteger(status.latencyMs) && status.latencyMs >= 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const unreachable = await queryServerStatus(`127.0.0.1:${port}`);
  assert.equal(unreachable.online, false);
  assert.equal(unreachable.playersOnline, null);
});

test('rejects non-server addresses before opening a socket', async () => {
  await assert.rejects(queryServerStatus('https://example.com'));
});
