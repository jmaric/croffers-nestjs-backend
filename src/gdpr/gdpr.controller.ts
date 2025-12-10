import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GdprService } from './gdpr.service.js';
import type { ConsentUpdateDto } from './gdpr.service.js';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import {
  AuditCreate,
  AuditDelete,
  AuditUpdate,
} from '../audit/decorators/audit-log.decorator.js';

@ApiTags('GDPR Compliance')
@Controller({ path: 'gdpr', version: '1' })
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export all user data (Right to Access - GDPR Article 15)',
    description:
      'Returns all personal data associated with the user account in JSON format',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
  })
  @Header('Content-Type', 'application/json')
  @Header(
    'Content-Disposition',
    'attachment; filename="user-data-export.json"',
  )
  async exportData(@GetUser('id') userId: number) {
    return this.gdprService.exportUserData(userId);
  }

  @Post('deletion-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request account deletion (Right to be Forgotten - GDPR Article 17)',
    description: `Schedules account deletion after a grace period of 30 days. You can cancel this request before the scheduled deletion date.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion request created successfully',
    schema: {
      example: {
        message:
          'Your account deletion has been scheduled. Your data will be permanently deleted on 2024-01-30T12:00:00.000Z',
        scheduledDeletionDate: '2024-01-30T12:00:00.000Z',
        gracePeriodDays: 30,
      },
    },
  })
  @AuditDelete('User', 'Account deletion requested')
  async requestDeletion(@GetUser('id') userId: number) {
    return this.gdprService.requestDeletion(userId);
  }

  @Delete('deletion-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel account deletion request',
    description: 'Cancels a previously scheduled account deletion',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion request cancelled successfully',
  })
  async cancelDeletion(@GetUser('id') userId: number) {
    return this.gdprService.cancelDeletion(userId);
  }

  @Post('consents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user consents (Right to Withdraw Consent - GDPR Article 7)',
    description: 'Update marketing and data processing consents',
  })
  @ApiResponse({
    status: 200,
    description: 'Consents updated successfully',
  })
  @AuditUpdate('User', 'User consents updated')
  async updateConsents(
    @GetUser('id') userId: number,
    @Body() consents: ConsentUpdateDto,
  ) {
    return this.gdprService.updateConsents(userId, consents);
  }

  @Get('consents')
  @ApiOperation({
    summary: 'Get current consent status',
    description: 'Returns the current state of all user consents and policies',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent status retrieved successfully',
  })
  async getConsentStatus(@GetUser('id') userId: number) {
    return this.gdprService.getConsentStatus(userId);
  }

  @Post('accept-policies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept privacy policy and terms of service',
    description: 'Records user acceptance of privacy policy and terms',
  })
  @ApiResponse({
    status: 200,
    description: 'Policies accepted successfully',
  })
  @AuditUpdate('User', 'Privacy policy and terms accepted')
  async acceptPolicies(@GetUser('id') userId: number) {
    return this.gdprService.acceptPolicies(userId);
  }
}
