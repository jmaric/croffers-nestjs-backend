import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateAiChatDto {
  @ApiProperty({
    description: 'Conversation context',
    enum: ['booking_help', 'recommendations', 'support', 'general'],
    example: 'recommendations',
    required: false,
  })
  @IsOptional()
  @IsString()
  context?: string;
}

export class SendAiChatMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Can you recommend beach activities in Hvar?',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Service IDs to reference in the chat',
    isArray: true,
    required: false,
  })
  @IsOptional()
  serviceIds?: number[];
}

export class ChatMessageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  role: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  model?: string;

  @ApiProperty()
  tokens?: number;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  context?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastMessageAt: Date;

  @ApiProperty()
  summary?: string;

  @ApiProperty({ isArray: true, type: ChatMessageResponseDto })
  messages?: ChatMessageResponseDto[];

  @ApiProperty()
  createdAt: Date;
}
