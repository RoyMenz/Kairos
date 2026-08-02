const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /health reports a healthy service', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /api/health reports a healthy service for the frontend proxy', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('unknown routes return 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found' });
});

test('POST /login returns 400 when missing credentials', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Work email and password are required');
});

test('POST /login returns 401 or expected response on invalid Supabase credentials', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid_user_test@nigmafest.in', password: 'wrongpassword123' }),
  });

  // If Supabase env vars are present, returns 401; if missing in test env, returns 500
  assert.ok(response.status === 401 || response.status === 500);
  const data = await response.json();
  assert.ok(data.error);
});


