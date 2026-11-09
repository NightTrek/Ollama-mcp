import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

test('run tool over MCP with a mock Ollama API', { timeout: 30_000 }, async (t) => {
  const requests = [];
  const generated = '  Hello 🌍!\nA complete "response".  ';
  const api = http.createServer(async (req, res) => {
    let requestBody = '';
    for await (const chunk of req) requestBody += chunk;
    const body = JSON.parse(requestBody);
    requests.push({ method: req.method, path: req.url, body });

    res.setHeader('Content-Type', 'application/json');
    switch (body.prompt) {
      case 'missing-model':
        res.writeHead(404).end(JSON.stringify({ error: 'model test-model:latest not found' }));
        return;
      case 'disconnect':
        res.destroy();
        return;
      case 'timeout':
        // Leave the response open until the configured client timeout aborts it.
        return;
      case 'missing-response':
        res.end(JSON.stringify({ done: true }));
        return;
      case 'non-string-response':
        res.end(JSON.stringify({ response: 42, done: true }));
        return;
      case 'invalid-json':
        res.end('{"response":');
        return;
    }

    const response = body.prompt === 'empty-response' ? '' : generated;
    const json = JSON.stringify({ model: body.model, response, done: true });
    if (body.stream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.end(json + '\n');
      return;
    }

    // Split both JSON syntax and a UTF-8 character across HTTP body chunks.
    const bytes = Buffer.from(json);
    const emoji = bytes.indexOf(Buffer.from('🌍'));
    const boundary = emoji < 0 ? Math.floor(bytes.length / 2) : emoji + 2;
    res.write(bytes.subarray(0, 7));
    await new Promise(setImmediate);
    res.write(bytes.subarray(7, boundary));
    await new Promise(setImmediate);
    res.end(bytes.subarray(boundary));
  });

  let client;
  t.after(async () => {
    try {
      await client?.close();
    } finally {
      api.closeAllConnections();
      await new Promise((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
    }
  });
  await new Promise((resolve, reject) => {
    api.once('error', reject);
    api.listen(0, '127.0.0.1', resolve);
  });

  client = new Client({ name: 'ollama-run-tests', version: '1.0.0' }, { capabilities: {} });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../build/index.js', import.meta.url))],
    env: {
      ...process.env,
      OLLAMA_HOST: `http://127.0.0.1:${api.address().port}`,
      NO_PROXY: '*',
    },
  }));

  function run(prompt, options = {}) {
    return client.callTool({ name: 'run', arguments: { name: 'test-model:latest', prompt, ...options } });
  }

  await t.test('requests a complete generation and returns valid MCP text content', async () => {
    const prompt = 'Keep my "quotes" and\nnewlines';
    const result = await run(prompt);
    CallToolResultSchema.parse(result);
    assert.deepEqual(result, { content: [{ type: 'text', text: generated }] });
    assert.deepEqual(requests.at(-1), {
      method: 'POST',
      path: '/api/generate',
      body: { model: 'test-model:latest', prompt, stream: false },
    });
  });

  await t.test('preserves an empty generated response as text', async () => {
    assert.deepEqual(await run('empty-response'), { content: [{ type: 'text', text: '' }] });
  });

  for (const prompt of ['missing-response', 'non-string-response', 'invalid-json']) {
    await t.test(`rejects ${prompt} with an MCP error`, async () => {
      await assert.rejects(run(prompt), {
        code: -32603,
        message: /Failed to run model: Invalid Ollama response: expected a string in "response"/,
      });
    });
  }

  await t.test('preserves the error message from an Ollama HTTP failure', async () => {
    await assert.rejects(run('missing-model'), {
      code: -32603,
      message: /Ollama API error: model test-model:latest not found/,
    });
  });

  await t.test('reports a connection failure as an MCP error', async () => {
    await assert.rejects(run('disconnect'), { code: -32603, message: /Ollama API error:/ });
  });

  await t.test('honors the configured HTTP timeout', async () => {
    await assert.rejects(run('timeout', { timeout: 1000 }), {
      code: -32603,
      message: /Ollama API error: timeout of 1000ms exceeded/,
    });
    assert.deepEqual(requests.at(-1).body, {
      model: 'test-model:latest', prompt: 'timeout', stream: false,
    });
  });

  await t.test('can generate again after upstream errors', async () => {
    assert.deepEqual(await run('try-again'), { content: [{ type: 'text', text: generated }] });
  });
});
