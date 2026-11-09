# Changelog

## Unreleased

- Fix the `run` tool's Node/Web stream mismatch and unsupported MCP content type.
  Request a complete Ollama generation and return valid text content, preserving
  empty output and surfacing upstream errors, timeouts, and malformed responses.
  Thanks to @louky69008 for reporting [#6](https://github.com/NightTrek/Ollama-mcp/issues/6).

- Fix command injection in the `create`, `show`, `pull`, `push`, `cp`, and `rm`
  tools by running Ollama without a shell. Convert `serve` and `list` to the same
  shell-free execution and add MCP regression tests for every affected input.
  Thanks to @gongyanyugyy for reporting [#5](https://github.com/NightTrek/Ollama-mcp/issues/5).
