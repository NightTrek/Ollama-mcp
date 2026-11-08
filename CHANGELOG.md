# Changelog

## Unreleased

- Fix command injection in the `create`, `show`, `pull`, `push`, `cp`, and `rm`
  tools by running Ollama without a shell. Convert `serve` and `list` to the same
  shell-free execution and add MCP regression tests for every affected input.
  Thanks to @gongyanyugyy for reporting [#5](https://github.com/NightTrek/Ollama-mcp/issues/5).
