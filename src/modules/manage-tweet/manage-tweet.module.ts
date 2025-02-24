import { Module } from '@nestjs/common';
import { ManageTweetService } from './manage-tweet.service';
import { ManageTweetController } from './manage-tweet.controller';
import { ApiIntegrationsModule } from '../api-integrations/api-integrations.module';
import { EnvConfigModule } from '../envConfig/envConfig.module';

@Module({
  imports: [
    ApiIntegrationsModule,
    EnvConfigModule,
  ],
  controllers: [ManageTweetController],
  providers: [ManageTweetService],
  exports: [ManageTweetService],
})
export class ManageTweetModule {}
