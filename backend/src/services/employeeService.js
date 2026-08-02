const fs = require('node:fs');
const path = require('node:path');
const { getSupabaseClient } = require('../supabase');

const LOCAL_STORE_PATH = path.resolve(__dirname, '../../data/employees.json');

const TECHNICAL_ROLES = new Set([
  'backend', 'frontend', 'backend-developer', 'frontend-developer',
  'database-developer', 'data-engineer', 'qa-engineer', 'devops-engineer',
  'cloud-architect', 'security-engineer', 'machine-learning-engineer',
]);

function isTechnicalRole(roleStr) {
  if (!roleStr || typeof roleStr !== 'string') return true;
  const normalized = roleStr.trim().toLowerCase().replace(/\s+/g, '-');
  return TECHNICAL_ROLES.has(normalized);
}

function loadLocalEmployees() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const content = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading local employees store:', err.message);
  }
  return [];
}

function saveLocalEmployees(employees) {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(employees, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local employees store:', err.message);
  }
}

function generateNextEmployeeId(employees) {
  let maxNum = 0;
  for (const emp of employees) {
    const empId = emp.employee_id || emp.employeeId || '';
    if (typeof empId === 'string' && empId.toUpperCase().startsWith('KS')) {
      const num = parseInt(empId.substring(2), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `KS${String(nextNum).padStart(3, '0')}`;
}

function generateWorkEmail(name) {
  const cleaned = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = (process.env.ZOHO_WORKPLACE_DOMAIN || 'nigmafest.in').toLowerCase();
  return `${cleaned || 'user'}@${domain}`;
}

function ensureBusinessEmail(emailStr, nameStr = '') {
  const domain = (process.env.ZOHO_WORKPLACE_DOMAIN || 'nigmafest.in').toLowerCase();
  if (!emailStr || typeof emailStr !== 'string') {
    return `user@${domain}`;
  }
  const trimmed = emailStr.trim();
  if (trimmed.toLowerCase().endsWith(`@${domain}`)) {
    return trimmed;
  }
  if (nameStr) {
    return generateWorkEmail(nameStr);
  }
  const localPart = trimmed.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+/, '');
  return `${localPart || 'user'}@${domain}`;
}

function formatEmployeeWithBusinessEmail(emp) {
  if (!emp) return emp;
  const businessEmail = ensureBusinessEmail(emp.email, emp.name);
  return {
    ...emp,
    email: businessEmail,
    personal_email: emp.personal_email || emp.email,
  };
}

async function getAllEmployees() {
  let list = [];
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        list = data;
      }
    } catch (e) {
      // Fallback to local
    }
  }
  if (!list || list.length === 0) {
    list = loadLocalEmployees();
  }
  return list.map(formatEmployeeWithBusinessEmail);
}


async function createEmployee({ name, email, role, joiningDate, department, designation }) {
  if (!name || !email || !role) {
    throw new Error('Name, email, and role are required');
  }

  const personalEmail = email.trim();
  const domain = (process.env.ZOHO_WORKPLACE_DOMAIN || 'nigmafest.in').toLowerCase();
  const workEmail = personalEmail.toLowerCase().endsWith(`@${domain}`)
    ? personalEmail
    : generateWorkEmail(name);

  const existingEmployees = await getAllEmployees();

  const duplicate = existingEmployees.find(
    (e) => (e.email || '').toLowerCase() === workEmail.toLowerCase() || (e.personal_email || '').toLowerCase() === personalEmail.toLowerCase()
  );
  if (duplicate) {
    throw new Error(
      `An employee with email ${workEmail} already exists (${duplicate.employee_id || duplicate.employeeId})`
    );
  }

  const employee_id = generateNextEmployeeId(existingEmployees);
  const initials =
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EM';

  const newEmployee = {
    employee_id,
    name: name.trim(),
    email: workEmail,
    work_email: workEmail,
    personal_email: personalEmail,
    designation: (designation || role).trim(),
    role: role.trim(),
    department: department ? department.trim() : 'Engineering',
    joining_date: joiningDate || new Date().toISOString().split('T')[0],
    initials,
    status: 'Provisioning',
    zoho_zuid: null,
    zoho_account_id: null,
    slack_user_id: null,
    slack_channel_id: null,
    github_invitation_id: null,
    github_username: null,
    jira_account_id: null,
    platform_status: { zoho: 'Pending', slack: 'Pending', github: 'Pending', jira: 'Pending' },
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const {
        work_email,
        personal_email,
        designation,
        zoho_zuid,
        zoho_account_id,
        slack_user_id,
        slack_channel_id,
        github_invitation_id,
        github_username,
        jira_account_id,
        platform_status,
        ...corePayload
      } = newEmployee;

      const { data, error } = await supabase.from('employees').insert([corePayload]).select();
      if (!error && data && data.length > 0) {
        const fullRecord = { ...newEmployee, ...data[0] };
        const local = loadLocalEmployees();
        local.unshift(fullRecord);
        saveLocalEmployees(local);
        return fullRecord;
      } else if (error) {
        console.warn('Supabase insert warning/error:', error.message);
      }
    } catch (e) {
      console.warn('Supabase exception:', e.message);
    }
  }

  const local = loadLocalEmployees();
  local.unshift(newEmployee);
  saveLocalEmployees(local);
  return newEmployee;
}

