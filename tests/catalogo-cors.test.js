import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/catalogo.js';

function response() {
  return {
    headers: {}, statusCode: 200, body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}

test('Framer can read the public catalog without credentials', async () => {
  const res = response();
  await handler({ method: 'GET', headers: { origin: 'https://project-2chuixy65wfvactqoq0k.framercanvas.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.catalog.products.length > 0);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.headers['access-control-allow-credentials'], undefined);
});

test('public catalog accepts read-only preflight requests', async () => {
  const res = response();
  await handler({ method: 'OPTIONS', headers: {} }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.headers['access-control-allow-methods'], 'GET, OPTIONS');
  assert.equal(res.body, undefined);
});

test('public catalog still rejects writes', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.ok, false);
});
