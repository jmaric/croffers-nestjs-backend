import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../services/subscription.service.js';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirePremium = this.reflector.get<boolean>(
      'requirePremium',
      context.getHandler(),
    );

    if (!requirePremium) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const isPremium = await this.subscriptionService.isPremium(userId);

    if (!isPremium) {
      throw new ForbiddenException(
        'This feature requires a Premium subscription. Upgrade now to access 7-day predictions, unlimited price alerts, and more!',
      );
    }

    return true;
  }
}
