import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateItineraryDto,
  UpdateItineraryDto,
  GenerateItineraryDto,
  QueryItinerariesDto,
} from './dto/index.js';
import { Prisma } from '../../generated/prisma/client/client.js';

@Injectable()
export class ItinerariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(userId: number, dto: CreateItineraryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const itinerary = await this.prisma.tripItinerary.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        startDate,
        endDate,
        totalBudget: dto.totalBudget
          ? new Prisma.Decimal(dto.totalBudget)
          : null,
        currency: dto.currency || 'EUR',
        isPublic: dto.isPublic || false,
        isAIGenerated: false,
        data: dto.data || {},
      },
    });

    return itinerary;
  }

  async findAll(userId: number, query: QueryItinerariesDto) {
    const { publicOnly, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = publicOnly ? { isPublic: true } : { userId };

    const [itineraries, total] = await Promise.all([
      this.prisma.tripItinerary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.tripItinerary.count({ where }),
    ]);

    return {
      data: itineraries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId?: number) {
    const itinerary = await this.prisma.tripItinerary.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException(`Itinerary with ID ${id} not found`);
    }

    // If userId is provided, check access (private itineraries)
    if (userId && !itinerary.isPublic && itinerary.userId !== userId) {
      throw new ForbiddenException('You do not have access to this itinerary');
    }

    return itinerary;
  }

  async update(id: number, userId: number, dto: UpdateItineraryDto) {
    const itinerary = await this.prisma.tripItinerary.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!itinerary) {
      throw new NotFoundException(`Itinerary with ID ${id} not found`);
    }

    if (itinerary.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this itinerary',
      );
    }

    const updateData: any = {
      ...dto,
    };

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    if (dto.totalBudget !== undefined) {
      updateData.totalBudget = dto.totalBudget
        ? new Prisma.Decimal(dto.totalBudget)
        : null;
    }

    const updatedItinerary = await this.prisma.tripItinerary.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return updatedItinerary;
  }

  async remove(id: number, userId: number) {
    const itinerary = await this.prisma.tripItinerary.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!itinerary) {
      throw new NotFoundException(`Itinerary with ID ${id} not found`);
    }

    if (itinerary.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this itinerary',
      );
    }

    await this.prisma.tripItinerary.delete({
      where: { id },
    });

    return { message: 'Itinerary deleted successfully' };
  }

  // ============================================
  // AI-POWERED TRIP GENERATION
  // ============================================

  async generateWithAI(userId: number, dto: GenerateItineraryDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Generate AI-powered itinerary
    const aiData = await this.generateAIItinerary(dto, days);

    // Create itinerary with AI-generated data
    const itinerary = await this.prisma.tripItinerary.create({
      data: {
        userId,
        name: aiData.name,
        description: aiData.description,
        startDate,
        endDate,
        totalBudget: dto.totalBudget
          ? new Prisma.Decimal(dto.totalBudget)
          : null,
        currency: 'EUR',
        isPublic: false,
        isAIGenerated: true,
        data: aiData.data,
      },
    });

    return itinerary;
  }

  private async generateAIItinerary(
    dto: GenerateItineraryDto,
    days: number,
  ): Promise<any> {
    // Check if AI API key is configured
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!anthropicKey && !openaiKey) {
      // Fallback to template-based generation
      return this.generateTemplateItinerary(dto, days);
    }

    try {
      // Try Anthropic Claude first if available
      if (anthropicKey) {
        return await this.generateWithClaude(dto, days, anthropicKey);
      }

      // Fallback to OpenAI if available
      if (openaiKey) {
        return await this.generateWithOpenAI(dto, days, openaiKey);
      }
    } catch (error) {
      console.error('AI generation failed, using template:', error);
      // Fallback to template if AI fails
      return this.generateTemplateItinerary(dto, days);
    }

    // Final fallback
    return this.generateTemplateItinerary(dto, days);
  }

  private async generateWithClaude(
    dto: GenerateItineraryDto,
    days: number,
    apiKey: string,
  ): Promise<any> {
    const prompt = this.buildPrompt(dto, days);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private async generateWithOpenAI(
    dto: GenerateItineraryDto,
    days: number,
    apiKey: string,
  ): Promise<any> {
    const prompt = this.buildPrompt(dto, days);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a travel planning expert. Generate detailed trip itineraries in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private buildPrompt(dto: GenerateItineraryDto, days: number): string {
    const preferencesText = dto.preferences?.length
      ? `Preferences: ${dto.preferences.join(', ')}`
      : '';
    const budgetText = dto.totalBudget
      ? `Budget: €${dto.totalBudget}`
      : 'Moderate budget';
    const travelersText = dto.travelers
      ? `${dto.travelers} traveler(s)`
      : '1 traveler';
    const notesText = dto.notes ? `Special notes: ${dto.notes}` : '';

    return `Create a detailed ${days}-day trip itinerary for ${dto.destination}.

Trip Details:
- Destination: ${dto.destination}
- Duration: ${days} days (${dto.startDate} to ${dto.endDate})
- ${travelersText}
- ${budgetText}
${preferencesText ? `- ${preferencesText}` : ''}
${notesText ? `- ${notesText}` : ''}

Generate a JSON response with this exact structure:
{
  "name": "Trip name",
  "description": "Brief trip description",
  "data": {
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "title": "Day title",
        "activities": [
          {
            "time": "HH:MM",
            "title": "Activity title",
            "description": "Activity description",
            "location": "Location name",
            "duration": "Duration in hours",
            "estimatedCost": "Cost in EUR",
            "category": "accommodation/dining/activity/transport"
          }
        ],
        "highlights": ["Highlight 1", "Highlight 2"],
        "estimatedBudget": "Daily budget"
      }
    ],
    "tips": ["Tip 1", "Tip 2"],
    "packingList": ["Item 1", "Item 2"],
    "estimatedTotalCost": "Total cost estimate"
  }
}

Make the itinerary detailed, realistic, and tailored to the preferences. Include specific times, locations, and activities for each day.`;
  }

  private generateTemplateItinerary(
    dto: GenerateItineraryDto,
    days: number,
  ): any {
    const dayTemplates: any[] = [];
    const startDate = new Date(dto.startDate);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      dayTemplates.push({
        day: i + 1,
        date: dateString,
        title: `Day ${i + 1} in ${dto.destination}`,
        activities: [
          {
            time: '09:00',
            title: 'Breakfast',
            description: 'Start your day with a local breakfast',
            location: dto.destination,
            duration: '1 hour',
            estimatedCost: '15',
            category: 'dining',
          },
          {
            time: '10:30',
            title: 'Explore Local Attractions',
            description: 'Visit popular sights and landmarks in the area',
            location: dto.destination,
            duration: '3 hours',
            estimatedCost: '30',
            category: 'activity',
          },
          {
            time: '13:30',
            title: 'Lunch',
            description: 'Try local cuisine at a recommended restaurant',
            location: dto.destination,
            duration: '1.5 hours',
            estimatedCost: '25',
            category: 'dining',
          },
          {
            time: '15:30',
            title: 'Afternoon Activity',
            description: 'Engage in recreational activities or relax',
            location: dto.destination,
            duration: '2 hours',
            estimatedCost: '20',
            category: 'activity',
          },
          {
            time: '19:00',
            title: 'Dinner',
            description: 'Enjoy dinner at a local restaurant',
            location: dto.destination,
            duration: '2 hours',
            estimatedCost: '35',
            category: 'dining',
          },
        ],
        highlights: [
          'Experience local culture',
          'Try authentic cuisine',
          'Visit popular attractions',
        ],
        estimatedBudget: '125',
      });
    }

    return {
      name: `${days}-Day Trip to ${dto.destination}`,
      description: `An exciting ${days}-day journey exploring ${dto.destination}`,
      data: {
        days: dayTemplates,
        tips: [
          'Book accommodations in advance',
          'Check local weather forecasts',
          'Learn basic local phrases',
          'Keep emergency contacts handy',
          'Try local transportation',
        ],
        packingList: [
          'Comfortable walking shoes',
          'Weather-appropriate clothing',
          'Travel documents and copies',
          'Camera or smartphone',
          'Portable charger',
          'First aid kit',
          'Sunscreen and hat',
          'Reusable water bottle',
        ],
        estimatedTotalCost: `${125 * days}`,
      },
    };
  }
}
