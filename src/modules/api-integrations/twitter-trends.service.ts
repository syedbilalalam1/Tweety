import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { EnvConfigService } from '../envConfig/envConfig.service';
import { TwitterApiService } from './twitter-api.service';

@Injectable()
export class TwitterTrendsService implements OnModuleInit {
  private readonly logger = new Logger(TwitterTrendsService.name);
  private readonly rapidApiKey: string;
  private readonly baseUrl = 'https://twitter-trends-by-location.p.rapidapi.com';
  
  private readonly countryRotation = [
    { name: 'Pakistan', placeId: 'd476c7ff73003334ad5a8e9830743ec3', id: 'pakistan' },
    { name: 'United States', placeId: 'f719fcd7bc333af4b3d78d0e65893e5e', id: 'usa' },
    { name: 'Japan', placeId: '7e4c96ab76453b4094ee71be3898b4c5', id: 'japan' },
    { name: 'India', placeId: 'd2c5d61cecd034eb91fda2134a615be1', id: 'india' },
    { name: 'Indonesia', placeId: '3cd5b28f4e3b37ce99d1add0e93e6279', id: 'indonesia' },
    { name: 'United Kingdom', placeId: '5130b9abb954331887c73b0abf65d7e0', id: 'uk' },
    { name: 'Brazil', placeId: 'ef044a77b56934ecbda21fd2af46ef09', id: 'brazil' },
    { name: 'Turkey', placeId: '94a0c0fb91873bcd961a692ecca4b6e0', id: 'turkey' },
    { name: 'Mexico', placeId: '2ed65c4c340e32b6bf490f24847e7855', id: 'mexico' },
    { name: 'France', placeId: 'bcfcd1438d8832179f5f2e6964ca482b', id: 'france' },
    { name: 'Saudi Arabia', placeId: 'a6b39eb330f232af985a75ef2fdc318e', id: 'saudi' },
    { name: 'Canada', placeId: '8ae73a2dc5eb3b1db0493cd8e0c0e550', id: 'canada' }
  ];

