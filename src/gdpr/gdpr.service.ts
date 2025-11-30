import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../../generated/prisma/client/index.js';

export interface ConsentUpdateDto {
  marketingConsent?: boolean;
  dataProcessingConsent?: boolean;
}

export interface UserDataExport {
  personalInformation: any;
  profile: any;
  bookings: any[];
  reviews: any[];
  messages: any[];
  favorites: any[];
  itineraries: any[];
  notifications: any[];
  auditLogs: any[];
  suppliers: any[];
  exportedAt: Date;
  exportFormat: string;
}

@Injectable()
export class GdprService {
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Export all user data (Right to Access - GDPR Article 15)
   */
  async exportUserData(userId: number): Promise<UserDataExport> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        bookings: {
          include: {
            service: true,
            payment: true,
          },
        },
        reviews: true,
        guestConversations: {
          include: {
            messages: true,
          },
        },
        supplierConversations: {
          include: {
            messages: true,
          },
        },
        favorites: {
          include: {
            service: true,
          },
        },
        itineraries: true,
        notifications: true,
        suppliers: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive data
    const { hash, resetToken, emailVerificationToken, ...personalInfo } = user;

    // Combine all messages from both guest and supplier conversations
    const allMessages = [
      ...user.guestConversations.flatMap((conv) => conv.messages),
      ...user.supplierConversations.flatMap((conv) => conv.messages),
    ];

    const exportData: UserDataExport = {
      personalInformation: {
        ...personalInfo,
        dataExportDate: new Date(),
        accountAge: this.calculateAccountAge(user.createdAt),
      },
      profile: user.profile,
      bookings: user.bookings,
      reviews: user.reviews,
      messages: allMessages,
      favorites: user.favorites,
      itineraries: user.itineraries,
      notifications: user.notifications,
      auditLogs: auditLogs.map((log) => ({
        action: log.action,
        entity: log.entity,
        description: log.description,
        createdAt: log.createdAt,
        ipAddress: log.ipAddress,
      })),
      suppliers: user.suppliers,
      exportedAt: new Date(),
      exportFormat: 'application/json',
    };

    // Log the data export
    await this.auditService.createLog({
      userId,
      action: AuditAction.EXPORT,
      entity: 'User',
      entityId: userId,
      description: 'User data exported (GDPR Article 15)',
    });

    return exportData;
  }

  /**
   * Request account deletion (Right to be Forgotten - GDPR Article 17)
   */
  async requestDeletion(userId: number): Promise<{
    message: string;
    scheduledDeletionDate: Date;
    gracePeriodDays: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletionRequestedAt) {
      throw new BadRequestException('Deletion already requested');
    }

    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(
      scheduledDeletionDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: scheduledDeletionDate,
        status: 'INACTIVE',
      },
    });

    // Log the deletion request
    await this.auditService.createLog({
      userId,
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: userId,
      description: `Account deletion requested (GDPR Article 17). Scheduled for ${scheduledDeletionDate.toISOString()}`,
    });

    return {
      message: `Your account deletion has been scheduled. Your data will be permanently deleted on ${scheduledDeletionDate.toISOString()}. You can cancel this request before that date.`,
      scheduledDeletionDate,
      gracePeriodDays: this.DELETION_GRACE_PERIOD_DAYS,
    };
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deletionRequestedAt) {
      throw new BadRequestException('No deletion request found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
        status: 'ACTIVE',
      },
    });

    // Log the cancellation
    await this.auditService.createLog({
      userId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: userId,
      description: 'Account deletion request cancelled',
    });

    return {
      message: 'Your account deletion request has been cancelled.',
    };
  }

  /**
   * Permanently delete user account and all associated data
   */
  async permanentlyDeleteAccount(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log before deletion (audit log will be deleted too)
    await this.auditService.createLog({
      userId,
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: userId,
      description: 'Account permanently deleted (GDPR compliance)',
    });

    // Delete user and all cascading relations
    // Prisma's onDelete: Cascade will handle related records
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Process scheduled deletions (should be run daily via cron)
   */
  async processScheduledDeletions(): Promise<{
    processed: number;
    deleted: number[];
  }> {
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        scheduledDeletionAt: {
          lte: new Date(),
        },
        deletionRequestedAt: {
          not: null,
        },
      },
    });

    const deletedIds: number[] = [];

    for (const user of usersToDelete) {
      try {
        await this.permanentlyDeleteAccount(user.id);
        deletedIds.push(user.id);
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }

    return {
      processed: usersToDelete.length,
      deleted: deletedIds,
    };
  }

  /**
   * Update user consents (Right to Withdraw Consent - GDPR Article 7)
   */
  async updateConsents(
    userId: number,
    consents: ConsentUpdateDto,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (consents.marketingConsent !== undefined) {
      updateData.marketingConsent = consents.marketingConsent;
      updateData.marketingConsentAt = consents.marketingConsent
        ? new Date()
        : null;
    }

    if (consents.dataProcessingConsent !== undefined) {
      updateData.dataProcessingConsent = consents.dataProcessingConsent;
      updateData.dataProcessingConsentAt = consents.dataProcessingConsent
        ? new Date()
        : null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        marketingConsent: true,
        marketingConsentAt: true,
        dataProcessingConsent: true,
        dataProcessingConsentAt: true,
      },
    });

    // Log consent changes
    await this.auditService.createLog({
      userId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: userId,
      description: 'User consents updated (GDPR Article 7)',
      metadata: consents,
    });

    return updatedUser;
  }

  /**
   * Accept privacy policy and terms
   */
  async acceptPolicies(userId: number): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: now,
        termsAccepted: true,
        termsAcceptedAt: now,
      },
      select: {
        id: true,
        email: true,
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: true,
        termsAccepted: true,
        termsAcceptedAt: true,
      },
    });

    // Log policy acceptance
    await this.auditService.createLog({
      userId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: userId,
      description: 'Privacy policy and terms accepted',
    });

    return updatedUser;
  }

  /**
   * Get user's current consent status
   */
  async getConsentStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: true,
        termsAccepted: true,
        termsAcceptedAt: true,
        marketingConsent: true,
        marketingConsentAt: true,
        dataProcessingConsent: true,
        dataProcessingConsentAt: true,
        deletionRequestedAt: true,
        scheduledDeletionAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Helper: Calculate account age
   */
  private calculateAccountAge(createdAt: Date): string {
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageYears = Math.floor(ageDays / 365);
    const remainingDays = ageDays % 365;

    if (ageYears > 0) {
      return `${ageYears} year${ageYears > 1 ? 's' : ''} and ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
    }
    return `${ageDays} day${ageDays > 1 ? 's' : ''}`;
  }
}
