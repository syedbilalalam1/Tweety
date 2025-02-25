import { Controller, Get } from '@nestjs/common';
import { ManageTweetService } from '../manage-tweet/manage-tweet.service';
import { TwitterTrendsService } from '../api-integrations/twitter-trends.service';

@Controller('api')
export class ApiController {
  constructor(
    private readonly manageTweetService: ManageTweetService,
    private readonly twitterTrendsService: TwitterTrendsService
  ) {}

  @Get('tweet-history')
  getTweetHistory() {
    return this.manageTweetService.getTweetHistory();
  }

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
} 