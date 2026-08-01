const express = require('express');
const path = require('path');

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
