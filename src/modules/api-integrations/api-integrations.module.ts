import { Module } from '@nestjs/common';
import { TwitterApiService } from './twitter-api.service';
import { OpenRouterService } from './openrouter.service';
import { TwitterTrendsService } from './twitter-trends.service';
import { OpenAiService } from './openAi.service';
import { EnvConfigModule } from '../envConfig/envConfig.module';

@Module({
  imports: [EnvConfigModule],
  providers: [
    TwitterApiService,
    OpenRouterService,
    TwitterTrendsService,
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
