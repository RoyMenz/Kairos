const express = require('express');
require('./env');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.get('/', (request, response) => {
  response.json({ message: 'Express.js API is running' });
});

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

const handleLogin = (request, response) => {
  const { email, workEmail, password } = request.body || {};
  const userEmail = typeof (email || workEmail) === 'string' ? (email || workEmail).trim() : '';

  if (!userEmail || typeof password !== 'string' || !password) {
    return response.status(400).json({ error: 'Work email and password are required' });
  }

  const configuredMail = process.env.MAIL;
  const configuredPass = process.env.PASS;

  if (!configuredMail || !configuredPass) {
    console.error('MAIL or PASS environment variables are not set');
    return response.status(500).json({ error: 'Server authentication configuration missing' });
  }

  if (userEmail.toLowerCase() === configuredMail.trim().toLowerCase() && password === configuredPass) {
    return response.status(200).json({
      message: 'Login successful',
      user: {
        email: configuredMail
      }
    });
  }

  return response.status(401).json({ error: 'Invalid work email or password' });
};

app.post('/login', handleLogin);
app.post('/api/login', handleLogin);

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

