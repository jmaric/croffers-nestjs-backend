import {
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GroupParticipant {
  @ApiProperty({ description: 'Participant name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Participant email', example: 'john@example.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'Participant phone', example: '+385912345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateGroupBookingDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({ description: 'Booking date', example: '2025-12-15' })
  @IsDateString()
  serviceDate: string;

  @ApiProperty({ description: 'Group size', minimum: 10, example: 15 })
  @IsInt()
  @Min(10)
  @Type(() => Number)
  groupSize: number;

  @ApiProperty({ description: 'Group coordinator name', example: 'Jane Smith' })
  @IsString()
  groupCoordinator: string;

  @ApiPropertyOptional({
    description: 'List of participants',
    type: [GroupParticipant],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupParticipant)
  participants?: GroupParticipant[];

  @ApiPropertyOptional({
    description: 'Special requirements or notes',
    example: 'Vegetarian meals needed for 5 people',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GroupBookingQuoteDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({ description: 'Group size', minimum: 10, example: 15 })
  @IsInt()
  @Min(10)
  @Type(() => Number)
  groupSize: number;

  @ApiPropertyOptional({ description: 'Booking date', example: '2025-12-15' })
  @IsOptional()
  @IsDateString()
  serviceDate?: string;
}

export class GroupBookingQuoteResponseDto {
  @ApiProperty({ description: 'Service name', example: 'Hvar Island Villa' })
  serviceName: string;

  @ApiProperty({ description: 'Regular price per person', example: 100 })
  regularPricePerPerson: number;

  @ApiProperty({ description: 'Group size', example: 15 })
  groupSize: number;

  @ApiProperty({ description: 'Discount percentage', example: 15 })
  discountPercentage: number;

  @ApiProperty({ description: 'Discounted price per person', example: 85 })
  discountedPricePerPerson: number;

  @ApiProperty({ description: 'Total regular price', example: 1500 })
  totalRegularPrice: number;

  @ApiProperty({ description: 'Total discounted price', example: 1275 })
  totalDiscountedPrice: number;

  @ApiProperty({ description: 'Total savings', example: 225 })
  totalSavings: number;

  @ApiProperty({ description: 'Currency', example: 'EUR' })
  currency: string;
}
