import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the language from the request
 * Language can be provided via:
 * 1. Query parameter: ?lang=hr
 * 2. Accept-Language header
 * 3. Custom header: x-custom-lang
 */
export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority 1: Query parameter
    if (request.query?.lang) {
      return request.query.lang;
    }

    // Priority 2: Custom header
    if (request.headers['x-custom-lang']) {
      return request.headers['x-custom-lang'];
    }

    // Priority 3: Accept-Language header
    if (request.headers['accept-language']) {
      const acceptLanguage = request.headers['accept-language'];
      // Parse the first language from Accept-Language header
      const lang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
      return lang;
    }

    // Default fallback
    return 'en';
  },
);
