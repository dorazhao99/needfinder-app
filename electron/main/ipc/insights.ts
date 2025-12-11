import { ipcMain } from 'electron';
import Anthropic from '@anthropic-ai/sdk';

ipcMain.handle("get-solutions", async (_, message: string) => {
    try {
      // Dynamic import to avoid issues if package is not installed

      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }

      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      // Extract text content from the response
      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      return {
        success: true,
        content: textContent,
      };
    } catch (error: any) {
      console.error('Anthropic API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to call Anthropic API',
      };
    }
  });