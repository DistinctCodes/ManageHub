import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use 'x-lang' header first, then 'accept-language', else default to 'en'
    const langFromHeader = req.headers['x-lang'] as string;
    const acceptLang = req.headers['accept-language']?.split(',')[0];
    req['i18nLang'] = langFromHeader || acceptLang || 'en';
    next();
  }
}
