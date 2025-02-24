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

  constructor(
    private readonly twitterApiService: TwitterApiService,
    private readonly openAiService: OpenAiService,
    private readonly envConfigService: EnvConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly openRouterService: OpenRouterService,
    private readonly twitterTrendsService: TwitterTrendsService,
  ) {}

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

    // Keep history size manageable
    if (this.tweetHistory.length > MAX_HISTORY_SIZE) {
      this.tweetHistory = this.tweetHistory.slice(0, MAX_HISTORY_SIZE);
    }
  }

  async onModuleInit() {
    this.logger.log('Tweet Management Service initialized');
    this.logger.log('Trending tweets scheduled: Sequential hourly posts');
    this.logger.log('Code/Topic tweets scheduled: Random times throughout the day');
    
    if (!this.isInitialTweetScheduled) {
      // Schedule initial trend tweet at the next hour mark
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const delay = nextHour.getTime() - now.getTime();
      
      this.logger.log(`Scheduling initial trending tweet in ${Math.floor(delay/1000/60)} minutes`);
      
      this.isInitialTweetScheduled = true;
      setTimeout(async () => {
        this.logger.log('Executing initial trending tweet...');
        try {
          await this.createTrendingTweet();
        } catch (error) {
          this.logger.error('Failed to generate initial trending tweet:', error.message);
        }
      }, delay);
    }

    // Schedule random code/topic tweets
    this.scheduleRandomTweets();
  }

  private scheduleRandomTweets() {
    // Schedule exactly 6 tweets for the next 24 hours
    const numTweets = 6;
    const dayInMs = 24 * 60 * 60 * 1000;
    const minGapBetweenTweets = 2 * 60 * 60 * 1000; // Minimum 2 hours between tweets
    
    // Track scheduled times to ensure proper spacing
    const scheduledTimes = [];
    
    for (let i = 0; i < numTweets; i++) {
      let randomTime;
      let isValidTime;
      
      // Keep trying until we find a valid time slot
      do {
        randomTime = Math.random() * dayInMs;
        isValidTime = true;
        
        // Check if this time is too close to trending tweet times (hour marks)
        const minutes = new Date(randomTime).getMinutes();
        if (minutes >= 55 || minutes <= 5) {
          isValidTime = false;
          continue;
        }
        
        // Check if this time is too close to other scheduled tweets
        for (const existingTime of scheduledTimes) {
          const timeDiff = Math.abs(existingTime - randomTime);
          if (timeDiff < minGapBetweenTweets) {
            isValidTime = false;
            break;
          }
        }
      } while (!isValidTime);
      
      scheduledTimes.push(randomTime);
      
      // Schedule the tweet
      setTimeout(() => {
        const tweetType = Math.random() > 0.5 ? 'code' : 'text';
        this.logger.log(`Executing scheduled ${tweetType} tweet`);
        
        if (tweetType === 'code') {
          this.createTweetWithImage();
        } else {
          this.createTweet();
        }
        
        // Schedule next day's tweets when the last one runs
        if (i === numTweets - 1) {
          this.scheduleRandomTweets();
        }
      }, randomTime);

      const timeInHours = Math.floor(randomTime / 1000 / 60 / 60);
      const timeInMinutes = Math.floor((randomTime / 1000 / 60) % 60);
      this.logger.log(
        `Scheduled ${Math.random() > 0.5 ? 'code' : 'text'} tweet for ${timeInHours}:${String(timeInMinutes).padStart(2, '0')}`
      );
    }

    // Sort scheduled times for logging
    scheduledTimes.sort((a, b) => a - b);
    this.logger.log('Random tweet schedule for next 24 hours:');
    scheduledTimes.forEach(time => {
      const hours = Math.floor(time / 1000 / 60 / 60);
      const minutes = Math.floor((time / 1000 / 60) % 60);
      this.logger.log(`- ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    });
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

      if (
        !this.envConfigService.getBoolean('USER_ON_TWITTER_PREMIUM') &&
        generatedContent.length > 275
      ) {
        const error = "Content Text Longer Than User's Limit";
        this.logger.error(error);
        this.addToHistory({
          content: generatedContent,
          type: 'text',
          status: 'failed',
          error,
        });
        return;
      }

      const tweetResponse = await this.twitterApiService.createTweet({
        text: generatedContent,
      });
      this.logger.log(`Tweet posted successfully: ${JSON.stringify(tweetResponse)}`);

      this.addToHistory({
        content: generatedContent,
        type: 'text',
        status: 'success',
        tweetId: tweetResponse.data.id
      });
    } catch (error) {
      this.logger.error(`Failed to create tweet: ${error.message}`);
      this.addToHistory({
        content: error.message,
        type: 'text',
        status: 'failed',
        error: error.message,
      });
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

      if (
        !this.envConfigService.getBoolean('USER_ON_TWITTER_PREMIUM') &&
        contentText.length > 275
      ) {
        const error = "Content Text Longer Than User's Limit";
        this.logger.error(error);
        this.addToHistory({
          content: contentText,
          type: 'code',
          status: 'failed',
          error,
        });
        return;
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
          text: contentText,
          media: { media_ids: [mediaId] },
        });
        this.logger.log(`Tweet with image posted successfully: ${JSON.stringify(tweetResponse)}`);

        this.addToHistory({
          content: `${contentText}\n\nCode:\n${snippets[0]}`,
          type: 'code',
          status: 'success',
          tweetId: tweetResponse.data.id
        });
      }
    } catch (error) {
      this.logger.error(`Failed to create tweet with image: ${error.message}`);
      this.addToHistory({
        content: error.message,
        type: 'code',
        status: 'failed',
        error: error.message,
      });
    }
  }

  @Cron('0 * * * *') // Every hour
  async createTrendingTweet() {
    try {
      // Get the next country's trending topic
      const countryData = await this.twitterTrendsService.getNextCountryTrend();
      
      // Check if enough time has passed since last tweet for this country
      const now = new Date();
      const lastTweetTime = this.countryLastTweetTimes.get(countryData.country);
      
      if (lastTweetTime) {
        const timeSinceLastTweet = now.getTime() - lastTweetTime.getTime();
        if (timeSinceLastTweet < 45 * 60 * 1000) { // Less than 45 minutes
          this.logger.log(`Skipping tweet for ${countryData.country} as last tweet was too recent (${Math.floor(timeSinceLastTweet/1000/60)} minutes ago)`);
          return;
        }
      }
      
      this.logger.log(`Generating tweet for trend: ${countryData.trend} (${countryData.country})`);

      // Generate tweet content using OpenRouter
      let content = await this.openRouterService.generateTrendingContent(countryData.trend, countryData.country);

      // Append hashtag to the tweet if there's room
      const tweetWithHashtag = `${content}\n\n${countryData.hashtag}`;
      
      // Post the tweet
      let tweetResponse;
      try {
        tweetResponse = await this.twitterApiService.createTweet({
          text: tweetWithHashtag
        });
        
        // Only update last tweet time and move to next country if tweet was successful
        this.countryLastTweetTimes.set(countryData.country, new Date());
        
        // Add to tweet history
        this.addToHistory({
          content: tweetWithHashtag,
          type: 'trend',
          status: 'success',
          country: countryData.country,
          hashtag: countryData.hashtag,
          tweetId: tweetResponse.data.id
        });

        this.logger.log(`Successfully posted trending tweet for ${countryData.country}`);
      } catch (tweetError) {
        // Log the specific tweet posting error
        this.logger.error(`Failed to post tweet for ${countryData.country}:`, tweetError);
        
        this.addToHistory({
          content: tweetWithHashtag,
          type: 'trend',
          status: 'failed',
          country: countryData.country,
          hashtag: countryData.hashtag,
          error: tweetError.message
        });
        
        // Don't throw here - we want to handle the error gracefully
        return;
      }
    } catch (error) {
      this.logger.error('Failed to create trending tweet:', error);
      this.addToHistory({
        content: error.message,
        type: 'trend',
        status: 'failed',
        error: error.message
      });
      
      // Don't throw - handle error gracefully
      return;
    }
  }

  // Method for manual tweet generation from dashboard
  async generateManualTweet(type: 'trend') {
    try {
      const countryData = await this.twitterTrendsService.getNextCountryTrend();
      
      this.logger.log(`Manually generating tweet for trend: ${countryData.trend} (${countryData.country})`);
      
      let content = await this.openRouterService.generateTrendingContent(
        countryData.trend,
        countryData.country
      );

      const tweetWithHashtag = `${content}\n\n${countryData.hashtag}`;
      
      const tweetResponse = await this.twitterApiService.createTweet({
        text: tweetWithHashtag
      });

      this.addToHistory({
        content: tweetWithHashtag,
        type: 'trend',
        status: 'success',
        country: countryData.country,
        hashtag: countryData.hashtag,
        tweetId: tweetResponse.data.id
      });

      return { success: true, message: 'Tweet posted successfully' };
    } catch (error) {
      this.logger.error('Failed to generate manual tweet:', error);
      
      this.addToHistory({
        content: error.message,
        type: 'trend',
        status: 'failed',
        error: error.message
      });
      
      throw new Error(error.message || 'Failed to generate trending tweet');
    }
  }
}
