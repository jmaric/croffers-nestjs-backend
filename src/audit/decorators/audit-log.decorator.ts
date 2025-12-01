import { SetMetadata } from '@nestjs/common';
import { AuditAction } from "../../../generated/prisma/client/client.js";
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../interceptors/audit.interceptor.js';

/**
 * Decorator to enable audit logging for a controller method
 *
 * @example
 * @AuditLog({ action: AuditAction.CREATE, entity: 'User', description: 'User registration' })
 * @Post('signup')
 * signup(@Body() dto: AuthDto) { }
 *
 * @example
 * @AuditLog({ action: AuditAction.DELETE, entity: 'Service' })
 * @Delete(':id')
 * remove(@Param('id') id: string) { }
 */
export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);

/**
 * Convenience decorators for common actions
 */

export const AuditCreate = (entity: string, description?: string) =>
  AuditLog({ action: AuditAction.CREATE, entity, description });

export const AuditUpdate = (entity: string, description?: string) =>
  AuditLog({ action: AuditAction.UPDATE, entity, description });

export const AuditDelete = (entity: string, description?: string) =>
  AuditLog({ action: AuditAction.DELETE, entity, description });

export const AuditLogin = (description?: string) =>
  AuditLog({
    action: AuditAction.LOGIN,
    entity: 'User',
    description: description || 'User login',
  });

export const AuditLogout = (description?: string) =>
  AuditLog({
    action: AuditAction.LOGOUT,
    entity: 'User',
    description: description || 'User logout',
  });

export const AuditPayment = (description?: string) =>
  AuditLog({
    action: AuditAction.PAYMENT,
    entity: 'Payment',
    description,
  });

export const AuditBooking = (action: AuditAction, description?: string) =>
  AuditLog({ action, entity: 'Booking', description });

export const AuditStatusChange = (entity: string, description?: string) =>
  AuditLog({ action: AuditAction.STATUS_CHANGE, entity, description });
