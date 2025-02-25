import { Controller, Get, Post, Render, Req, Res, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { EnvConfigService } from '../envConfig/envConfig.service';

@Controller()
export class AuthController {
  constructor(private readonly envConfigService: EnvConfigService) {}

  @Get('login')
  @Render('login')
  getLogin(@Req() req: Request) {
    return { error: req.query.error };
  }

  @Post('auth/login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { username, password } = body;
    const validUsername = this.envConfigService.getString('AUTH_USERNAME');
    const validPassword = this.envConfigService.getString('AUTH_PASSWORD');

    if (username === validUsername && password === validPassword) {
      req.session.isAuthenticated = true;
      return res.redirect('/');
    }

    return res.redirect('/login?error=Invalid+credentials');
  }

  @Get('auth/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  }
} 