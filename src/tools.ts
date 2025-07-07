export const tools = [
  {
    name: 'serve',
    description: 'Start Ollama server',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'create',
    description: 'Create a model from a Modelfile',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the model',
        },
        modelfile: {
          type: 'string',
          description: 'Path to Modelfile',
        },
      },
      required: ['name', 'modelfile'],
      additionalProperties: false,
    },
  },
  {
    name: 'show',
    description: 'Show information for a model',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'run',
    description: 'Run a model',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model',
        },
        prompt: {
          type: 'string',
          description: 'Prompt to send to the model',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000)',
          minimum: 1000,
        },
      },
      required: ['name', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'pull',
    description: 'Pull a model from a registry',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model to pull',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'push',
    description: 'Push a model to a registry',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model to push',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_models',
    description: 'List available Ollama models with their details.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_model_info',
    description: 'Show detailed information for a specific Ollama model.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'cp',
    description: 'Copy a model',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source model name',
        },
        destination: {
          type: 'string',
          description: 'Destination model name',
        },
      },
      required: ['source', 'destination'],
      additionalProperties: false,
    },
  },
  {
    name: 'rm',
    description: 'Remove a model',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the model to remove',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'chat_completion',
    description: 'OpenAI-compatible chat completion API',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Name of the Ollama model to use',
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['system', 'user', 'assistant'],
              },
              content: {
                type: 'string',
              },
            },
            required: ['role', 'content'],
          },
          description: 'Array of messages in the conversation',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0-2)',
          minimum: 0,
          maximum: 2,
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000)',
          minimum: 1000,
        },
      },
      required: ['model', 'messages'],
      additionalProperties: false,
    },
  },
] as const;
