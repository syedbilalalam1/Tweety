import { Controller, Get, Post, Render } from '@nestjs/common';
import { ManageTweetService } from '../manage-tweet/manage-tweet.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly manageTweetService: ManageTweetService) {}

  @Get()
  @Render('dashboard')
  getDashboard() {
    return {
      title: 'Twitter Bot Dashboard',
      tweets: this.manageTweetService.getTweetHistory(),
    };
  }

  @Post('generate/text')
  async generateTextTweet() {
    await this.manageTweetService.createTweet();
    return { success: true };
  }

  @Post('generate/code')
  async generateCodeTweet() {
    await this.manageTweetService.createTweetWithImage();
    return { success: true };
  }

  @Post('generate/trend')
  async generateTrendingTweet() {
    try {
      const result = await this.manageTweetService.generateManualTweet('trend');
      return { success: true, message: result.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Failed to generate trending tweet' 
      };
    }
  }
} 