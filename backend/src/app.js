const express = require('express');
require('./env');
const { getSupabaseClient } = require('./supabase');
const llmService = require('./services/llmService');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (request.method === 'OPTIONS') {
    return response.sendStatus(200);
  }
  next();
});


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

// LLM Endpoints
app.post('/api/llm/classify-role', async (request, response, next) => {
  try {
    const { designation } = request.body || {};
    if (!designation || typeof designation !== 'string' || !designation.trim()) {
      return response.status(400).json({ error: 'Designation is required' });
    }
    const result = await llmService.classifyRole(designation);
    return response.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/llm/choose-channel', async (request, response, next) => {
  try {
    const { designation, existingChannels } = request.body || {};
    if (!designation || typeof designation !== 'string' || !designation.trim()) {
      return response.status(400).json({ error: 'Designation is required' });
    }
    const result = await llmService.chooseChannel(designation, existingChannels);
    return response.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Onboarding Endpoints
app.post('/api/onboarding/provision', async (request, response, next) => {
  try {
    const { personalEmail, firstName, lastName, designation } = request.body || {};
    if (!personalEmail || !firstName || !lastName || !designation) {
      return response.status(400).json({
        error: 'personalEmail, firstName, lastName, and designation are required',
      });
    }
    const result = await llmService.provisionWorkspace(
      personalEmail,
      firstName,
      lastName,
      designation
    );
    return response.status(200).json({ message: 'Workspace provisioning initiated', ...result });
  } catch (err) {
    next(err);
  }
});

app.post('/api/onboarding/start', async (request, response, next) => {
  try {
    const { email, designation, role } = request.body || {};
    if (!email || !designation) {
      return response.status(400).json({ error: 'email and designation are required' });
    }
    const result = await llmService.startOnboarding(email, designation, role);
    return response.status(200).json({ message: 'Onboarding initiated', ...result });
  } catch (err) {
    next(err);
  }
});

app.post('/api/onboarding/external', async (request, response, next) => {
  try {
    const { workEmail, role } = request.body || {};
    if (!workEmail || !role) {
      return response.status(400).json({ error: 'workEmail and role are required' });
    }
    const result = await llmService.startExternalOnboarding(workEmail, role);
    return response
      .status(200)
      .json({ message: 'External onboarding access initiated', ...result });
  } catch (err) {
    next(err);
  }
});

app.get('/api/onboarding/pending', async (request, response, next) => {
  try {
    const result = await llmService.getPendingOnboarding();
    return response.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/onboarding/check-activation', async (request, response, next) => {
  try {
    const result = await llmService.checkActivation();
    return response
      .status(200)
      .json({ message: 'Password activation check executed', ...result });
  } catch (err) {
    next(err);
  }
});

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: error.message || 'Internal server error' });
});

module.exports = app;



