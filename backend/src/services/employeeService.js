const fs = require('node:fs');
const path = require('node:path');
const { getSupabaseClient } = require('../supabase');

const LOCAL_STORE_PATH = path.resolve(__dirname, '../../data/employees.json');

const INITIAL_EMPLOYEES = [
  {
    employee_id: 'KS001',
    name: 'Marcus Thorne',
    email: 'm.thorne@peopleflow.ai',
    department: 'Product Design',
    role: 'Lead Designer',
    joining_date: '2026-01-15',
    initials: 'MT',
    status: 'Active',
    created_at: '2026-01-15T00:00:00.000Z',
  },
  {
    employee_id: 'KS002',
    name: 'Elena Rodriguez',
    email: 'e.rodriguez@peopleflow.ai',
    department: 'Engineering',
    role: 'SRE Engineer',
    joining_date: '2026-02-01',
    initials: 'ER',
    status: 'Provisioning',
    created_at: '2026-02-01T00:00:00.000Z',
  },
  {
    employee_id: 'KS003',
    name: 'Jordan Smith',
    email: 'j.smith@peopleflow.ai',
    department: 'Marketing',
    role: 'CMO',
    joining_date: '2026-03-10',
    initials: 'JS',
    status: 'Active',
    created_at: '2026-03-10T00:00:00.000Z',
  },
];

function loadLocalEmployees() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const content = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading local employees store:', err.message);
  }
  saveLocalEmployees(INITIAL_EMPLOYEES);
  return INITIAL_EMPLOYEES;
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
      if (!error && Array.isArray(data) && data.length > 0) {
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
      }
    } catch (e) {
      // Fallback to local
    }
  }

  const local = loadLocalEmployees();
  local.unshift(newEmployee);
  saveLocalEmployees(local);
  return newEmployee;
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

module.exports = {
  getAllEmployees,
  createEmployee,
  deleteEmployee,
  generateNextEmployeeId,
};
