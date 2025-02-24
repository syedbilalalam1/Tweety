import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { EnvConfigService } from '../envConfig/envConfig.service';

@Injectable()
export class TwitterTrendsService {
  private readonly logger = new Logger(TwitterTrendsService.name);
  private readonly rapidApiKey: string;
  private readonly baseUrl = 'https://twitter-trends-by-location.p.rapidapi.com';
  
  private readonly countryRotation = [
    { name: 'Pakistan', placeId: 'd476c7ff73003334ad5a8e9830743ec3', id: 'pakistan' },
    { name: 'United Kingdom', placeId: '5130b9abb954331887c73b0abf65d7e0', id: 'uk' },
    { name: 'India', placeId: 'd2c5d61cecd034eb91fda2134a615be1', id: 'india' },
    { name: 'United States', placeId: 'f719fcd7bc333af4b3d78d0e65893e5e', id: 'usa' }
  ];

  private currentCountryIndex = 0;
  private trendCache: Map<string, { trends: any[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly envConfigService: EnvConfigService) {
    this.rapidApiKey = this.envConfigService.getString('RAPIDAPI_KEY');
  }

  private async getTrendsByLocation(placeId: string): Promise<any> {
    try {
      // Check cache first
      const cached = this.trendCache.get(placeId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.trends;
      }

      const response = await axios.get(`${this.baseUrl}/location/${placeId}`, {
        headers: {
          'x-rapidapi-key': this.rapidApiKey,
          'x-rapidapi-host': 'twitter-trends-by-location.p.rapidapi.com'
        }
      });

      // Extract trends from the correct response structure
      const trends = response.data?.trending?.trends || [];
      
      // Cache the results
      this.trendCache.set(placeId, {
        trends,
        timestamp: Date.now()
      });

      return trends;
    } catch (error) {
      this.logger.error(`Error fetching trends for place ID ${placeId}:`, error.message);
      throw error;
    }
  }

  async getNextCountryTrend(): Promise<{
    country: string;
    trend: string;
    hashtag: string;
  }> {
    const country = this.countryRotation[this.currentCountryIndex];
    
    try {
      const trends = await this.getTrendsByLocation(country.placeId);
      
      // Find the first trending topic that has a postCount (indicating it's active)
      const topTrend = trends.find(trend => trend.postCount !== null) || trends[0];
      
      if (!topTrend) {
        throw new Error(`No valid trends found for ${country.name}`);
      }
      
      // Rotate to next country
      this.currentCountryIndex = (this.currentCountryIndex + 1) % this.countryRotation.length;
      
      return {
        country: country.name,
        trend: topTrend.name.replace(/^#/, ''), // Remove leading # if present
        hashtag: topTrend.name.startsWith('#') ? topTrend.name : `#${topTrend.name.replace(/\s+/g, '')}`
      };
    } catch (error) {
      this.logger.error(`Failed to get trends for ${country.name}:`, error.message);
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
            const topTrend = countryTrends.find(trend => trend.postCount !== null) || countryTrends[0];
            
            trends[country.id] = {
              name: topTrend?.name || 'No trends available',
              volume: topTrend?.postCount || 0,
              country: country.name
            };
          } catch (error) {
            this.logger.error(`Failed to fetch trends for ${country.name}:`, error.message);
            trends[country.id] = {
              name: 'Failed to fetch trends',
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
} 