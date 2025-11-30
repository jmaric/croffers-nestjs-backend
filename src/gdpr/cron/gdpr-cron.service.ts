import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GdprService } from '../gdpr.service.js';

@Injectable()
export class GdprCronService {
  private readonly logger = new Logger(GdprCronService.name);

  constructor(private readonly gdprService: GdprService) {}

  /**
   * Process scheduled account deletions
   * Runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'process-scheduled-deletions',
    timeZone: 'UTC',
  })
  async handleScheduledDeletions() {
    this.logger.log('Starting scheduled account deletions processing...');

    try {
      const result = await this.gdprService.processScheduledDeletions();

      if (result.processed > 0) {
        this.logger.log(
          `Processed ${result.processed} scheduled deletions. Successfully deleted ${result.deleted.length} accounts.`,
        );
        this.logger.log(`Deleted user IDs: ${result.deleted.join(', ')}`);
      } else {
        this.logger.log('No accounts scheduled for deletion.');
      }
    } catch (error) {
      this.logger.error(
        'Error processing scheduled deletions:',
        error.stack || error,
      );
    }
  }

  /**
   * Send deletion reminders to users
   * Runs daily at 9 AM
   * Reminds users 7 days before scheduled deletion
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'send-deletion-reminders',
    timeZone: 'UTC',
  })
  async sendDeletionReminders() {
    this.logger.log('Checking for accounts requiring deletion reminders...');

    // TODO: Implement reminder logic
    // Find users with scheduledDeletionAt between 7-8 days from now
    // Send email reminder with cancellation link
    // This would integrate with the MailService

    this.logger.log('Deletion reminders check completed.');
  }
}
