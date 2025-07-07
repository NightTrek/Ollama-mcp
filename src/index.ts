#!/usr/bin/env node

import {
  Server,
  StdioServerTransport,
  SSEServerTransport,
  CallToolRequestSchema,
  type CallToolRequest,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk';
import { exec } from 'child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Transform } from 'node:stream';
import { OllamaApi } from './ollama-api.js';
import { tools } from './tools.js';

// Create a union type of all valid tool names from the tools definition file.
type ToolName = typeof tools[number]['name'];

// --- Ollama Stream Response Types ---
// These interfaces describe the possible JSON objects in Ollama's streaming responses.
interface OllamaGenerateStreamPart {
  response: string;
}
interface OllamaChatStreamPart {
  message?: {
    content: string;
  };
}
interface OllamaProgressStreamPart {
  status: string;
}
type OllamaStreamPart = Partial<
  OllamaGenerateStreamPart & OllamaChatStreamPart & OllamaProgressStreamPart
>;

// Helper to create a stream that parses Ollama's line-delimited JSON
const createOllamaStreamParser = () => {
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        const data = chunk.toString();
        // Ollama streams multiple JSON objects, sometimes in one chunk.
        const lines = data.split('\n').filter((line: string) => line.trim() !== '');
        for (const line of lines) {
          const json: OllamaStreamPart = JSON.parse(line);
          // For 'generate' and 'run'
          if (typeof json.response === 'string') {
            this.push(json.response);
          }
          // For 'chat'
          else if (json.message?.content) {
            this.push(json.message.content);
          }
          // For 'pull', 'push', 'create'
          else if (typeof json.status === 'string') {
            this.push(`${json.status}\n`);
          }
        }
        callback();
      } catch (error) {
        callback(new McpError(
          ErrorCode.InternalError,
          `Error processing stream: ${error instanceof Error ? error.message : String(error)}`
        ));
      }
    }
  });
};

class OllamaServer {
  private server: Server;
  private ollamaApi: OllamaApi;

  constructor() {
    this.ollamaApi = new OllamaApi();
    this.server = new Server(
      {
        name: 'ollama-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [...tools],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params; // args is still 'any'

      // Type guard to ensure the tool name is valid before entering the switch.
      const isKnownTool = (name: string): name is ToolName => {
        return tools.some((t) => t.name === name);
      };

      if (!isKnownTool(name)) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
      try {
        // Thanks to the guard, 'name' is now correctly typed as ToolName.
        switch (name) {
          case 'serve':
            return this.handleServe();
          case 'create':
            return this.handleStreamedCommand((api) => api.create(args.name, args.modelfile));
          case 'run':
            return this.handleStreamedCommand((api) => api.generate(args.name, args.prompt, args.timeout));
          case 'pull':
            return this.handleStreamedCommand((api) => api.pull(args.name));
          case 'push':
            return this.handleStreamedCommand((api) => api.push(args.name));
          case 'chat_completion':
            return this.handleStreamedCommand((api) => api.chat(args.model, args.messages, args.temperature, args.timeout));
          case 'show':
          case 'get_model_info':
            return this.handleJsonCommand((api) => api.getModelInfo(args.name));
          case 'list_models':
            return this.handleJsonCommand((api) => api.listModels());
          case 'cp':
            return this.handleVoidCommand(
              (api) => api.copy(args.source, args.destination),
              `Successfully copied model from ${args.source} to ${args.destination}.`
            );
          case 'rm':
            return this.handleVoidCommand(
              (api) => api.remove(args.name),
              `Successfully removed model: ${args.name}.`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleServe() {
    // This still needs to use exec as it's a long-running process
    // on the host machine, not a simple API call.
    const child = exec('ollama serve');
    return {
      content: [
        {
          type: 'text',
          text: `Ollama serve process started with PID: ${child.pid}. Check server logs for output.`,
        },
      ],
    };
  }

  private async handleStreamedCommand(
    apiCall: (api: OllamaApi) => Promise<NodeJS.ReadableStream>
  ) {
    const stream = await apiCall(this.ollamaApi);
    return {
      content: [
        {
          type: 'stream',
          stream: stream.pipe(createOllamaStreamParser()),
        },
      ],
    };
  }

  private async handleJsonCommand(apiCall: (api: OllamaApi) => Promise<any>) {
    const data = await apiCall(this.ollamaApi);
    return {
      content: [
        {
          type: 'json',
          json: data,
        },
      ],
    };
  }

  private async handleVoidCommand(
    apiCall: (api: OllamaApi) => Promise<void>,
    successMessage: string
  ) {
    await apiCall(this.ollamaApi);
    return {
      content: [
        {
          type: 'text',
          text: successMessage,
        },
      ],
    };
  }

  async run() {
    const server = http.createServer();
    const stdioTransport = new StdioServerTransport();
    await this.server.connect(stdioTransport);

    server.on('request', (req, res) => {
      if (req.url === '/message') {
        const sseTransport = new SSEServerTransport(req.url, res);
        this.server.connect(sseTransport);
      }
    });

    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      console.error(`Ollama MCP server running on stdio and SSE (http://localhost:${address.port})`);
    });
  }
}

const server = new OllamaServer();
server.run().catch(console.error);
