import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ManageTweetModule } from '../manage-tweet/manage-tweet.module';

@Module({
  imports: [ManageTweetModule],
  controllers: [DashboardController],
})
export class DashboardModule {} 