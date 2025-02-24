import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnvConfigService } from '../envConfig/envConfig.service';
import axios from 'axios';
import { SYSTEM_PROMPT, TREND_ANALYSIS_PROMPT, BACKUP_TREND_PROMPT } from '../../constants/openai-prompts.constant';

@Injectable()
export class OpenRouterService implements OnModuleInit {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(private readonly envConfigService: EnvConfigService) {
    this.apiKey = this.envConfigService.getString('OPENROUTER_API_KEY');
  }

  async onModuleInit() {
    if (!this.apiKey?.startsWith('sk-or-v1-')) {
      this.logger.error('Invalid OpenRouter API key format');
      throw new Error('Invalid OpenRouter API key format');
    }
    this.logger.log('OpenRouter Service initialized with valid API key format');
    
    // Test API connection
    try {
      await this.generateContent(
        'Test system message',
        'Test user message'
      );
      this.logger.log('OpenRouter API connection test successful');
    } catch (error) {
      this.logger.error('Failed to connect to OpenRouter API:', error.message);
      throw error;
    }
  }

  async generateTrendingContent(trend: string, country: string): Promise<string> {
    try {
      // First try with main prompt
      let content = await this.generateContent(
        SYSTEM_PROMPT,
        TREND_ANALYSIS_PROMPT(trend, country)
      );

      // Clean up the content
      content = content
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^(Tweet:|Here's a tweet:|Suggested tweet:|AI:|Assistant:|Response:|Trending in [^:]+:)/i, '') // Remove prefixes
        .replace(/#\w+/g, '') // Remove hashtags
        .replace(/^['"\s]+|['"\s]+$/g, '') // Remove quotes and extra spaces at start/end
        .trim();

      if (this.isValidTweet(content)) {
        return content;
      }

      // If main prompt fails or generates invalid content, try backup prompt
      this.logger.warn('Main prompt failed, trying backup prompt');
      let backupContent = await this.generateContent(
        SYSTEM_PROMPT,
        BACKUP_TREND_PROMPT(trend, country)
      );

      // Clean up the backup content
      backupContent = backupContent
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^(Tweet:|Here's a tweet:|Suggested tweet:|AI:|Assistant:|Response:|Trending in [^:]+:)/i, '') // Remove prefixes
        .replace(/#\w+/g, '') // Remove hashtags
        .replace(/^['"\s]+|['"\s]+$/g, '') // Remove quotes and extra spaces at start/end
        .trim();

      if (this.isValidTweet(backupContent)) {
        return backupContent;
      }

      throw new Error('Failed to generate valid tweet content');
    } catch (error) {
      this.logger.error('Failed to generate trending content:', error.message);
      throw error;
    }
  }

  private isValidTweet(content: string): boolean {
    if (!content || content.length > 280) {
      return false;
    }

    // Clean up the content
    let cleanContent = content
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^(Tweet:|Here's a tweet:|Suggested tweet:|AI:|Assistant:|Response:|Trending in [^:]+:)/i, '') // Remove prefixes
      .replace(/^['"\s]+|['"\s]+$/g, '') // Remove quotes and extra spaces at start/end
      .trim();

    // If the content is still too long after cleaning, reject it
    if (cleanContent.length > 280) {
      return false;
    }

    return true;
  }

  async generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      this.logger.debug('Generating content with prompts:', { systemPrompt, userPrompt });
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 150,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/NinjasHyperr/twtti',
            'X-Title': 'Twitter Bot',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = response.data.choices[0].message.content.trim();
      this.logger.debug('Generated content:', content);
      return content;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logger.error('OpenRouter API authentication failed. Please check your API key.');
        throw new Error('OpenRouter API authentication failed. Please check your API key.');
      }
      
      this.logger.error('Failed to generate content:', {
        error: error.message,
        response: error.response?.data
      });
      
      throw new Error(
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        error.message || 
        'Failed to generate content'
      );
    }
  }
} 