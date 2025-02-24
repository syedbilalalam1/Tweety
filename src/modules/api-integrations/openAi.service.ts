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

  async generateResponse(data: OpenAiRequestDto): Promise<string> {
    try {
      this.logger.log(`Generating response for topic: ${data.topic}`);
      
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'qwen/qwen2.5-vl-72b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `You're a ${data.userProfession} with many years of experience and this is your twitter profile. Generate concise, informative tweets under 250 characters.`,
            },
            { role: 'user', content: data.prompt },
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 250,
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
        },
      );

      this.logger.log('OpenRouter response received');
      const content = response.data.choices?.[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('No content generated from OpenRouter');
      }

      this.logger.log(`Generated content length: ${content.length}`);
      return content;
    } catch (error) {
      this.logger.error('Error generating response from OpenRouter:', error.response?.data || error.message);
      if (error.response?.data) {
        this.logger.debug('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(error.response?.data?.error || error.message);
    }
  }
}
