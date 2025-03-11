# Ollama MCP Server

🚀 A powerful bridge between Ollama and the Model Context Protocol (MCP), enabling seamless integration of Ollama's local LLM capabilities into your MCP-powered applications.

<a href="https://glama.ai/mcp/servers/sxt5su901q">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/sxt5su901q/badge" alt="Ollama Server MCP server" />
</a>

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

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

MIT License - feel free to use in your own projects!

---

Built with ❤️ for the MCP ecosystem