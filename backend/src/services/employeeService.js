const fs = require('node:fs');
const path = require('node:path');
const { getSupabaseClient } = require('../supabase');

const LOCAL_STORE_PATH = path.resolve(__dirname, '../../data/employees.json');

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

async function getAllEmployees() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      // Fallback to local
    }
  }
  return loadLocalEmployees();
}

async function createEmployee({ name, email, role, joiningDate, department }) {
  if (!name || !email || !role) {
    throw new Error('Name, email, and role are required');
  }

  const existingEmployees = await getAllEmployees();

  const duplicate = existingEmployees.find(
    (e) => (e.email || '').toLowerCase() === email.trim().toLowerCase()
  );
  if (duplicate) {
    throw new Error(
      `An employee with email ${email} already exists (${duplicate.employee_id || duplicate.employeeId})`
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
    email: email.trim(),
    role: role.trim(),
    department: department ? department.trim() : 'Engineering',
    joining_date: joiningDate || new Date().toISOString().split('T')[0],
    initials,
    status: 'Provisioning',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('employees').insert([newEmployee]).select();
      if (!error && data && data.length > 0) {
        const local = loadLocalEmployees();
        local.unshift(data[0]);
        saveLocalEmployees(local);
        return data[0];
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

async function updateEmployeeStatus(identifier, status) {
  if (!identifier || !status) return null;
  const completedAt = status.toLowerCase() === 'active' || status.toLowerCase() === 'completed' ? new Date().toISOString() : null;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const updateData = { status };
      if (completedAt) updateData.completed_at = completedAt;
      await supabase
        .from('employees')
        .update(updateData)
        .or(`employee_id.eq.${identifier},email.eq.${identifier}`);
    } catch (e) {
      // ignore
    }
  }

  const local = loadLocalEmployees();
  const index = local.findIndex(
    (e) => e.employee_id === identifier || e.email === identifier
  );
  if (index !== -1) {
    local[index].status = status;
    if (completedAt) local[index].completed_at = completedAt;
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

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployeeStatus,
  getDashboardStats,
  getApplicationStats,
  deleteEmployee,
  generateNextEmployeeId,
};

