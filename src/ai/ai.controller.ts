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
import { RecommendationService } from './services/recommendation.service.js';
import { PersonalizationService } from './services/personalization.service.js';
import { ChatService } from './services/chat.service.js';
import { DynamicPricingService } from './services/dynamic-pricing.service.js';
import {
  GetRecommendationsDto,
  TrackInteractionDto,
  UpdatePreferencesDto,
  CreateAiChatDto,
  SendAiChatMessageDto,
} from './dto/index.js';

@ApiTags('AI & Personalization')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly personalizationService: PersonalizationService,
    private readonly chatService: ChatService,
    private readonly dynamicPricingService: DynamicPricingService,
  ) {}

  // =========================
  // Recommendations Endpoints
  // =========================

  @Post('recommendations')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get personalized recommendations',
    description:
      'AI-powered service recommendations based on preferences, behavior, and popularity',
  })
  async getRecommendations(
    @Body() dto: GetRecommendationsDto,
    @GetUser('id') userId: number,
  ) {
    return this.recommendationService.getRecommendations(dto, userId);
  }

  @Post('interactions')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Track user interaction',
    description:
      'Track user behavior (view, click, like, save, book) to improve recommendations',
  })
  async trackInteraction(
    @Body() dto: TrackInteractionDto,
    @GetUser('id') userId: number,
  ) {
    await this.recommendationService.trackInteraction(dto, userId);
    return { success: true };
  }

  // ============================
  // Personalization Endpoints
  // ============================

  @Get('preferences')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve saved travel preferences',
  })
  async getPreferences(@GetUser('id') userId: number) {
    return this.personalizationService.getPreferences(userId);
  }

  @Put('preferences')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user preferences',
    description:
      'Update travel preferences (styles, interests, budget, activity level)',
  })
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @GetUser('id') userId: number,
  ) {
    return this.personalizationService.updatePreferences(dto, userId);
  }

  @Get('suggestions')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get smart suggestions',
    description:
      'AI-generated smart suggestions (weekend getaway, similar to saved, trending nearby)',
  })
  async getSmartSuggestions(@GetUser('id') userId: number) {
    return this.personalizationService.getSmartSuggestions(userId);
  }

  @Post('suggestions/:id/viewed')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark suggestion as viewed',
  })
  async markSuggestionViewed(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    await this.personalizationService.markSuggestionViewed(id, userId);
    return { success: true };
  }

  @Post('suggestions/:id/clicked')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark suggestion as clicked',
  })
  async markSuggestionClicked(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    await this.personalizationService.markSuggestionClicked(id, userId);
    return { success: true };
  }

  @Delete('suggestions/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dismiss suggestion',
  })
  async dismissSuggestion(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    await this.personalizationService.dismissSuggestion(id, userId);
    return { success: true };
  }

  @Post('suggestions/generate')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate fresh suggestions',
    description: 'Trigger AI to generate new personalized suggestions',
  })
  async generateSuggestions(@GetUser('id') userId: number) {
    await this.personalizationService.generateSuggestions(userId);
    return { success: true };
  }

  // ======================
  // AI Chat Endpoints
  // ======================

  @Post('chat/conversations')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new AI chat conversation',
    description: 'Start a new conversation with AI travel assistant',
  })
  async createConversation(
    @Body() dto: CreateAiChatDto,
    @GetUser('id') userId: number,
  ) {
    return this.chatService.createConversation(dto, userId);
  }

  @Get('chat/conversations')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all conversations',
    description: 'List all chat conversations for user',
  })
  async getConversations(@GetUser('id') userId: number) {
    return this.chatService.getConversations(userId);
  }

  @Get('chat/conversations/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Retrieve a specific conversation with all messages',
  })
  async getConversation(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.chatService.getConversation(id, userId);
  }

  @Post('chat/conversations/:id/messages')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send message to AI',
    description: 'Send a message and receive AI response',
  })
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendAiChatMessageDto,
    @GetUser('id') userId: number,
  ) {
    return this.chatService.sendMessage(id, dto, userId);
  }

  @Delete('chat/conversations/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Delete a chat conversation and all its messages',
  })
  async deleteConversation(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.chatService.deleteConversation(id, userId);
  }

  // ===========================
  // Dynamic Pricing Endpoints
  // ===========================

  @Post('pricing/:serviceId/generate')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate pricing suggestions (Suppliers only)',
    description:
      'AI-powered dynamic pricing based on demand, seasonality, and crowd predictions',
  })
  async generatePricingSuggestions(
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @GetUser('id') userId: number,
  ) {
    // TODO: Add supplier verification
    return this.dynamicPricingService.generatePricingSuggestions(
      serviceId,
      userId,
    );
  }

  @Get('pricing/:serviceId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pricing suggestions (Suppliers only)',
  })
  async getPricingSuggestions(
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @GetUser('id') userId: number,
  ) {
    // TODO: Add supplier verification
    return this.dynamicPricingService.getPricingSuggestions(serviceId, userId);
  }

  @Post('pricing/:pricingId/apply')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Apply pricing suggestion (Suppliers only)',
    description: 'Apply AI-suggested price to service',
  })
  async applyPricingSuggestion(
    @Param('pricingId', ParseIntPipe) pricingId: number,
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @GetUser('id') userId: number,
  ) {
    // TODO: Add supplier verification
    return this.dynamicPricingService.applyPricingSuggestion(
      pricingId,
      serviceId,
      userId,
    );
  }
}
