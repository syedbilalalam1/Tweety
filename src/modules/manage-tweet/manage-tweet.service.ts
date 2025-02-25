import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { TwitterApiService } from '../api-integrations/twitter-api.service';
import {
  textAndSnippetTopicPrompts,
  textOnlyTopicPrompts,
} from '../../constants/topic-prompts.constant';
import { extractCodeSnippetData, getRandomItem } from '../../commons/utils';
import { OpenAiService } from '../api-integrations/openAi.service';
import { EnvConfigService } from '../envConfig/envConfig.service';
import CodeSnap from 'codesnap';
import { OpenRouterService } from '../api-integrations/openrouter.service';
import { TwitterTrendsService } from '../api-integrations/twitter-trends.service';
import { SYSTEM_PROMPT, TREND_ANALYSIS_PROMPT } from '../../constants/openai-prompts.constant';

const MAX_HISTORY_SIZE = 100; // Keep last 100 tweets in history
const MIN_TWEET_INTERVAL = 45 * 60 * 1000; // 45 minutes in milliseconds

@Injectable()
export class ManageTweetService implements OnModuleInit {
  private readonly logger = new Logger(ManageTweetService.name);
  private tweetHistory: Array<{
    timestamp: Date;
    content: string;
    type: 'text' | 'code' | 'trend';
    status: 'success' | 'failed';
    error?: string;
    country?: string;
    hashtag?: string;
    tweetId?: string;
  }> = [];

  private lastCodeTweetTime: Date | null = null;
  private lastTopicTweetTime: Date | null = null;
  private countryLastTweetTimes: Map<string, Date> = new Map();
  private isInitialTweetScheduled = false;
  private lastTweetTime: Date | null = null;
  private isGeneratingTweet = false;
  private nextScheduledTweetTime: Date | null = null;
  
  // Add shared state for random tweets
  private randomTweetSchedule: Array<{
    time: number;
    posted: boolean;
    scheduledTime: string;
  }> = [];
  private currentCountryIndex = 0;
  private startTime: number | null = null;

  constructor(
    private readonly twitterApiService: TwitterApiService,
    private readonly openAiService: OpenAiService,
    private readonly envConfigService: EnvConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly openRouterService: OpenRouterService,
    private readonly twitterTrendsService: TwitterTrendsService,
  ) {}

  // Add methods to manage shared state
  getRandomTweetSchedule() {
    return this.randomTweetSchedule;
  }

  getCurrentCountryIndex() {
    return this.currentCountryIndex;
  }

  setCurrentCountryIndex(index: number) {
    this.currentCountryIndex = index;
  }

  getStartTime() {
    return this.startTime;
  }

  setStartTime(time: number) {
    this.startTime = time;
    this.currentCountryIndex = 0;
  }

