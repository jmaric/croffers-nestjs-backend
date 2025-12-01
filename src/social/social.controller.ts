import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../guard/index.js';
import { GetUser } from '../../auth/decorator/get-user.decorator.js';
import { ItinerarySharingService } from './services/itinerary-sharing.service.js';
import { TravelStoryService } from './services/travel-story.service.js';
import { FriendshipService } from './services/friendship.service.js';
import {
  ShareItineraryDto,
  UpdateSharedItineraryDto,
  AddCollaboratorDto,
  CreateTravelStoryDto,
  UpdateTravelStoryDto,
  SendFriendRequestDto,
  CommentDto,
} from './dto/index.js';

@ApiTags('Social & Sharing')
@Controller({ path: 'social', version: '1' })
export class SocialController {
  constructor(
    private readonly itinerarySharingService: ItinerarySharingService,
    private readonly travelStoryService: TravelStoryService,
    private readonly friendshipService: FriendshipService,
  ) {}

  // ===========================
  // Itinerary Sharing Endpoints
  // ===========================

  @Post('itineraries/share')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Share an itinerary',
    description:
      'Share your itinerary publicly or with friends. Can enable collaboration.',
  })
  async shareItinerary(
    @Body() dto: ShareItineraryDto,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.shareItinerary(dto, userId);
  }

  @Get('itineraries')
  @ApiOperation({
    summary: 'Get shared itineraries feed',
    description:
      'Browse shared itineraries. Public itineraries visible to all, friends-only visible to authenticated users.',
  })
  async getSharedItineraries(
    @Query('visibility') visibility?: string,
  ) {
    return this.itinerarySharingService.getSharedItineraries(
      undefined,
      visibility,
    );
  }

  @Get('itineraries/:id')
  @ApiOperation({
    summary: 'Get single shared itinerary',
    description: 'View a shared itinerary. Increments view count.',
  })
  async getSharedItinerary(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.itinerarySharingService.getSharedItinerary(id, undefined);
  }

  @Put('itineraries/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update shared itinerary',
    description: 'Update visibility, title, description, or collaboration settings.',
  })
  async updateSharedItinerary(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSharedItineraryDto,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.updateSharedItinerary(id, dto, userId);
  }

  @Delete('itineraries/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unshare itinerary',
    description: 'Remove itinerary from public sharing.',
  })
  async deleteSharedItinerary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.deleteSharedItinerary(id, userId);
  }

  @Post('itineraries/:id/fork')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fork shared itinerary',
    description:
      'Create a copy of a shared itinerary to your account. Increments fork count.',
  })
  async forkItinerary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.forkItinerary(id, userId);
  }

  @Post('itineraries/:id/like')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Like/unlike shared itinerary',
    description: 'Toggle like on a shared itinerary.',
  })
  async likeItinerary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.likeItinerary(id, userId);
  }

  @Post('itineraries/:id/comments')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add comment to shared itinerary',
    description: 'Comment on a shared itinerary. Supports nested replies.',
  })
  async addItineraryComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.addComment(id, dto, userId);
  }

  @Get('itineraries/:id/comments')
  @ApiOperation({
    summary: 'Get comments on shared itinerary',
    description: 'Retrieve all top-level comments with nested replies.',
  })
  async getItineraryComments(@Param('id', ParseIntPipe) id: number) {
    return this.itinerarySharingService.getComments(id);
  }

  @Post('itineraries/:id/collaborators')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add collaborator to shared itinerary',
    description:
      'Add a user as collaborator. Requires collaboration to be enabled.',
  })
  async addCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCollaboratorDto,
    @GetUser('id') userId: number,
  ) {
    return this.itinerarySharingService.addCollaborator(id, dto, userId);
  }

  // =======================
  // Travel Stories Endpoints
  // =======================

  @Post('stories')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create travel story',
    description:
      'Post a travel story with photos, location, and tags. Can link to itinerary or booking.',
  })
  async createStory(
    @Body() dto: CreateTravelStoryDto,
    @GetUser('id') userId: number,
  ) {
    return this.travelStoryService.createStory(dto, userId);
  }

  @Get('stories')
  @ApiOperation({
    summary: 'Get travel stories feed',
    description:
      'Browse travel stories. Filter by location. Public stories visible to all.',
  })
  async getStories(
    @Query('locationId', new ParseIntPipe({ optional: true }))
    locationId?: number,
  ) {
    return this.travelStoryService.getStories(undefined, locationId);
  }

  @Get('stories/:id')
  @ApiOperation({
    summary: 'Get single travel story',
    description: 'View a travel story. Increments view count.',
  })
  async getStory(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.travelStoryService.getStory(id, undefined);
  }

  @Put('stories/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update travel story',
    description: 'Update your story content, photos, or visibility.',
  })
  async updateStory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTravelStoryDto,
    @GetUser('id') userId: number,
  ) {
    return this.travelStoryService.updateStory(id, dto, userId);
  }

  @Delete('stories/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete travel story',
    description: 'Delete your travel story.',
  })
  async deleteStory(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.travelStoryService.deleteStory(id, userId);
  }

  @Post('stories/:id/like')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Like/unlike travel story',
    description: 'Toggle like on a travel story.',
  })
  async likeStory(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.travelStoryService.likeStory(id, userId);
  }

  @Post('stories/:id/comments')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add comment to travel story',
    description: 'Comment on a travel story. Supports nested replies.',
  })
  async addStoryComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @GetUser('id') userId: number,
  ) {
    return this.travelStoryService.addComment(id, dto, userId);
  }

  @Get('stories/:id/comments')
  @ApiOperation({
    summary: 'Get comments on travel story',
    description: 'Retrieve all top-level comments with nested replies.',
  })
  async getStoryComments(@Param('id', ParseIntPipe) id: number) {
    return this.travelStoryService.getComments(id);
  }

  // =======================
  // Friendship Endpoints
  // =======================

  @Post('friends/request')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send friend request',
    description: 'Send a friend request to another user.',
  })
  async sendFriendRequest(
    @Body() dto: SendFriendRequestDto,
    @GetUser('id') userId: number,
  ) {
    return this.friendshipService.sendFriendRequest(dto, userId);
  }

  @Post('friends/:id/accept')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept friend request',
    description: 'Accept a pending friend request.',
  })
  async acceptFriendRequest(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.friendshipService.acceptFriendRequest(id, userId);
  }

  @Delete('friends/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove friendship',
    description: 'Remove a friend or reject a friend request.',
  })
  async removeFriendship(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.friendshipService.removeFriendship(id, userId);
  }

  @Get('friends')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get friends list',
    description: 'Get all accepted friends.',
  })
  async getFriends(@GetUser('id') userId: number) {
    return this.friendshipService.getFriends(userId);
  }

  @Get('friends/requests')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending friend requests',
    description: 'Get all pending friend requests sent to you.',
  })
  async getPendingRequests(@GetUser('id') userId: number) {
    return this.friendshipService.getPendingRequests(userId);
  }

  // =======================
  // Activity Feed Endpoint
  // =======================

  @Get('feed')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get activity feed',
    description:
      'Get combined activity feed from you and your friends. Shows recent bookings, reviews, shared itineraries, and posted stories.',
  })
  async getActivityFeed(@GetUser('id') userId: number) {
    return this.friendshipService.getActivityFeed(userId);
  }
}
