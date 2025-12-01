import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateAiChatDto,
  SendAiChatMessageDto,
  ConversationResponseDto,
  ChatMessageResponseDto,
} from '../dto/index.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new conversation
   */
  async createConversation(
    dto: CreateAiChatDto,
    userId: number,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`Creating new conversation for user ${userId}`);

    const conversation = await this.prisma.chatConversation.create({
      data: {
        userId,
        context: dto.context || 'general',
        title: `New conversation`,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(conversation);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: number,
    userId: number,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.mapToResponseDto(conversation);
  }

  /**
   * Get all conversations for user
   */
  async getConversations(
    userId: number,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Only last message for preview
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    return conversations.map((c) => this.mapToResponseDto(c));
  }

  /**
   * Send a message in conversation
   */
  async sendMessage(
    conversationId: number,
    dto: SendAiChatMessageDto,
    userId: number,
  ): Promise<ChatMessageResponseDto> {
    this.logger.log(`User ${userId} sending message to conversation ${conversationId}`);

    // Verify conversation belongs to user
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
        attachments: dto.serviceIds
          ? { serviceIds: dto.serviceIds }
          : undefined,
      },
    });

    // Generate AI response
    const aiResponse = await this.generateAIResponse(
      dto.content,
      conversation.context,
      dto.serviceIds,
      userId,
    );

    // Create assistant message
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse,
        model: 'rule-based-v1', // Placeholder
      },
    });

    // Update conversation last message time
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      model: assistantMessage.model || undefined,
      tokens: assistantMessage.tokens || undefined,
      createdAt: assistantMessage.createdAt,
    };
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: number, userId: number) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Generate AI response (simplified version)
   * TODO: Integrate with OpenAI or other LLM API
   */
  private async generateAIResponse(
    userMessage: string,
    context: string | null,
    serviceIds: number[] | undefined,
    userId: number,
  ): Promise<string> {
    // This is a placeholder implementation
    // In production, you would call OpenAI API or similar

    const lowerMessage = userMessage.toLowerCase();

    // Booking help
    if (
      lowerMessage.includes('book') ||
      lowerMessage.includes('reservation')
    ) {
      return "I can help you with booking! To make a reservation, browse our services, select your preferred date and time, and click 'Book Now'. You can also save services to your favorites for later. Would you like me to show you some recommendations based on your preferences?";
    }

    // Recommendations
    if (
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('suggest') ||
      lowerMessage.includes('what should')
    ) {
      // Get user preferences
      const prefs = await this.prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (prefs && prefs.interests.length > 0) {
        return `Based on your interests in ${prefs.interests.join(', ')}, I'd recommend checking out our personalized recommendations page. You can also explore our trending services and smart suggestions tailored just for you!`;
      }

      return "I'd be happy to recommend something! First, let me understand your preferences better. What kind of activities are you interested in? (e.g., beaches, nightlife, cultural tours, adventure sports)";
    }

    // Pricing questions
    if (
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost') ||
      lowerMessage.includes('expensive')
    ) {
      return "Our prices vary depending on the service type, season, and availability. You can filter services by your budget range in your preferences. We also offer price alerts for premium subscribers - you'll get notified when prices drop for your saved services!";
    }

    // Location questions
    if (
      lowerMessage.includes('where') ||
      lowerMessage.includes('location') ||
      lowerMessage.includes('place')
    ) {
      return "We offer services across beautiful locations in Croatia and surrounding areas. You can browse by location, check crowd predictions to avoid busy times, and even discover hidden gems using our AI-powered suggestions. Which area are you interested in?";
    }

    // Support
    if (
      lowerMessage.includes('help') ||
      lowerMessage.includes('support') ||
      lowerMessage.includes('problem')
    ) {
      return "I'm here to help! You can:\n\n• Browse and book services\n• Get personalized recommendations\n• Manage your bookings and itineraries\n• Share your travel stories\n• Connect with other travelers\n\nWhat specific help do you need?";
    }

    // Default response
    return "Thanks for your message! I'm your AI travel assistant. I can help you find the perfect activities, accommodations, and experiences. I can also provide personalized recommendations based on your preferences. How can I assist you today?";
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(conversation: any): ConversationResponseDto {
    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      context: conversation.context,
      isActive: conversation.isActive,
      lastMessageAt: conversation.lastMessageAt,
      summary: conversation.summary,
      messages: conversation.messages
        ? conversation.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            model: m.model,
            tokens: m.tokens,
            createdAt: m.createdAt,
          }))
        : undefined,
      createdAt: conversation.createdAt,
    };
  }
}
