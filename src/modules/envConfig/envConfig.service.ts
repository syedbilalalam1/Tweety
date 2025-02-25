import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvConfigService {
  constructor(private readonly configService: ConfigService) {}

  get(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} environment variable is not set`);
    }
    return value;
  }

  getString(key: string): string {
    return this.get(key);
  }

  getNumber(key: string): number {
    const value = this.get(key);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`${key} environment variable is not a number`);
    }
    return parsed;
  }

  getBoolean(key: string): boolean {
    const value = this.get(key).toLowerCase();
    return value === 'true' || value === '1';
  }

  get nodeEnv(): string {
    return this.getString('NODE_ENV');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
