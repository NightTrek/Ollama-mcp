# Ollama MCP Server

🚀 A powerful bridge between Ollama and the Model Context Protocol (MCP), enabling seamless integration of Ollama's local LLM capabilities into your MCP-powered applications.

## 🌟 Features

### Complete Ollama Integration
- **Full API Coverage**: Access all essential Ollama functionality through a clean MCP interface
- **OpenAI-Compatible Chat**: Drop-in replacement for OpenAI's chat completion API
- **Local LLM Power**: Run AI models locally with full control and privacy

### Core Capabilities
- 🔄 **Model Management**
  - Pull models from registries
  - Push models to registries
  - List available models
  - Create custom models from Modelfiles
  - Copy and remove models

- 🤖 **Model Execution**
  - Run models with customizable prompts
  - Chat completion API with system/user/assistant roles
  - Configurable parameters (temperature, timeout)
  - Raw mode support for direct responses

- 🛠 **Server Control**
  - Start and manage Ollama server
  - View detailed model information
  - Error handling and timeout management

## 🚀 Getting Started

### Prerequisites
- [Ollama](https://ollama.ai) installed on your system
- Node.js and npm/pnpm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build the server:
```bash
pnpm run build
```

### Configuration

Add the server to your MCP configuration:

#### For Claude Desktop:
MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ollama": {
      "command": "node",
      "args": ["/path/to/ollama-server/build/index.js"],
      "env": {
        "OLLAMA_HOST": "http://127.0.0.1:11434"  // Optional: customize Ollama API endpoint
      }
    }
  }
}
```

## 🛠 Usage Examples

### Pull and Run a Model
```typescript
// Pull a model
await mcp.use_mcp_tool({
  server_name: "ollama",
  tool_name: "pull",
  arguments: {
    name: "llama2"
  }
});

// Run the model
await mcp.use_mcp_tool({
  server_name: "ollama",
  tool_name: "run",
  arguments: {
    name: "llama2",
    prompt: "Explain quantum computing in simple terms"
  }
});
```

### Chat Completion (OpenAI-compatible)
```typescript
await mcp.use_mcp_tool({
  server_name: "ollama",
  tool_name: "chat_completion",
  arguments: {
    model: "llama2",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "What is the meaning of life?"
      }
    ],
    temperature: 0.7
  }
});
```

### Create Custom Model
```typescript
await mcp.use_mcp_tool({
  server_name: "ollama",
  tool_name: "create",
  arguments: {
    name: "custom-model",
    modelfile: "./path/to/Modelfile"
  }
});
```

## 🔧 Advanced Configuration

- `OLLAMA_HOST`: Configure custom Ollama API endpoint (default: http://127.0.0.1:11434)
- Timeout settings for model execution (default: 60 seconds)
- Temperature control for response randomness (0-2 range)

## 🤝 Contributing

### Development checks

Run `pnpm test` to build the server and run the MCP regression tests (Node.js 20 or newer).
The tests use a local stand-in executable; Ollama and downloaded models are not required.
CI runs the same checks on Linux and Windows with Node.js 20, 22, and 24.

### Model-management arguments

Ollama CLI tools pass model names and Modelfile paths as literal arguments without a shell.
Paths containing spaces do not need extra shell quotes. Shell expressions and environment
variables in these arguments are not expanded; supply the actual path instead.

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

MIT License - feel free to use in your own projects!

---

Built with ❤️ for the MCP ecosystem
