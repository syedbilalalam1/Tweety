import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import {
  SendTweetV2Params,
  TweetV2PostTweetResult,
  TwitterApi,
  TwitterApiReadWrite,
} from 'twitter-api-v2';
import { EnvConfigService } from '../envConfig/envConfig.service';

@Injectable()
export class TwitterApiService {
  private readonly logger = new Logger(TwitterApiService.name);
  private readonly baseUrl: string;
  private readonly authCredentials: string;
  private twitterClient: TwitterApiReadWrite;

  constructor(private readonly envConfigService: EnvConfigService) {
    this.baseUrl = envConfigService.getString('TWITTER_API_BASE_URL');

    this.authCredentials = Buffer.from(
      `${envConfigService.getString('TWITTER_CLIENT_ID')}:${envConfigService.getString('TWITTER_CLIENT_SECRET')}`,
    ).toString('base64');

    this.twitterClient = new TwitterApi({
      appKey: envConfigService.getString('TWITTER_CLIENT_ID'),
      appSecret: envConfigService.getString('TWITTER_CLIENT_SECRET'),
      accessToken: envConfigService.getString('TWITTER_ACCESS_TOKEN'),
      accessSecret: envConfigService.getString('TWITTER_ACCESS_TOKEN_SECRET'),
    }).readWrite;
  }

  async getBearerToken(): Promise<string> {
    try {
      const requestBody = 'grant_type=client_credentials';
      const requestOptions = {
        headers: {
          Authorization: `Basic ${this.authCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      };

      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/oauth2/token`,
        requestBody,
        requestOptions,
      );
      const bearerToken: string = response.data.access_token;
      this.logger.debug('Bearer Token obtained successfully');
      return bearerToken;
    } catch (error) {
      this.logger.error(
        'Error obtaining bearer token:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async createTweet(
    content: SendTweetV2Params,
  ): Promise<TweetV2PostTweetResult> {
    try {
      if (!content.text && !content.media?.media_ids?.length) {
        throw new Error('Tweet must contain either text or media');
      }

      if (content.text && content.text.trim().length === 0) {
        throw new Error('Tweet text cannot be empty');
      }

      this.logger.log('Posting tweet:', {
        textLength: content.text?.length || 0,
        hasMedia: !!content.media?.media_ids?.length,
      });

      const response = await this.twitterClient.v2.tweet(content);
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

  async uploadMedia(file: string): Promise<string> {
    try {
      this.logger.log('Uploading media:', file);
      const mediaId = await this.twitterClient.v1.uploadMedia(file);
      this.logger.log('Media uploaded successfully:', mediaId);
      return mediaId;
    } catch (error) {
      this.logger.error('Error uploading media:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteTweet() {}
}
