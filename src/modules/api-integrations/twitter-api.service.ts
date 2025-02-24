import { Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '../envConfig/envConfig.service';
import { TwitterApi } from 'twitter-api-v2';

@Injectable()
export class TwitterApiService {
  private readonly logger = new Logger(TwitterApiService.name);
  private readonly twitterClient: TwitterApi;

  constructor(private readonly envConfigService: EnvConfigService) {
    this.twitterClient = new TwitterApi({
      appKey: this.envConfigService.getString('TWITTER_CLIENT_ID'),
      appSecret: this.envConfigService.getString('TWITTER_CLIENT_SECRET'),
      accessToken: this.envConfigService.getString('TWITTER_ACCESS_TOKEN'),
      accessSecret: this.envConfigService.getString('TWITTER_ACCESS_TOKEN_SECRET'),
    });
  }

  async createTweet(params: { text: string; media?: { media_ids: [string] } }) {
    try {
      if (!params.text && !params.media?.media_ids?.length) {
        throw new Error('Tweet must contain either text or media');
      }

      if (params.text && params.text.trim().length === 0) {
        throw new Error('Tweet text cannot be empty');
      }

      this.logger.log('Posting tweet:', {
        textLength: params.text?.length || 0,
        hasMedia: !!params.media?.media_ids?.length,
      });

      const response = await this.twitterClient.v2.tweet(params);
      this.logger.log('Tweet posted successfully:', response);
      return response;
    } catch (error) {
      this.logger.error('Error posting tweet:', error.response?.data || error.message);
      if (error.response?.data) {
        this.logger.debug('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    try {
      const mediaId = await this.twitterClient.v1.uploadMedia(filePath);
      this.logger.log('Media uploaded successfully');
      return mediaId;
    } catch (error) {
      this.logger.error('Failed to upload media:', error.message);
      throw error;
    }
  }
} 