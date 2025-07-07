import axios, { AxiosInstance } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_TIMEOUT = 60000; // 60 seconds

// Helper function to format error messages
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaTag {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaShow {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: OLLAMA_HOST,
      timeout: DEFAULT_TIMEOUT,
    });
  }

  private handleError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      // Case 1: The request was made but no response was received (e.g. network error)
      if (error.request && !error.response) {
        let message = `Network error during '${context}': Could not connect to Ollama at ${OLLAMA_HOST}.`;
        if (error.code === 'ECONNREFUSED') {
          message = `Connection refused for '${context}'. Is the Ollama server running at ${OLLAMA_HOST}?`;
        } else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
          message = `Request to Ollama timed out during '${context}'. The server may be busy or the timeout is too short.`;
        }
        // This is an internal error from the MCP server's perspective, as it cannot reach a dependency.
        throw new McpError(ErrorCode.InternalError, message);
      }
      // Case 2: The request was made and the server responded with an error status code
      else if (error.response) {
        const status = error.response.status;
        const apiError = error.response.data?.error || `received HTTP status ${status}`;

        // 404 is often "model not found", which is an invalid parameter from the client's perspective.
        // Other 4xx errors are also likely client-side problems with the request.
        if (status >= 400 && status < 500) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid request for '${context}': ${apiError}`
          );
        }

        // 5xx errors are server-side problems within Ollama itself.
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama server error during '${context}': ${apiError}`
        );
      }
    }
    // Case 3: A non-axios error or some other unexpected issue.
    throw new McpError(
      ErrorCode.InternalError,
      `Unexpected error in '${context}': ${formatError(error)}`
    );
  }

  private async apiCallWrapper<T>(
    context: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context);
    }
  }

  async listModels(): Promise<OllamaTag[]> {
    return this.apiCallWrapper('listModels', async () => {
      const response = await this.client.get('/api/tags');
      return response.data.models;
    });
  }

  async getModelInfo(name: string): Promise<OllamaShow> {
    return this.apiCallWrapper('getModelInfo', async () => {
      const response = await this.client.post('/api/show', { name });
      return response.data;
    });
  }

  async create(name: string, modelfile: string): Promise<NodeJS.ReadableStream> {
    return this.apiCallWrapper('create', async () => {
      const response = await this.client.post(
        '/api/create',
        { name, modelfile, stream: true },
        { responseType: 'stream' }
      );
      return response.data;
    });
  }

  async pull(name: string): Promise<NodeJS.ReadableStream> {
    return this.apiCallWrapper('pull', async () => {
      const response = await this.client.post(
        '/api/pull',
        { name, stream: true },
        { responseType: 'stream' }
      );
      return response.data;
    });
  }

  async push(name: string): Promise<NodeJS.ReadableStream> {
    return this.apiCallWrapper('push', async () => {
      const response = await this.client.post(
        '/api/push',
        { name, stream: true },
        { responseType: 'stream' }
      );
      return response.data;
    });
  }

  async copy(source: string, destination: string): Promise<void> {
    return this.apiCallWrapper('copy', () => this.client.post('/api/copy', { source, destination }));
  }

  async remove(name: string): Promise<void> {
    return this.apiCallWrapper('remove', () => this.client.delete('/api/delete', { data: { name } }));
  }

  async generate(
    model: string,
    prompt: string,
    timeout?: number
  ): Promise<NodeJS.ReadableStream> {
    return this.apiCallWrapper('generate', async () => {
      const response = await this.client.post(
        '/api/generate',
        { model, prompt, stream: true },
        { responseType: 'stream', timeout: timeout || DEFAULT_TIMEOUT }
      );
      return response.data;
    });
  }

  async chat(
    model: string,
    messages: OllamaChatMessage[],
    temperature?: number,
    timeout?: number
  ): Promise<NodeJS.ReadableStream> {
    return this.apiCallWrapper('chat', async () => {
      const response = await this.client.post(
        '/api/chat',
        { model, messages, stream: true, options: { temperature } },
        { responseType: 'stream', timeout: timeout || DEFAULT_TIMEOUT }
      );
      return response.data;
    });
  }
}
