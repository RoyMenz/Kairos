const llmService = require('./llmService');
const employeeService = require('./employeeService');

let workerInterval = null;

async function runWorkerTask() {
  try {
    // 1. Trigger password-change watcher & Slack membership reconciliation
    await llmService.checkActivation();

    // 2. Fetch all employees awaiting onboarding completion
    const employees = await employeeService.getAllEmployees();
    const provisioningEmployees = employees.filter(
      (e) => (e.status || '').toLowerCase() === 'provisioning'
    );

    for (const emp of provisioningEmployees) {
      const email = emp.work_email || emp.email;
      if (!email) continue;

      try {
        const pendingRes = await llmService.getPendingOnboarding();
        const pending = pendingRes?.pending || {};
        const record = pending[email.toLowerCase()];

        const platformStatus = {
          zoho: emp.zoho_zuid ? 'Connected' : 'Pending',
          slack: emp.slack_user_id ? 'Connected' : emp.slack_channel ? 'Assigned' : 'Pending',
          github: emp.github_username ? 'Connected' : emp.github_invitation_id ? 'Invited' : 'Pending',
          jira: emp.jira_account_id ? 'Connected' : 'Pending',
          ...(emp.platform_status || {}),
        };

        if (record && !record.awaiting_password_change) {
          // User completed first sign-in
          platformStatus.zoho = 'Connected';

          // Trigger external access if pending
          if (!record.external_invites_sent && emp.role) {
            try {
              const extRes = await llmService.startExternalOnboarding(email, emp.role);
              if (extRes.github_invitation_id) {
                emp.github_invitation_id = extRes.github_invitation_id;
                platformStatus.github = 'Invited';
              }
              if (extRes.jira_account_id) {
                emp.jira_account_id = extRes.jira_account_id;
                platformStatus.jira = 'Connected';
              }
            } catch (extErr) {
              platformStatus.external_error = extErr.message;
            }
          }

          // Mark as Active
          await employeeService.updateEmployeeStatus(email, 'Active', {
            platform_status: platformStatus,
            github_invitation_id: emp.github_invitation_id,
            jira_account_id: emp.jira_account_id,
          });
        }
      } catch (empErr) {
        console.warn(`Background worker notice for ${email}:`, empErr.message);
      }
    }
  } catch (err) {
    console.error('Background worker iteration error:', err.message);
  }
}

function startBackgroundWorker(intervalMs = 60000) {
  if (workerInterval) return;
  console.log(`Starting background worker (interval: ${intervalMs}ms)...`);
  // Run initial pass asynchronously
  setTimeout(runWorkerTask, 5000);
  workerInterval = setInterval(runWorkerTask, intervalMs);
}

function stopBackgroundWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('Background worker stopped.');
  }
}

module.exports = {
  startBackgroundWorker,
  stopBackgroundWorker,
  runWorkerTask,
};