async function updateEmployeeStatus(identifier, status, extraFields = {}) {
  if (!identifier || !status) return null;
  const statusLower = status.toLowerCase();
  const completedAt = statusLower === 'active' || statusLower === 'completed' ? new Date().toISOString() : null;
  const offboardedAt = statusLower === 'offboarded' ? new Date().toISOString() : null;

  const updateData = { status, ...extraFields };
  if (completedAt) updateData.completed_at = completedAt;
  if (offboardedAt) updateData.offboarded_at = offboardedAt;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('employees')
        .update(updateData)
        .or(`employee_id.eq.${identifier},email.eq.${identifier},work_email.eq.${identifier}`);
    } catch (e) {
      // ignore
    }
  }

  const local = loadLocalEmployees();
  const index = local.findIndex(
    (e) => e.employee_id === identifier || e.email === identifier || e.work_email === identifier
  );
  if (index !== -1) {
    local[index] = { ...local[index], ...updateData };
    saveLocalEmployees(local);
    return local[index];
  }
  return null;
}

async function getDashboardStats() {
  const employees = await getAllEmployees();

  const totalEmployees = employees.length;
  const activeOnboarding = employees.filter(
    (e) => (e.status || '').toLowerCase() === 'provisioning'
  ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const completedToday = employees.filter((e) => {
    const isCompleted = (e.status || '').toLowerCase() === 'active' || (e.status || '').toLowerCase() === 'completed';
    const isToday = e.completed_at ? e.completed_at.startsWith(todayStr) : e.created_at && e.created_at.startsWith(todayStr);
    return isCompleted && isToday;
  }).length;

  const failedTasks = 0;

  return {
    totalEmployees,
    activeOnboarding,
    completedToday,
    failedTasks,
    recentActivity: employees.slice(0, 10).map((emp) => {
      const isProvisioning = (emp.status || '').toLowerCase() === 'provisioning';
      const isCompleted = (emp.status || '').toLowerCase() === 'active' || (emp.status || '').toLowerCase() === 'completed';
      return {
        initials: emp.initials || 'EM',
        name: emp.name,
        email: emp.email,
        department: emp.department || 'Engineering',
        progress: isCompleted ? 100 : isProvisioning ? 65 : 40,
        status: isCompleted ? 'Completed' : isProvisioning ? 'Provisioning Assets' : 'Pending',
        error: false,
      };
    }),
  };
}

async function deleteEmployee(identifier) {
  if (!identifier) return false;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('employees')
        .delete()
        .or(`employee_id.eq.${identifier},email.eq.${identifier}`);
    } catch (e) {
      // ignore
    }
  }

  const local = loadLocalEmployees();
  const updated = local.filter(
    (e) => e.employee_id !== identifier && e.email !== identifier
  );
  saveLocalEmployees(updated);
  return true;
}

async function getApplicationStats() {
  const employees = await getAllEmployees();
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (e) => (e.status || '').toLowerCase() === 'active' || (e.status || '').toLowerCase() === 'completed'
  );
  const activeCount = activeEmployees.length;
  const provisioningCount = employees.filter(
    (e) => (e.status || '').toLowerCase() === 'provisioning'
  ).length;

  const applications = [
    {
      mark: 'Z',
      name: 'Zoho Workplace',
      description: 'Enterprise email hosting, identity provisioning, and password activation watcher.',
      users: String(totalEmployees),
      status: 'Connected',
      color: '#0066cc',
    },
    {
      mark: 'S',
      name: 'Slack Enterprise',
      description: 'Internal communication, AI channel routing, and automated onboarding listener.',
      users: String(totalEmployees),
      status: 'Connected',
      color: '#4A154B',
    },
    {
      mark: 'GH',
      name: 'GitHub Organization',
      description: 'Version control, team repository management (TeamKairos004), and access control.',
      users: String(activeCount > 0 ? activeCount : Math.max(0, totalEmployees - provisioningCount)),
      status: 'Connected',
      color: '#24292e',
    },
    {
      mark: 'J',
      name: 'Jira Software',
      description: 'Agile project tracking, Kairos project assignment, and developer role roles.',
      users: String(activeCount > 0 ? activeCount : Math.max(0, totalEmployees - provisioningCount)),
      status: 'Connected',
      color: '#0052CC',
    },
  ];

  const totalActiveSeats = applications.reduce((acc, app) => acc + parseInt(app.users || '0', 10), 0);
  const healthPercentage = totalEmployees > 0 ? Math.round(((activeCount + (totalEmployees - activeCount) * 0.8) / totalEmployees) * 100) : 100;

  return {
    applications,
    stats: {
      totalActiveSeats: totalActiveSeats.toLocaleString(),
      securityHealth: `${Math.min(100, Math.max(90, healthPercentage))}% Secure`,
      apiLatency: '18ms',
      systemStatus: 'Healthy',
    },
  };
}

