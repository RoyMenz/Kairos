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

test('POST /login returns 401 on invalid credentials', async () => {
  process.env.MAIL = 'admin@company.com';
  process.env.PASS = 'secret123';

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'wrong@company.com', password: 'wrongpassword' }),
  });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.error, 'Invalid work email or password');
});

test('POST /login returns 200 on correct credentials matching MAIL & PASS', async () => {
  process.env.MAIL = 'user@workdomain.com';
  process.env.PASS = 'securePassword123!';

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@workdomain.com', password: 'securePassword123!' }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.message, 'Login successful');
  assert.equal(data.user.email, 'user@workdomain.com');
});