  private initializeRandomSchedule() {
    const now = new Date();
    const schedule = [];
    const usedHours = new Set<number>();
    
    // Generate 6 random times within the next 24 hours
    for (let i = 0; i < 6; i++) {
      let hour: number;
      do {
        hour = Math.floor(Math.random() * 24);
      } while (usedHours.has(hour) || 
              Array.from(usedHours).some((h: number) => Math.abs(h - hour) < 2));
      
      usedHours.add(hour);
      
      const time = new Date(now);
      time.setHours(hour);
      time.setMinutes(Math.floor(Math.random() * 60));
      time.setSeconds(0);
      time.setMilliseconds(0);
      
      if (time < now) {
        time.setDate(time.getDate() + 1);
      }
      
      schedule.push({
        time: time.getTime(),
        posted: false,
        scheduledTime: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    
    this.randomTweetSchedule = schedule.sort((a, b) => a.time - b.time);
    return this.randomTweetSchedule;
  }

  // Add method to check and update random tweet schedule
  private checkAndUpdateRandomSchedule() {
    const now = Date.now();
    let needsNewSchedule = false;

    // Check if all tweets are posted or schedule is empty
    if (!this.randomTweetSchedule.length || this.randomTweetSchedule.every(tweet => tweet.posted)) {
      needsNewSchedule = true;
    } else {
      // Check if the schedule is from a previous day
      const oldestScheduledTime = Math.min(...this.randomTweetSchedule.map(t => t.time));
      const timePassedHours = (now - oldestScheduledTime) / (1000 * 60 * 60);
      if (timePassedHours > 24) {
        needsNewSchedule = true;
      }
    }

    if (needsNewSchedule) {
      this.initializeRandomSchedule();
    }

    return this.randomTweetSchedule;
  }

  private addToHistory(tweet: {
    content: string;
    type: 'text' | 'code' | 'trend';
    status: 'success' | 'failed';
    error?: string;
    country?: string;
    hashtag?: string;
    tweetId?: string;
  }) {
    this.tweetHistory.unshift({
      timestamp: new Date(),
      ...tweet
    });

    if (this.tweetHistory.length > MAX_HISTORY_SIZE) {
      this.tweetHistory = this.tweetHistory.slice(0, MAX_HISTORY_SIZE);
    }
  }

  async onModuleInit() {
    this.logger.log('Tweet Management Service initialized');
    this.logger.log('Trending tweets scheduled: Sequential hourly posts');
    this.logger.log('Code/Topic tweets scheduled: Random times throughout the day');
    
    // Initialize random tweet schedule
    this.initializeRandomSchedule();
    
    if (!this.isInitialTweetScheduled) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const delay = nextHour.getTime() - now.getTime();
      
      this.logger.log(`Scheduling initial trending tweet in ${Math.floor(delay/1000/60)} minutes`);
      
      // Set the initial state
      this.isInitialTweetScheduled = true;
      this.startTime = nextHour.getTime();
      this.currentCountryIndex = 0;
      
      setTimeout(async () => {
        this.logger.log('Executing initial trending tweet...');
        try {
          await this.createTrendingTweet();
        } catch (error) {
          this.logger.error('Failed to generate initial trending tweet:', error.message);
        }
      }, delay);
    }

    // Start checking random tweet schedule
    setInterval(() => this.checkAndUpdateRandomSchedule(), 60000); // Check every minute
  }

  getTweetHistory() {
    return this.tweetHistory;
  }

  async createTweet() {
    this.logger.log('Starting text-only tweet generation...');

    try {
    const topic = getRandomItem(textOnlyTopicPrompts);
      this.logger.log(`Selected topic: ${topic.topic}`);

    const generatedContent = await this.openAiService.generateResponse(topic);
      this.logger.log(`Generated content length: ${generatedContent.length}`);
      this.logger.log(`Generated content: ${generatedContent}`);

      // Truncate content to fit Twitter's limit
      const truncatedContent = generatedContent.length > 280 
        ? generatedContent.substring(0, 277) + '...'
        : generatedContent;

    if (
      !this.envConfigService.getBoolean('USER_ON_TWITTER_PREMIUM') &&
        truncatedContent.length > 280
      ) {
        const error = "Content Text Longer Than Twitter's Limit";
        this.logger.error(error);
        this.addToHistory({
          content: truncatedContent,
          type: 'text',
          status: 'failed',
          error,
        });
        return { success: false, message: error };
    }

    const tweetResponse = await this.twitterApiService.createTweet({
        text: truncatedContent,
      });
      this.logger.log(`Tweet posted successfully: ${JSON.stringify(tweetResponse)}`);

      this.addToHistory({
        content: truncatedContent,
        type: 'text',
        status: 'success',
        tweetId: tweetResponse.data.id
      });

      this.updateLastTweetTime();
      return { success: true, message: 'Text tweet posted successfully' };
    } catch (error) {
      this.logger.error(`Failed to create tweet: ${error.message}`);
      this.addToHistory({
        content: error.message,
        type: 'text',
        status: 'failed',
        error: error.message,
      });
      return { success: false, message: error.message };
    }
  }

  async createTweetWithImage() {
    this.logger.log('Starting tweet with image generation...');

    try {
    const topic = getRandomItem(textAndSnippetTopicPrompts);
      this.logger.log(`Selected topic: ${topic.topic}`);

    const generatedContent = await this.openAiService.generateResponse(topic);
      this.logger.log(`Generated content: ${generatedContent}`);

    const contentText = generatedContent.split('```')[0].trim();
    const snippets = extractCodeSnippetData(generatedContent);

      // Truncate content to fit Twitter's limit
      const truncatedContent = contentText.length > 280 
        ? contentText.substring(0, 277) + '...'
        : contentText;

    if (
      !this.envConfigService.getBoolean('USER_ON_TWITTER_PREMIUM') &&
        truncatedContent.length > 280
      ) {
        const error = "Content Text Longer Than Twitter's Limit";
        this.logger.error(error);
        this.addToHistory({
          content: truncatedContent,
          type: 'code',
          status: 'failed',
          error,
        });
        return { success: false, message: error };
    }

    if (snippets.length > 0) {
        this.logger.log(`Code snippets found: ${snippets.length}`);
        
      const codeSnap = new CodeSnap({
        theme: 'Monokai',
        backgroundColor: 'Cyan',
        numberLines: true,
      });

      await codeSnap.snap(snippets[0]);
        this.logger.log('Code snapshot generated');

        const mediaId = await this.twitterApiService.uploadMedia('codeSnapshot.png');
        this.logger.log(`Media uploaded with ID: ${mediaId}`);

      const tweetResponse = await this.twitterApiService.createTweet({
          text: truncatedContent,
        media: { media_ids: [mediaId] as [string] },
        });
        this.logger.log(`Tweet with image posted successfully: ${JSON.stringify(tweetResponse)}`);

        this.addToHistory({
          content: `${truncatedContent}\n\nCode:\n${snippets[0]}`,
          type: 'code',
          status: 'success',
          tweetId: tweetResponse.data.id
        });

        this.updateLastTweetTime();
        return { success: true, message: 'Code tweet posted successfully' };
      }

      return { success: false, message: 'No code snippets found in generated content' };
    } catch (error) {
      this.logger.error(`Failed to create tweet with image: ${error.message}`);
      this.addToHistory({
        content: error.message,
        type: 'code',
        status: 'failed',
        error: error.message,
      });
      return { success: false, message: error.message };
    }
  }

  private canTweetNow(): boolean {
    if (this.isGeneratingTweet) {
      this.logger.log('Tweet generation already in progress');
      return false;
    }

    if (!this.lastTweetTime) {
      // If this is the first tweet after reset, check if we've reached the scheduled time
      if (this.nextScheduledTweetTime) {
        const now = new Date();
        if (now < this.nextScheduledTweetTime) {
          const waitTime = Math.ceil((this.nextScheduledTweetTime.getTime() - now.getTime()) / 1000);
          this.logger.log(`Waiting for scheduled time. ${waitTime} seconds remaining`);
          return false;
        }
      }
      return true;
    }
    
    const now = new Date();
    const timeSinceLastTweet = now.getTime() - this.lastTweetTime.getTime();
    const canTweet = timeSinceLastTweet >= MIN_TWEET_INTERVAL;
    
    if (!canTweet) {
      const waitTime = Math.ceil((MIN_TWEET_INTERVAL - timeSinceLastTweet) / 1000);
      this.logger.log(`Must wait ${waitTime} seconds before next tweet`);
    }
    
    return canTweet;
  }

  private updateLastTweetTime() {
    this.lastTweetTime = new Date();
    // Clear the next scheduled time since we've posted
    this.nextScheduledTweetTime = null;
  }

  // Method for manual tweet generation from dashboard
  async generateManualTweet(type: 'trend' | 'random'): Promise<{ success: boolean; message: string }> {
    if (!this.canTweetNow()) {
      throw new Error('Please wait before generating another tweet');
    }

    this.isGeneratingTweet = true;
    try {
      if (type === 'trend') {
        const countryData = await this.twitterTrendsService.getNextCountryTrend();
        
        this.logger.log(`Generating tweet for trend: ${countryData.trend} (${countryData.country})`);
        
        let content = await this.openRouterService.generateTrendingContent(
          countryData.trend,
          countryData.country
        );

        const tweetWithHashtag = `${content}\n\n${countryData.hashtag}`;
        
        try {
          const tweetResponse = await this.twitterApiService.createTweet({
            text: tweetWithHashtag
          });

          this.updateLastTweetTime();
          this.countryLastTweetTimes.set(countryData.country, new Date());

          this.addToHistory({
            content: tweetWithHashtag,
            type: 'trend',
            status: 'success',
            country: countryData.country,
            hashtag: countryData.hashtag,
            tweetId: tweetResponse.data.id
          });

          return { success: true, message: `Tweet posted for ${countryData.country}` };
        } catch (error) {
          this.logger.error(`Failed to post tweet for ${countryData.country}:`, error);
          
          this.addToHistory({
            content: tweetWithHashtag,
            type: 'trend',
            status: 'failed',
            country: countryData.country,
            hashtag: countryData.hashtag,
            error: error.message
          });

          throw error;
        }
      } else if (type === 'random') {
        // Randomly choose between code and text tweet
        const tweetType = Math.random() > 0.5 ? 'code' : 'text';
        
        if (tweetType === 'code') {
          return await this.createTweetWithImage();
        } else {
          return await this.createTweet();
        }
      }

      throw new Error('Invalid tweet type');
    } catch (error) {
      this.logger.error('Failed to generate tweet:', error);
      return { success: false, message: error.message };
    } finally {
      this.isGeneratingTweet = false;
    }
  }

  @Cron('0 * * * *') // Every hour
  async createTrendingTweet() {
    if (!this.canTweetNow()) {
      this.logger.log('Skipping tweet - too soon since last tweet');
      return;
    }

    this.isGeneratingTweet = true;
    try {
      const countryData = await this.twitterTrendsService.getNextCountryTrend();
      
      const now = new Date();
      const lastTweetTime = this.countryLastTweetTimes.get(countryData.country);
      
      if (lastTweetTime) {
        const timeSinceLastTweet = now.getTime() - lastTweetTime.getTime();
        if (timeSinceLastTweet < MIN_TWEET_INTERVAL) {
          this.logger.log(`Skipping tweet for ${countryData.country} - too soon since last tweet`);
          return;
        }
      }

      let content = await this.openRouterService.generateTrendingContent(
        countryData.trend,
        countryData.country
      );

      const tweetWithHashtag = `${content}\n\n${countryData.hashtag}`;
      
      try {
        const tweetResponse = await this.twitterApiService.createTweet({
          text: tweetWithHashtag
        });

        this.updateLastTweetTime();
        this.countryLastTweetTimes.set(countryData.country, new Date());

        this.addToHistory({
          content: tweetWithHashtag,
          type: 'trend',
          status: 'success',
          country: countryData.country,
          hashtag: countryData.hashtag,
          tweetId: tweetResponse.data.id
        });
      } catch (error) {
        this.logger.error(`Failed to post tweet for ${countryData.country}:`, error);
        
        this.addToHistory({
          content: tweetWithHashtag,
          type: 'trend',
          status: 'failed',
          country: countryData.country,
          hashtag: countryData.hashtag,
          error: error.message
        });

        // Even if posting fails, we still want to move to the next country and update timers
        this.updateLastTweetTime();
        this.countryLastTweetTimes.set(countryData.country, new Date());
        
        // If it's a rate limit error, add extra delay
        if (error.code === 429 || (error.data?.errors && error.data.errors.some(e => e.code === 88))) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }
    } catch (error) {
      this.logger.error('Failed to create trending tweet:', error);
      this.addToHistory({
        content: error.message,
        type: 'trend',
        status: 'failed',
        error: error.message
      });
      
      // Ensure we still update the last tweet time to maintain sequence
      this.updateLastTweetTime();
    } finally {
      this.isGeneratingTweet = false;
    }
  }

  // Add reset method
  async resetSequence() {
    try {
      this.logger.log('Resetting tweet sequence');
      
      // Reset all timers and state
      this.lastTweetTime = null;
      this.lastCodeTweetTime = null;
      this.lastTopicTweetTime = null;
      this.countryLastTweetTimes.clear();
      this.isGeneratingTweet = false;
      
      // Clear any existing scheduled tasks
      try {
        const job = this.schedulerRegistry.getCronJob('trendingTweet');
        if (job) {
          job.stop();
          this.logger.log('Stopped existing cron job');
        }
      } catch (e) {
        this.logger.warn('No existing cron job found to stop');
      }
      
      // Reset the trends service
      await this.twitterTrendsService.resetSequence();
      
      // Schedule next tweet in 1 hour
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      this.nextScheduledTweetTime = nextHour;
      
      const delay = nextHour.getTime() - now.getTime();
      this.logger.log(`Reset complete. Next tweet scheduled in ${Math.floor(delay/1000/60)} minutes`);
      
      // Schedule the first tweet after reset
      const timeoutId = setTimeout(async () => {
        this.logger.log('Executing first tweet after reset...');
        try {
          await this.createTrendingTweet();
        } catch (error) {
          this.logger.error('Failed to generate first tweet after reset:', error.message);
        }
      }, delay);

      // Store the timeout ID so we can clear it if needed
      this.schedulerRegistry.addTimeout('firstTweetAfterReset', timeoutId);

      return {
        success: true,
        message: `Sequence reset. Next tweet scheduled for ${nextHour.toLocaleTimeString()}`,
        nextTweetTime: nextHour.toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to reset sequence:', error);
      throw new Error('Failed to reset sequence: ' + error.message);
    }
  }
}
