import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { EnvConfigService } from '../envConfig/envConfig.service';
import { SYSTEM_PROMPT, TREND_ANALYSIS_PROMPT } from '../../constants/openai-prompts.constant';

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly envConfigService: EnvConfigService) {
    this.validateApiKey();
  }

  private validateApiKey() {
    const apiKey = this.envConfigService.getString('OPENROUTER_API_KEY');
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenRouter API key format');
    }
    this.logger.log('OpenRouter Service initialized with valid API key format');
    this.testConnection();
  }

  private async testConnection() {
    try {
      const response = await this.generateContent({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: 'Generate a short test response.',
        maxTokens: 50
      });
      this.logger.log('OpenRouter API connection test successful');
    } catch (error) {
      this.logger.error('OpenRouter API connection test failed:', error.message);
      throw error;
    }
  }

  async generateTrendingContent(trend: string, country: string): Promise<string> {
    try {
      this.logger.log(`Generating trending content for ${trend} (${country})`);
      
      const content = await this.generateContent({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: TREND_ANALYSIS_PROMPT(trend, country),
        maxTokens: 250
      });

      return content;
    } catch (error) {
      this.logger.error(`Failed to generate trending content for ${trend}:`, error.message);
      throw error;
    }
  }

  private async generateContent({ 
    systemPrompt, 
    userPrompt, 
    maxTokens = 250 
  }: { 
    systemPrompt: string; 
    userPrompt: string; 
    maxTokens?: number;
  }): Promise<string> {
    try {
      this.logger.debug('Generating content with prompts:', {
        systemPrompt,
        userPrompt
      });

      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: maxTokens,
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

      if (!response.data?.choices?.[0]?.message?.content) {
        this.logger.error('Invalid response structure:', response.data);
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = response.data.choices[0].message.content.trim();
      
      if (!content) {
        throw new Error('Empty content received from OpenRouter');
      }

      this.logger.debug('Generated content:', content);
      return content;

    } catch (error) {
      this.logger.error('Error generating content:', error.response?.data || error.message);
      
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

  private getConfigValue(key: string, defaultValue: string): string {
    try {
      return this.envConfigService.getString(key);
    } catch {
      return defaultValue;
    }
  }
} 