import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { OpenAiRequestDto } from './dto/openai-request.dto';
import { EnvConfigService } from '../envConfig/envConfig.service';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly envConfigService: EnvConfigService) {}

  private getConfigValue(key: string, defaultValue: string): string {
    try {
      return this.envConfigService.getString(key);
    } catch {
      return defaultValue;
    }
  }

  private cleanGeneratedContent(content: string): string {
    return content
      .replace(/^\d+\.\s*["']?|["']$/g, '') // Remove numbered list markers and quotes
      .replace(/[""]/g, '"') // Normalize quotes
      .replace(/🔒|🛡️/g, '') // Remove emojis
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/^(Tweet:|Content:)\s*/i, '') // Remove "Tweet:" or "Content:" prefixes
      .trim();
  }

  async generateResponse(data: OpenAiRequestDto): Promise<string> {
    try {
      this.logger.log(`Generating response for topic: ${data.topic}`);
      
      const enhancedPrompt = `${data.prompt}\n\nIMPORTANT RULES:
1. The tweet text MUST be under 250 characters (not including code blocks).
2. For code tweets, provide a single, complete, and concise code example.
3. Do not include hashtags or emojis.
4. Keep the explanation clear and focused.
5. Format code with proper language tags in markdown.`;
      
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'qwen/qwen2.5-vl-72b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `You're a ${data.userProfession} with many years of experience and this is your twitter profile. Generate concise, informative tweets under 250 characters. If code is requested, provide a single code snippet in a markdown code block with the appropriate language tag.`,
            },
            { role: 'user', content: enhancedPrompt },
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.envConfigService.getString('OPENROUTER_API_KEY')}`,
            'HTTP-Referer': this.getConfigValue('SITE_URL', 'https://your-site.com'),
            'X-Title': this.getConfigValue('SITE_NAME', 'AI Twitter Bot'),
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log('OpenRouter response received');
      this.logger.debug('Full response:', JSON.stringify(response.data, null, 2));

      if (!response.data?.choices?.[0]?.message?.content) {
        this.logger.error('Invalid response structure:', response.data);
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = this.cleanGeneratedContent(response.data.choices[0].message.content);
      
      if (!content) {
        throw new Error('Empty content received from OpenRouter');
      }

      this.logger.log(`Generated content length: ${content.length}`);
      this.logger.debug('Generated content:', content);
      
      return content;
    } catch (error) {
      this.logger.error('Error generating response from OpenRouter:', error.response?.data || error.message);
      
      if (error.response?.data) {
        this.logger.debug('Full error response:', JSON.stringify(error.response.data, null, 2));
      }

      let errorMessage = 'OpenRouter API error: ';
      if (error.response?.data?.error?.message) {
        errorMessage += error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }

      throw new Error(errorMessage);
    }
  }
}
