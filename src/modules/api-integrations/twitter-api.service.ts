import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnvConfigService } from '../envConfig/envConfig.service';
import { TwitterApi, SendTweetV2Params, TweetV2PostTweetResult } from 'twitter-api-v2';

@Injectable()
export class TwitterApiService implements OnModuleInit {
  private readonly logger = new Logger(TwitterApiService.name);
  private readonly twitterClient: TwitterApi;
  private isAuthenticated = false;
  private authenticationPromise: Promise<void> | null = null;
  private lastAuthAttempt = 0;
  private readonly AUTH_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly envConfigService: EnvConfigService) {
    const credentials = {
      appKey: this.envConfigService.getString('TWITTER_API_KEY'),
      appSecret: this.envConfigService.getString('TWITTER_API_SECRET'),
      accessToken: this.envConfigService.getString('TWITTER_ACCESS_TOKEN'),
      accessSecret: this.envConfigService.getString('TWITTER_ACCESS_TOKEN_SECRET'),
    };

    this.logger.log('Initializing Twitter API client with credentials:', {
      appKey: `${credentials.appKey.substring(0, 4)}...`,
      appSecret: `${credentials.appSecret.substring(0, 4)}...`,
      accessToken: `${credentials.accessToken.substring(0, 4)}...`,
      accessSecret: `${credentials.accessSecret.substring(0, 4)}...`,
      appKeyLength: credentials.appKey.length,
      appSecretLength: credentials.appSecret.length,
      accessTokenLength: credentials.accessToken.length,
      accessSecretLength: credentials.accessSecret.length
    });

    this.twitterClient = new TwitterApi(credentials);
  }

  private async authenticate(): Promise<void> {
    const now = Date.now();
    
    // If we're already authenticated and the cache hasn't expired, skip authentication
    if (this.isAuthenticated && (now - this.lastAuthAttempt) < this.AUTH_CACHE_DURATION) {
      this.logger.log('Using cached authentication state');
      return;
    }

    // If there's already an authentication in progress, wait for it
    if (this.authenticationPromise) {
      this.logger.log('Authentication already in progress, waiting...');
      return this.authenticationPromise;
    }

    this.logger.log('Authenticating with Twitter API...');
    
    // Create new authentication promise
    this.authenticationPromise = (async () => {
      try {
        const response = await this.twitterClient.v2.me();
        this.isAuthenticated = true;
        this.lastAuthAttempt = now;
        this.logger.log('Twitter API authentication successful:', {
          username: response.data.username,
          id: response.data.id
        });
      } catch (error: any) {
        this.isAuthenticated = false;
        this.logger.error('Twitter API authentication failed:', {
          message: error.message,
          code: error.code,
          status: error.status,
          rateLimits: error.rateLimit
        });

        // If we hit rate limits, don't throw - just log and continue
        if (error.code === 429 || (error.data?.errors && error.data.errors.some(e => e.code === 88))) {
          this.logger.warn('Rate limit hit during authentication, will retry later');
          return;
        }

        throw error;
      } finally {
        this.authenticationPromise = null;
      }
    })();

    return this.authenticationPromise;
  }

  async onModuleInit() {
    try {
      // Single authentication attempt during initialization
      await this.authenticate();
    } catch (error) {
      // Log error but don't fail initialization
      this.logger.error('Failed to authenticate during initialization:', error.message);
    }
  }

  async createTweet(params: SendTweetV2Params): Promise<TweetV2PostTweetResult> {
    try {
      // Ensure we're authenticated before tweeting
      await this.authenticate();

      this.logger.log('Posting tweet:', { 
        textLength: params.text?.length || 0,
        hasMedia: !!params.media?.media_ids?.length 
      });

      // Input validation
      if (!params.text && !params.media?.media_ids?.length) {
        throw new Error('Tweet must contain either text or media');
      }

      if (params.text && params.text.trim().length === 0) {
        throw new Error('Tweet text cannot be empty');
      }

      // Check tweet length
      if (params.text && params.text.length > 280) {
        throw new Error(`Tweet text is too long (${params.text.length} characters). Maximum allowed is 280 characters.`);
      }

      const tweet = await this.twitterClient.v2.tweet(params);
      this.logger.log('Tweet posted successfully:', { id: tweet.data.id });
      return tweet;
    } catch (error) {
      this.logger.error('Twitter API error:', {
        message: error.message,
        code: error.code,
        data: error.data,
        status: error.status,
        rateLimitInfo: error.rateLimit
      });

      // If we hit rate limits, mark as not authenticated to force re-auth next time
      if (error.code === 429 || (error.data?.errors && error.data.errors.some(e => e.code === 88))) {
        this.isAuthenticated = false;
      }

      throw error;
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    try {
      // Ensure we're authenticated before uploading
      await this.authenticate();

      const mediaId = await this.twitterClient.v1.uploadMedia(filePath);
      this.logger.log('Media uploaded successfully');
      return mediaId;
    } catch (error) {
      this.logger.error('Failed to upload media:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        data: error.data,
        errors: error.errors
      });

      // If we hit rate limits, mark as not authenticated to force re-auth next time
      if (error.code === 429 || (error.data?.errors && error.data.errors.some(e => e.code === 88))) {
        this.isAuthenticated = false;
      }

      throw error;
    }
  }

  async testCredentials() {
    try {
      // Use the authenticate method which handles caching
      await this.authenticate();
      
      return {
        success: true,
        username: 'Authenticated',
        credentials: {
          appKey: this.envConfigService.getString('TWITTER_API_KEY').substring(0, 4) + '...',
          appSecret: this.envConfigService.getString('TWITTER_API_SECRET').substring(0, 4) + '...',
          accessToken: this.envConfigService.getString('TWITTER_ACCESS_TOKEN').substring(0, 4) + '...',
          accessSecret: this.envConfigService.getString('TWITTER_ACCESS_TOKEN_SECRET').substring(0, 4) + '...',
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          status: error.status,
          errors: error.data?.errors || error.errors
        }
      };
    }
  }
} 