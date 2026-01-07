import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const GPT_MODELS: Record<string, string> = {
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
}

const CLAUDE_MODELS: Record<string, string> = {
  "claude-4.5-sonnet": "claude-sonnet-4-5",
  "claude-4.5-haiku": "claude-haiku-4-5",
  "claude-4.5-opus": "claude-opus-4-5",
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}


export async function callLLM(message : string | any[], model: string, response_format?: any): Promise<LLMResponse> {
  try {
    if (model in GPT_MODELS) {
      const gpt = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      let input = {
        model: GPT_MODELS[model],
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }

      if (response_format) {
        input.response_format = response_format;
      }

      const response = await gpt.chat.completions.create(input);
      return {
        success: true,
        content: response.choices[0].message.content || undefined,
      };
    } else if (model in CLAUDE_MODELS) {
      const claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await claude.messages.create({
        model: CLAUDE_MODELS[model],
        max_tokens: 5000,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });
      const firstBlock = response.content[0];
      const textContent = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
      return {
        success: true,
        content: textContent || '',
      };
    } else {
      throw new Error(`Model ${model} not supported`);
    }
  } catch (error: any) {
    console.error('LLM API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to call LLM API',
    };
  }
}

