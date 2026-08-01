const express = require('express');
require('./env');
const { getSupabaseClient } = require('./supabase');
const llmService = require('./services/llmService');
const employeeService = require('./services/employeeService');

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

// Employee Endpoints
app.get('/api/employees', async (request, response, next) => {
  try {
    const employees = await employeeService.getAllEmployees();
    return response.status(200).json({ success: true, employees });
  } catch (err) {
    next(err);
  }
});

app.post('/api/employees', async (request, response, next) => {
  try {
    const { name, email, role, joiningDate, department, generateWorkflow = true } = request.body || {};
    if (!name || !email || !role) {
      return response.status(400).json({ error: 'Name, work email, and role are required' });
    }

    // 1. Create employee in DB with auto-increment KS001 ID
    const newEmployee = await employeeService.createEmployee({
      name,
      email,
      role,
      joiningDate,
      department,
    });

    let workflow = null;

    // 2. Trigger Gemini LLM Workflow generation & provisioning
    if (generateWorkflow !== false) {
      try {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || 'Employee';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        // Call Gemini LLM to classify employee designation/role
        let classification = { role: 'backend' };
        try {
          classification = await llmService.classifyRole(role);
        } catch (clsErr) {
          console.warn('Gemini classification notice:', clsErr.message);
        }

        // Call Gemini LLM to map optimal Slack channel
        let channelChoice = { channel: 'general' };
        try {
          channelChoice = await llmService.chooseChannel(role);
        } catch (chnErr) {
          console.warn('Gemini channel choice notice:', chnErr.message);
        }

        // Trigger Google Workspace account provisioning & activation email
        let provisionResult = null;
        try {
          provisionResult = await llmService.provisionWorkspace(
            email,
            firstName,
            lastName,
            role
          );
        } catch (provErr) {
          console.warn('Workspace provisioning notice:', provErr.message);
          provisionResult = { notice: provErr.message };
        }

        workflow = {
          classifiedRole: classification.role || 'backend',
          suggestedChannel: channelChoice.channel || 'general',
          provisioning: provisionResult,
          status: 'AI Workflow Generated',
        };

        newEmployee.classified_role = workflow.classifiedRole;
        newEmployee.slack_channel = workflow.suggestedChannel;
      } catch (llmErr) {
        console.warn('LLM workflow generation notice:', llmErr.message);
        workflow = { notice: llmErr.message };
      }
    }

    return response.status(201).json({
      message: 'Employee added & AI Onboarding workflow generated successfully',
      employee: newEmployee,
      workflow,
    });
  } catch (err) {
    return response.status(400).json({ error: err.message });
  }
});


app.delete('/api/employees/:id', async (request, response, next) => {
  try {
    const { id } = request.params;
    await employeeService.deleteEmployee(id);
    return response.status(200).json({ message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Dashboard Statistics & Activity Endpoint
app.get('/api/dashboard/stats', async (request, response, next) => {
  try {
    const stats = await employeeService.getDashboardStats();
    return response.status(200).json({ success: true, ...stats });
  } catch (err) {
    next(err);
  }
});

// Applications Endpoint
app.get('/api/applications', async (request, response, next) => {
  try {
    const appStats = await employeeService.getApplicationStats();
    return response.status(200).json({ success: true, ...appStats });
  } catch (err) {
    next(err);
  }
});


app.post('/api/employees/:id/status', async (request, response, next) => {
  try {
    const { id } = request.params;
    const { status } = request.body || {};
    if (!status) {
      return response.status(400).json({ error: 'Status is required' });
    }
    const updated = await employeeService.updateEmployeeStatus(id, status);
    return response.status(200).json({ message: 'Employee status updated in DB', employee: updated });
  } catch (err) {
    next(err);
  }
});


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

    // Automatically update employee status in DB to Active & set completed_at timestamp
    await employeeService.updateEmployeeStatus(workEmail, 'Active');

    return response
      .status(200)
      .json({ message: 'External onboarding access initiated & employee marked Active in DB', ...result });
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

    // Check pending records and auto-update DB status to Active for users with completed password change
    try {
      const pendingData = await llmService.getPendingOnboarding();
      if (pendingData && pendingData.pending) {
        for (const [email, record] of Object.entries(pendingData.pending)) {
          if (!record.awaiting_password_change || record.external_invites_sent) {
            await employeeService.updateEmployeeStatus(email, 'Active');
          }
        }
      }
    } catch (dbErr) {
      console.warn('Status update notice:', dbErr.message);
    }

    return response
      .status(200)
      .json({ message: 'Password activation check executed & completed statuses updated in DB', ...result });
  } catch (err) {
    next(err);
  }
});

app.post('/api/employees/:id/offboard', async (request, response, next) => {
  try {
    const { id } = request.params;
    const updated = await employeeService.updateEmployeeStatus(id, 'Offboarded');
    return response.status(200).json({
      message: 'Offboarding sequence initiated & employee status updated to Offboarded in DB',
      employee: updated,
    });
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



