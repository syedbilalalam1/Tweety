import { Controller, Get, Post, Render, Body } from '@nestjs/common';
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

  @Get('state')
  getState() {
    return {
      startTime: this.manageTweetService.getStartTime(),
      currentCountryIndex: this.manageTweetService.getCurrentCountryIndex(),
      randomSchedule: this.manageTweetService.getRandomTweetSchedule()
    };
  }

  @Post('state/start-time')
  setStartTime(@Body() body: { time: number }) {
    this.manageTweetService.setStartTime(body.time);
    return { success: true };
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

  @Post('reset')
  async resetSequence() {
    try {
      await this.manageTweetService.resetSequence();
      return { 
        success: true, 
        message: 'Sequence reset. Next tweet will start in 1 hour.' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Failed to reset sequence' 
      };
    }
  }

  @Get('api/tweet-history')
  getTweetHistory() {
    return this.manageTweetService.getTweetHistory();
  }

  @Post('state/update')
  updateState(@Body() updates: { currentCountryIndex?: number; startTime?: number }) {
    if (updates.currentCountryIndex !== undefined) {
      this.manageTweetService.setCurrentCountryIndex(updates.currentCountryIndex);
    }
    if (updates.startTime !== undefined) {
      this.manageTweetService.setStartTime(updates.startTime);
    }
    return { success: true };
  }
} 