import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit.service.js';
import { AuditAction } from "../../../generated/prisma/client/client.js";

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: AuditAction;
  entity: string;
  description?: string;
  skipSuccess?: boolean; // Don't log if request succeeds
  skipFailure?: boolean; // Don't log if request fails
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    const auditData = {
      userId: user?.sub || user?.id,
      action: metadata.action,
      entity: metadata.entity,
      description: metadata.description,
      ipAddress: this.getIpAddress(request),
      userAgent: request.headers['user-agent'],
      endpoint: request.url,
      method: request.method,
      metadata: {
        params: request.params,
        query: request.query,
        // Don't log sensitive data like passwords
        body: this.sanitizeBody(request.body),
      },
    };

    return next.handle().pipe(
      tap({
        next: (data) => {
          if (!metadata.skipSuccess) {
            // Extract entity ID from response or params
            const entityId =
              data?.id ||
              request.params?.id ||
              (typeof data === 'object' && data !== null
                ? this.extractId(data)
                : undefined);

            this.auditService.createLog({
              ...auditData,
              entityId: entityId ? parseInt(entityId, 10) : undefined,
              statusCode: response.statusCode || 200,
            });
          }
        },
        error: (error) => {
          if (!metadata.skipFailure) {
            this.auditService.createLog({
              ...auditData,
              statusCode: error.status || 500,
              metadata: {
                ...auditData.metadata,
                error: error.message,
              },
            });
          }
        },
      }),
    );
  }

  private getIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'hash',
      'secret',
      'token',
      'apiKey',
      'creditCard',
      'cvv',
      'ssn',
    ];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private extractId(obj: any): string | undefined {
    if (Array.isArray(obj)) {
      // If response is an array, try the first item
      return obj.length > 0 ? this.extractId(obj[0]) : undefined;
    }

    // Common ID field names
    const idFields = ['id', '_id', 'ID'];
    for (const field of idFields) {
      if (obj[field] !== undefined) {
        return String(obj[field]);
      }
    }

    return undefined;
  }
}
