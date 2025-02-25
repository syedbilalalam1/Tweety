import { Controller, Get, Post, Body } from '@nestjs/common';
import { ManageTweetService } from './manage-tweet.service';
import { TwitterTrendsService } from '../api-integrations/twitter-trends.service';
import { TwitterApiService } from '../api-integrations/twitter-api.service';

@Controller('api')
export class ManageTweetController {
  constructor(
    private readonly manageTweetService: ManageTweetService,
    private readonly twitterTrendsService: TwitterTrendsService,
    private readonly twitterApiService: TwitterApiService,
  ) {}

  @Get('trends')
  async getCurrentTrends() {
    try {
      const trends = await this.twitterTrendsService.getAllCurrentTrends();
      return trends;
    } catch (error) {
      return {
        error: 'Failed to fetch trends',
        message: error.message
      };
    }
  }

  @Post('generate/trend')
  async generateTrendingTweet() {
    return this.manageTweetService.generateManualTweet('trend');
  }

  @Post('generate/random')
  async generateRandomTweet() {
    try {
      return await this.manageTweetService.generateManualTweet('random');
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to generate random tweet'
      };
    }
  }

  @Get('test-twitter')
  async testTwitterCredentials() {
    try {
      return await this.twitterApiService.testCredentials();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
