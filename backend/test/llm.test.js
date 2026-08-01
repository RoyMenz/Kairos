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

test('POST /api/llm/classify-role returns 400 when designation is missing', async () => {
  const response = await fetch(`${baseUrl}/api/llm/classify-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Designation is required');
});

test('POST /api/llm/choose-channel returns 400 when designation is missing', async () => {
  const response = await fetch(`${baseUrl}/api/llm/choose-channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Designation is required');
});

test('POST /api/onboarding/provision returns 400 when parameters are missing', async () => {
  const response = await fetch(`${baseUrl}/api/onboarding/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalEmail: 'user@gmail.com' }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(
    data.error,
    'personalEmail, firstName, lastName, and designation are required'
  );
});

test('POST /api/onboarding/start returns 400 when parameters are missing', async () => {
  const response = await fetch(`${baseUrl}/api/onboarding/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@nigmafest.in' }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'email and designation are required');
});

test('POST /api/onboarding/external returns 400 when parameters are missing', async () => {
  const response = await fetch(`${baseUrl}/api/onboarding/external`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workEmail: 'user@nigmafest.in' }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'workEmail and role are required');
});

test('GET /api/onboarding/pending fetches pending onboarding list', async () => {
  const response = await fetch(`${baseUrl}/api/onboarding/pending`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(typeof data.pending === 'object');
});

test('POST /api/llm/classify-role classifies role via Gemini LLM', async () => {
  const response = await fetch(`${baseUrl}/api/llm/classify-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designation: 'Backend Developer' }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(typeof data.role === 'string');
});

