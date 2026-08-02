const app = require('./app');
const { startListener } = require('./services/llmService');
const { startBackgroundWorker, stopBackgroundWorker } = require('./services/backgroundWorker');

const port = Number.parseInt(process.env.BACKEND_PORT || process.env.PORT || '5000', 10);
const llmListener = startListener();
startBackgroundWorker(60000);

const server = app.listen(port, () => {
  console.log(`Backend API server listening on http://localhost:${port}`);
  console.log('LLM listener & background worker started automatically.');
});

function shutdown(signal) {
  console.log(`\n${signal} received. Stopping backend and background services...`);
  stopBackgroundWorker();
  if (!llmListener.killed) llmListener.kill();
  server.close(() => process.exit(0));
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
