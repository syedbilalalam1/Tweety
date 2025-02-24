import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as hbs from 'hbs';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configure views
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir([join(__dirname, '..', 'views')]);
  app.setViewEngine('hbs');
  
  // Register Handlebars helpers
  hbs.registerHelper('eq', function(a, b) {
    return a === b;
  });

  // Remove default route handler
  app.getHttpAdapter().get('/', (req: Request, res: Response) => {
    res.redirect('/dashboard');
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
