import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SocialController } from './social.controller.js';
import { ItinerarySharingService } from './services/itinerary-sharing.service.js';
import { TravelStoryService } from './services/travel-story.service.js';
import { FriendshipService } from './services/friendship.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [
    ItinerarySharingService,
    TravelStoryService,
    FriendshipService,
  ],
  exports: [
    ItinerarySharingService,
    TravelStoryService,
    FriendshipService,
  ],
})
export class SocialModule {}
