const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function getPythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }

  const rootVenvWin = path.resolve(__dirname, '../../../.venv/Scripts/python.exe');
  if (fs.existsSync(rootVenvWin)) return rootVenvWin;

  const rootVenvNix = path.resolve(__dirname, '../../../.venv/bin/python');
  if (fs.existsSync(rootVenvNix)) return rootVenvNix;

  const llmVenvWin = path.resolve(__dirname, '../../../LLM/.venv/Scripts/python.exe');
  if (fs.existsSync(llmVenvWin)) return llmVenvWin;

  const llmVenvNix = path.resolve(__dirname, '../../../LLM/.venv/bin/python');
  if (fs.existsSync(llmVenvNix)) return llmVenvNix;

  return process.platform === 'win32' ? 'python' : 'python3';
}

function getBridgeScriptPath() {
  return path.resolve(__dirname, '../../../LLM/api_bridge.py');
}

function startListener() {
  const pythonExe = getPythonExecutable();
  const llmDir = path.resolve(__dirname, '../../../LLM');
  const listenerScript = path.join(llmDir, 'app.py');
  const child = spawn(pythonExe, [listenerScript, 'listen'], {
    cwd: llmDir,
    env: { ...process.env },
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(`Failed to start the LLM listener: ${error.message}`);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && signal === null) {
      console.error(`LLM listener exited with code ${code}.`);
    }
  });

  return child;
}

function runBridgeAction(action, args = []) {
  return new Promise((resolve, reject) => {
    const pythonExe = getPythonExecutable();
    const bridgeScript = getBridgeScriptPath();
    const llmDir = path.resolve(__dirname, '../../../LLM');

    const spawnArgs = [bridgeScript, action, ...args];
    const env = { ...process.env };

    const child = spawn(pythonExe, spawnArgs, { cwd: llmDir, env });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start python process: ${err.message}`));
    });

    child.on('close', (code) => {
      if (!stdout.trim()) {
        return reject(new Error(stderr.trim() || `Python process exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.success) {
          return reject(new Error(parsed.error || 'Python action failed'));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse python output: ${stdout.trim()} (stderr: ${stderr.trim()})`));
      }
    });
  });
}

async function classifyRole(designation) {
  if (!designation || typeof designation !== 'string') {
    throw new Error('Designation string is required');
  }
  return await runBridgeAction('classify-role', [designation.trim()]);
}

async function chooseChannel(designation, channels = []) {
  if (!designation || typeof designation !== 'string') {
    throw new Error('Designation string is required');
  }
  const channelsJson = JSON.stringify(Array.isArray(channels) ? channels : []);
  return await runBridgeAction('choose-channel', [designation.trim(), channelsJson]);
}

async function provisionWorkspace(personalEmail, firstName, lastName, designation) {
  if (!personalEmail || !firstName || !lastName || !designation) {
    throw new Error('personalEmail, firstName, lastName, and designation are required');
  }
  return await runBridgeAction('provision', [
    personalEmail.trim(),
    firstName.trim(),
    lastName.trim(),
    designation.trim(),
  ]);
}

async function startOnboarding(email, designation, role = '') {
  if (!email || !designation) {
    throw new Error('email and designation are required');
  }
  return await runBridgeAction('onboard', [
    email.trim(),
    designation.trim(),
    role ? role.trim() : '',
  ]);
}

async function startExternalOnboarding(workEmail, role) {
  if (!workEmail || !role) {
    throw new Error('workEmail and role are required');
  }
  return await runBridgeAction('external', [workEmail.trim(), role.trim()]);
}

async function getPendingOnboarding() {
  return await runBridgeAction('get-pending');
}

async function checkActivation() {
  return await runBridgeAction('check-activation');
}

async function disableZoho(workEmail) {
  if (!workEmail) throw new Error('workEmail is required');
  return await runBridgeAction('disable-zoho', [workEmail.trim()]);
}

async function removeGithub(usernameOrEmail, invitationId = '') {
  if (!usernameOrEmail) throw new Error('usernameOrEmail is required');
  return await runBridgeAction('remove-github', [usernameOrEmail.trim(), invitationId.trim()]);
}

async function revokeJira(accountIdOrEmail) {
  if (!accountIdOrEmail) throw new Error('accountIdOrEmail is required');
  return await runBridgeAction('revoke-jira', [accountIdOrEmail.trim()]);
}

async function removeSlackUser(target) {
  if (!target) throw new Error('target is required');
  return await runBridgeAction('remove-slack-user', [target.trim()]);
}

module.exports = {
  startListener,
  classifyRole,
  chooseChannel,
  provisionWorkspace,
  startOnboarding,
  startExternalOnboarding,
  getPendingOnboarding,
  checkActivation,
  disableZoho,
  removeGithub,
  revokeJira,
  removeSlackUser,
};
