import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ApiIntegrationsModule } from './modules/api-integrations/api-integrations.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ManageTweetModule } from './modules/manage-tweet/manage-tweet.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EnvConfigModule } from './modules/envConfig/envConfig.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import * as session from 'express-session';
import { ApiController } from './modules/api/api.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ApiIntegrationsModule,
    ManageTweetModule,
    DashboardModule,
    EnvConfigModule,
  ],
  controllers: [AppController, AuthController, ApiController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply session middleware globally
    consumer
      .apply(
        session({
          secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-123',
          resave: false,
          saveUninitialized: false,
          cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          },
        })
      )
      .forRoutes('*');

    // Apply auth middleware to all routes except login-related ones
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'login', method: RequestMethod.ALL },
        { path: 'auth/login', method: RequestMethod.ALL }
      )
      .forRoutes('*');
  }
}
