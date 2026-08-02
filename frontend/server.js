import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;
const backendUrl = (process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const buildDirectory = path.join(__dirname, 'build');

app.use(express.json());
app.use(express.static(buildDirectory));

app.use('/api', async (request, response) => {
  try {
    const headers = { ...request.headers };
    delete headers.host;
    delete headers['content-length'];
    const upstream = await fetch(`${backendUrl}${request.originalUrl}`, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body || {}),
      signal: AbortSignal.timeout(30000),
    });
    response.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) response.type(contentType);
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error(`Backend proxy error: ${error.message}`);
    response.status(503).json({ error: `Backend API unavailable at ${backendUrl}` });
  }
});

app.use((request, response) => {
  response.sendFile(path.join(buildDirectory, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Proxying /api requests to ${backendUrl}`);
});
