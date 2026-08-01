const express = require('express');
require('./env');
const { getSupabaseClient } = require('./supabase');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.get('/', (request, response) => {
  response.json({ message: 'Express.js API is running' });
});

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

const handleLogin = async (request, response, next) => {
  try {
    const { email, workEmail, password } = request.body || {};
    const userEmail = typeof (email || workEmail) === 'string' ? (email || workEmail).trim() : '';

    if (!userEmail || typeof password !== 'string' || !password) {
      return response.status(400).json({ error: 'Work email and password are required' });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase URL or keys are missing in environment variables');
      return response.status(500).json({ error: 'Supabase authentication service not configured' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (error) {
      return response.status(401).json({
        error: error.message || 'Invalid work email or password',
      });
    }

    return response.status(200).json({
      message: 'Login successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        user_metadata: data.user?.user_metadata,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
        token_type: data.session?.token_type,
      },
    });
  } catch (err) {
    next(err);
  }
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


