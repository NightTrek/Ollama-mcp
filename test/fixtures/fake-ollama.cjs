const { appendFileSync, writeSync } = require('node:fs');
const { basename } = require('node:path');

// Preload only takes over the copied Node executable named ollama(.exe).
// Using a native executable also exercises shell-free execution on Windows.
if (/^ollama(?:\.exe)?$/i.test(basename(process.execPath))) {
  const args = [basename(process.argv[1]), ...process.argv.slice(2)];
  appendFileSync(process.env.OLLAMA_TEST_LOG, JSON.stringify(args) + '\n');

  if (args.includes('fixture-fail')) {
    writeSync(2, 'Ollama fixture failed');
    process.exit(2);
  }

  const output = JSON.stringify(args);
  writeSync(args.includes('fixture-stderr') ? 2 : 1, output);
  process.exit(0);
}
