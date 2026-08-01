import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;
const buildDirectory = path.join(__dirname, 'build');

app.use(express.json());
app.use(express.static(buildDirectory));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.use((request, response) => {
  response.sendFile(path.join(buildDirectory, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