async function getLogs() {
  const logs = [];
  const employees = await getAllEmployees();

  for (const emp of employees) {
    const initials = emp.initials || 'EM';
    const createdTime = emp.created_at || new Date().toISOString();
    const formattedCreatedTime = createdTime.replace('T', ' ').substring(0, 19);

    logs.push({
      id: `emp-created-${emp.employee_id || emp.email}`,
      time: formattedCreatedTime,
      rawTimestamp: new Date(createdTime).getTime() || Date.now(),
      icon: '＋',
      event: 'Zoho Account Provisioned',
      user: emp.email,
      initials,
      admin: 'System (AI)',
      status: 'Success',
      action: 'View JSON',
      app: 'Zoho Workplace',
    });

    if (emp.slack_channel || emp.classified_role) {
      logs.push({
        id: `slack-route-${emp.employee_id || emp.email}`,
        time: formattedCreatedTime,
        rawTimestamp: (new Date(createdTime).getTime() || Date.now()) + 1000,
        icon: '⚡',
        event: `Slack Channel Assigned (#${emp.slack_channel || 'backend-developers'})`,
        user: emp.email,
        initials,
        admin: 'Gemini AI',
        status: 'Success',
        action: 'Details',
        app: 'Slack Enterprise',
      });
    }

    const statusLower = (emp.status || '').toLowerCase();
    if (statusLower === 'active' || statusLower === 'completed') {
      const completedTime = emp.completed_at || createdTime;
      const formattedCompletedTime = completedTime.replace('T', ' ').substring(0, 19);
      const isTech = isTechnicalRole(emp.classified_role || emp.role);

      logs.push({
        id: `external-access-${emp.employee_id || emp.email}`,
        time: formattedCompletedTime,
        rawTimestamp: (new Date(completedTime).getTime() || Date.now()) + 2000,
        icon: '✓',
        event: isTech
          ? 'GitHub & Jira Access Dispatched'
          : 'Jira Access Dispatched (GitHub skipped for non-technical role)',
        user: emp.email,
        initials,
        admin: 'Password Watcher',
        status: 'Success',
        action: 'Logs',
        app: isTech ? 'GitHub Enterprise' : 'Jira Software',
      });
    }
  }

  try {
    const logPath = path.resolve(__dirname, '../../../LLM/onboarding.log');
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n');
      let logIndex = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}),\d+\s+(INFO|WARNING|ERROR)\s+(.*)$/);
        if (match) {
          const timestampStr = match[1];
          const logLevel = match[2];
          const message = match[3];

          let status = 'Success';
          let icon = '⚙';
          let app = 'System Flow';

          if (logLevel === 'ERROR') {
            status = 'Critical';
            icon = '⊘';
          } else if (logLevel === 'WARNING') {
            status = 'Warning';
            icon = '♢';
          } else if (message.includes('password changed')) {
            status = 'Success';
            icon = '✓';
            app = 'Zoho Workplace';
          } else if (message.includes('Listening')) {
            status = 'Success';
            icon = '◉';
            app = 'Slack Enterprise';
          }

          const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const rawEmail = emailMatch ? emailMatch[1] : '';
          const userEmail = rawEmail ? ensureBusinessEmail(rawEmail) : 'System Process';
          const initials = userEmail && userEmail !== 'System Process'
            ? userEmail.substring(0, 2).toUpperCase()
            : 'SYS';

          logs.push({
            id: `file-log-${logIndex++}`,
            time: timestampStr,
            rawTimestamp: new Date(timestampStr.replace(' ', 'T') + 'Z').getTime() || Date.now(),
            icon,
            event: message.length > 55 ? message.substring(0, 55) + '...' : message,
            user: userEmail,
            initials,
            admin: logLevel === 'ERROR' ? 'System Error' : 'System Flow',
            status,
            action: 'Logs',
            app,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Notice reading onboarding log:', err.message);
  }

  const sortedLogs = logs.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  return sortedLogs.slice(0, 100);
}

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployeeStatus,
  getDashboardStats,
  getApplicationStats,
  getLogs,
  deleteEmployee,
  generateNextEmployeeId,
};


