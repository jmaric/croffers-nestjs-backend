import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BookFerryDto {
  @ApiProperty({
    description: 'Ferry schedule ID to book',
    example: 1,
  })
  @IsInt()
  @Min(1)
  ferryScheduleId: number;

  @ApiProperty({
    description: 'Number of adult passengers',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  adults: number;

  @ApiProperty({
    description: 'Number of children',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  children: number;

  @ApiProperty({
    description: 'Number of vehicles',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  vehicles: number;

  @ApiPropertyOptional({
    description: 'Special notes or requests',
    example: 'Need wheelchair accessibility',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
