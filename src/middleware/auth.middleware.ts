import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EnvConfigService } from '../modules/envConfig/envConfig.service';
import * as session from 'express-session';

declare module 'express' {
  interface Request {
    session: session.Session & {
      isAuthenticated: boolean;
    };
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly envConfigService: EnvConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip auth for login page and login POST request
    if (req.path === '/login' || (req.path === '/auth/login' && req.method === 'POST')) {
      return next();
    }

    // Check if user is authenticated
    if (req.session.isAuthenticated) {
      return next();
    }

    // If not authenticated, redirect to login page
    res.redirect('/login');
  }
} 