import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateSupportTicketDto {
  @ApiProperty({
    description: 'Ticket subject',
    example: 'Payment issue with booking #123',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'Customer reports payment failed but booking was created...',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Ticket priority',
    enum: TicketPriority,
    example: TicketPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Category',
    example: 'billing',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

export class AddTicketMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'I have checked the Stripe dashboard and...',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Attachment URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
  })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class SupportTicketMessageResponseDto {
  @ApiProperty({ description: 'Message ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'User ID who sent message', example: 5 })
  userId?: number;

  @ApiProperty({
    description: 'Message content',
    example: 'Thank you for contacting support...',
  })
  message: string;

  @ApiProperty({ description: 'Is internal note', example: false })
  isInternal: boolean;

  @ApiProperty({ description: 'Attachments', type: [String] })
  attachments: string[];

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class SupportTicketResponseDto {
  @ApiProperty({ description: 'Ticket ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Supplier ID', example: 1 })
  supplierId: number;

  @ApiProperty({
    description: 'Subject',
    example: 'Payment issue with booking #123',
  })
  subject: string;

  @ApiProperty({
    description: 'Description',
    example: 'Customer reports payment failed...',
  })
  description: string;

  @ApiProperty({
    description: 'Status',
    enum: TicketStatus,
    example: TicketStatus.OPEN,
  })
  status: string;

  @ApiProperty({
    description: 'Priority',
    enum: TicketPriority,
    example: TicketPriority.NORMAL,
  })
  priority: string;

  @ApiProperty({ description: 'Category', example: 'billing' })
  category?: string;

  @ApiProperty({ description: 'Is priority support', example: false })
  isPriority: boolean;

  @ApiProperty({ description: 'Assigned to admin ID', example: 10 })
  assignedTo?: number;

  @ApiProperty({ description: 'Resolved at' })
  resolvedAt?: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Messages',
    type: [SupportTicketMessageResponseDto],
  })
  messages?: SupportTicketMessageResponseDto[];
}