  private currentCountryIndex = 0;
  private trendCache: Map<string, { trends: any[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(
    private readonly envConfigService: EnvConfigService,
    private readonly twitterApiService: TwitterApiService,
  ) {
    this.rapidApiKey = this.envConfigService.getString('RAPIDAPI_KEY');
  }

  async onModuleInit() {
    // Wait for Twitter API to authenticate first
    try {
      await this.twitterApiService.testCredentials();
      this.logger.log('Twitter API authenticated, now fetching initial trends');
      await this.refreshAllTrends();
      this.logger.log('Initial trends fetching completed');
    } catch (error) {
      this.logger.error('Failed to initialize TwitterTrendsService:', error.message);
      // Don't throw error here - allow the service to start without initial trends
    }
  }

  private async refreshAllTrends() {
    // Clear existing cache
    this.trendCache.clear();
    
    // Fetch fresh trends for all countries with retries and longer delays
    for (const country of this.countryRotation) {
      try {
        await this.getTrendsByLocation(country.placeId, true);
        this.logger.log(`Initial trends fetched for ${country.name}`);
        // Add a longer delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
      } catch (error) {
        if (error.message?.includes('Rate limit')) {
          this.logger.warn(`Rate limit hit while fetching trends for ${country.name}, waiting 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay on rate limit
          try {
            await this.getTrendsByLocation(country.placeId, true);
            this.logger.log(`Retry successful for ${country.name}`);
          } catch (retryError) {
            this.logger.error(`Failed to fetch initial trends for ${country.name} after retry:`, retryError.message);
          }
        } else {
          this.logger.error(`Failed to fetch initial trends for ${country.name}:`, error.message);
        }
      }
    }
  }

  private async getTrendsByLocation(placeId: string, forceRefresh = false): Promise<any> {
    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = this.trendCache.get(placeId);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp < this.CACHE_DURATION)) {
          this.logger.log(`Using cached trends for ${placeId}, age: ${Math.floor((now - cached.timestamp) / 1000 / 60)} minutes`);
          return cached.trends;
        }
      }

      let lastError;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          this.logger.log(`Fetching trends for ${placeId} (attempt ${attempt}/${this.MAX_RETRIES})`);
          const response = await axios.get(`${this.baseUrl}/location/${placeId}`, {
            headers: {
              'x-rapidapi-key': this.rapidApiKey,
              'x-rapidapi-host': 'twitter-trends-by-location.p.rapidapi.com'
            }
          });

          // Ensure we have valid trends data
          if (!response.data?.trending?.trends || !Array.isArray(response.data.trending.trends)) {
            throw new Error('Invalid trends data received');
          }

          const trends = response.data.trending.trends
            .filter(trend => trend && trend.name) // Filter out invalid trends
            .map(trend => ({
              ...trend,
              postCount: trend.tweet_volume || trend.postCount || 0
            }))
            .sort((a, b) => (b.postCount || 0) - (a.postCount || 0)); // Sort by volume

          if (trends.length === 0) {
            throw new Error('No valid trends found');
          }
          
          // Cache the results with current timestamp
          this.trendCache.set(placeId, {
            trends,
            timestamp: Date.now()
          });

          // Add delay after successful request to prevent rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));

          return trends;
        } catch (error) {
          lastError = error;
          if (error.response?.status === 429) {
            this.logger.warn(`Rate limit hit for ${placeId}, attempt ${attempt}/${this.MAX_RETRIES}`);
            if (attempt < this.MAX_RETRIES) {
              const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          throw error;
        }
      }
      throw lastError;
    } catch (error) {
      this.logger.error(`Error fetching trends for place ID ${placeId}:`, error.message);
      
      // Return cached data if available, even if expired
      const cached = this.trendCache.get(placeId);
      if (cached && cached.trends.length > 0) {
        this.logger.warn(`Using expired cache for ${placeId} due to error`);
        return cached.trends;
      }
      
      // Return a default trend if all else fails
      return [{
        name: 'Trending Topics',
        postCount: 0
      }];
    }
  }

  async getNextCountryTrend(): Promise<{
    country: string;
    trend: string;
    hashtag: string;
  }> {
    const country = this.countryRotation[this.currentCountryIndex];
    
    try {
      // Check if we need to refresh all trends (at sequence start)
      if (this.currentCountryIndex === 0) {
        this.logger.log('Starting new sequence - refreshing all trends');
        await this.refreshAllTrends();
      }

      const trends = await this.getTrendsByLocation(country.placeId);
      
      const topTrend = trends.find(trend => trend.postCount !== null) || trends[0];
      
      if (!topTrend) {
        throw new Error(`No valid trends found for ${country.name}`);
      }
      
      // Rotate to next country
      this.currentCountryIndex = (this.currentCountryIndex + 1) % this.countryRotation.length;
      
      return {
        country: country.name,
        trend: topTrend.name.replace(/^#/, ''),
        hashtag: topTrend.name.startsWith('#') ? topTrend.name : `#${topTrend.name.replace(/\s+/g, '')}`
      };
    } catch (error) {
      this.logger.error(`Failed to get trends for ${country.name}:`, error.message);
      
      // Even if we fail, move to next country
      this.currentCountryIndex = (this.currentCountryIndex + 1) % this.countryRotation.length;
      
      throw error;
    }
  }

  async getAllCurrentTrends(): Promise<Record<string, any>> {
    const trends: Record<string, any> = {};
    
    try {
      await Promise.all(
        this.countryRotation.map(async (country) => {
          try {
            const countryTrends = await this.getTrendsByLocation(country.placeId);
            const topTrend = countryTrends.find(trend => trend.name && trend.name !== 'Trending Topics') || countryTrends[0];
            
            trends[country.id] = {
              name: topTrend?.name || 'Refreshing trends...',
              volume: topTrend?.postCount || 0,
              country: country.name
            };
          } catch (error) {
            this.logger.error(`Failed to fetch trends for ${country.name}:`, error.message);
            trends[country.id] = {
              name: 'Refreshing trends...',
              error: error.message,
              country: country.name
            };
          }
        })
      );
      
      return trends;
    } catch (error) {
      this.logger.error('Failed to fetch all trends:', error.message);
      throw error;
    }
  }

  // Add method to reset the sequence
  resetSequence() {
    this.logger.log('Resetting country sequence to start from Pakistan');
    this.currentCountryIndex = 0;
    this.trendCache.clear();
  }
} 