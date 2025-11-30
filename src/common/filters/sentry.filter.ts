import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        errorResponse = exceptionResponse;
        message = (exceptionResponse as any).message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log to Sentry for 5xx errors or unexpected errors
    if (status >= 500 || !(exception instanceof HttpException)) {
      Sentry.withScope((scope) => {
        scope.setTag('path', request.url);
        scope.setTag('method', request.method);
        scope.setContext('request', {
          url: request.url,
          method: request.method,
          headers: request.headers,
          query: request.query,
          body: request.body,
        });
        
        if (request.user) {
          scope.setUser({
            id: (request.user as any).id,
            email: (request.user as any).email,
          });
        }

        Sentry.captureException(exception);
      });
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...errorResponse,
      message,
    });
  }
}
