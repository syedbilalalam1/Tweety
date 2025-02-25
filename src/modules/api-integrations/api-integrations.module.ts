import { Module } from '@nestjs/common';
import { TwitterApiService } from './twitter-api.service';
import { OpenRouterService } from './openrouter.service';
import { TwitterTrendsService } from './twitter-trends.service';
import { OpenAiService } from './openAi.service';
import { EnvConfigModule } from '../envConfig/envConfig.module';
import { EnvConfigService } from '../envConfig/envConfig.service';

@Module({
  imports: [EnvConfigModule],
  providers: [
    TwitterApiService,
    OpenRouterService,
    {
      provide: TwitterTrendsService,
      useFactory: (envConfig: EnvConfigService, twitterApi: TwitterApiService) => {
        return new TwitterTrendsService(envConfig, twitterApi);
      },
      inject: [EnvConfigService, TwitterApiService],
    },
    OpenAiService,
  ],
  exports: [
    TwitterApiService,
    OpenRouterService,
    TwitterTrendsService,
    OpenAiService,
  ],
})
export class ApiIntegrationsModule {}
