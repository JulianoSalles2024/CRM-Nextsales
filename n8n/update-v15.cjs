const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTk5MTFjNS1iNmJhLTQyNWEtODJkYS0zOGMxZjc2NzdmZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczODY5NDE3fQ.JB6Ehz_BTOQOy6jbeZlAUXxeqNyvSVyvC06pLKqUhzU';
const workflowId = 'I9Ej1gqj7vDHFzVr';

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'WF-07-AGENT-EXECUTOR-V15.json'), 'utf8'));
const body = JSON.stringify(wf);

const options = {
  hostname: 'n8n.julianosalles.com.br',
  path: `/api/v1/workflows/${workflowId}`,
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Workflow updated successfully!');
    } else {
      console.log('Response:', data.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
