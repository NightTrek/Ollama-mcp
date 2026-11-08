import assert from 'node:assert/strict';
import { chmod, copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const cliTools = [
  { name: 'serve', args: {}, argv: ['serve'] },
  { name: 'create', args: { name: 'custom:latest', modelfile: 'Modelfile' },
    argv: ['create', 'custom:latest', '-f', 'Modelfile'] },
  { name: 'show', args: { name: 'llama3:latest' }, argv: ['show', 'llama3:latest'] },
  { name: 'pull', args: { name: 'library/llama3:latest' }, argv: ['pull', 'library/llama3:latest'] },
  { name: 'push', args: { name: 'user/llama3:latest' }, argv: ['push', 'user/llama3:latest'] },
  { name: 'list', args: {}, argv: ['list'] },
  { name: 'cp', args: { source: 'llama3:latest', destination: 'copy:latest' },
    argv: ['cp', 'llama3:latest', 'copy:latest'] },
  { name: 'rm', args: { name: 'copy:latest' }, argv: ['rm', 'copy:latest'] },
];

const untrustedFields = [
  ['create', 'name', 1],
  ['create', 'modelfile', 3],
  ['show', 'name', 1],
  ['pull', 'name', 1],
  ['push', 'name', 1],
  ['cp', 'source', 1],
  ['cp', 'destination', 2],
  ['rm', 'name', 1],
];

test('Ollama CLI tools over MCP', { timeout: 60_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ollama-mcp-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const executable = join(directory, process.platform === 'win32' ? 'ollama.exe' : 'ollama');
  await copyFile(process.execPath, executable);
  await chmod(executable, 0o755);

  const log = join(directory, 'arguments.jsonl');
  const fixture = fileURLToPath(new URL('./fixtures/fake-ollama.cjs', import.meta.url));
  const env = {
    ...process.env,
    PATH: directory + delimiter + process.env.PATH,
    NODE_OPTIONS: `--require ${JSON.stringify(fixture)}`,
    OLLAMA_TEST_LOG: log,
  };
  // Windows environment variable names are case-insensitive; keep just one PATH.
  for (const key of Object.keys(env)) {
    if (key !== 'PATH' && key.toUpperCase() === 'PATH') delete env[key];
  }

  const client = new Client({ name: 'ollama-security-tests', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../build/index.js', import.meta.url))],
    env,
  });
  t.after(() => client.close());
  await client.connect(transport);

  async function callTool(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, undefined);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    return JSON.parse(result.content[0].text);
  }

  for (const { name, args, argv } of cliTools) {
    await t.test(`${name} keeps the CLI arguments and output`, async () => {
      assert.deepEqual(await callTool(name, args), argv);
    });
  }

  for (const [name, field, index] of untrustedFields) {
    const normal = cliTools.find((tool) => tool.name === name);
    await t.test(`${name}.${field} cannot execute an injected command`, async () => {
      const marker = join(directory, `${name}-${field}-injected`);
      const payload = process.platform === 'win32'
        ? `llama3 & echo INJECTED>"${marker}" & rem `
        : `llama3; echo INJECTED > "${marker}"; #`;
      const args = { ...normal.args, [field]: payload };
      const expected = [...normal.argv];
      expected[index] = payload;

      // Even when the CLI succeeds, a shell must never execute the second command.
      let result;
      try {
        result = await callTool(name, args);
      } finally {
        assert.equal(existsSync(marker), false, 'the injected command created its marker file');
      }
      assert.deepEqual(result, expected);
    });

    await t.test(`${name}.${field} preserves spaces, quotes and shell metacharacters`, async () => {
      const payload = 'a path/with spaces/"quotes" \'single\' $HOME $(echo expanded) `echo expanded` & | < > ; %TEMP%\nnext';
      const expected = [...normal.argv];
      expected[index] = payload;
      assert.deepEqual(await callTool(name, { ...normal.args, [field]: payload }), expected);
    });
  }

  await t.test('returns stderr when stdout is empty', async () => {
    assert.deepEqual(await callTool('show', { name: 'fixture-stderr' }), ['show', 'fixture-stderr']);
  });

  await t.test('keeps CLI failures as MCP errors', async () => {
    await assert.rejects(client.callTool({ name: 'pull', arguments: { name: 'fixture-fail' } }), {
      code: -32603,
      message: /Failed to pull model:.*Ollama fixture failed/s,
    });
  });

  await t.test('invokes the Ollama executable once per tool call', async () => {
    const invocations = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(invocations.length, cliTools.length + untrustedFields.length * 2 + 2);
  });
});
