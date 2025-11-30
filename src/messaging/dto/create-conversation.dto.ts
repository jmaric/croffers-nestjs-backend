import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Supplier ID to start conversation with',
    example: 1,
  })
  @IsNumber()
  supplierId: number;

  @ApiPropertyOptional({
    description: 'Optional booking ID for context',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  bookingId?: number;
}
