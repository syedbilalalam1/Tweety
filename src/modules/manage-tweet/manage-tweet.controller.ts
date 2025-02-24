import { Controller, Get, Post, Body } from '@nestjs/common';
import { ManageTweetService } from './manage-tweet.service';
import { TwitterTrendsService } from '../api-integrations/twitter-trends.service';

@Controller('api')
export class ManageTweetController {
  constructor(
    private readonly manageTweetService: ManageTweetService,
    private readonly twitterTrendsService: TwitterTrendsService,
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
}
