const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';

const app = require('../server');

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function fetchText(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options
  });
  const text = await response.text();
  return { response, text };
}

test('landing page loads', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response, text } = await fetchText(baseUrl, '/');
    assert.equal(response.status, 200);
    assert.match(text, /Roomloop/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('login page loads', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response, text } = await fetchText(baseUrl, '/login');
    assert.equal(response.status, 200);
    assert.match(text, /Login/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('dashboard redirects when not authenticated', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response } = await fetchText(baseUrl, '/dashboard');
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') || '', /\/login\?message=loggedOut/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('profile redirects when not authenticated', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response } = await fetchText(baseUrl, '/profile');
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') || '', /\/login\?message=loggedOut/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('room without id returns 404 page', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response, text } = await fetchText(baseUrl, '/room');
    assert.equal(response.status, 404);
    assert.match(text, /404|not found/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('static assets are served', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { response } = await fetchText(baseUrl, '/public/css/style.css');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/css/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
