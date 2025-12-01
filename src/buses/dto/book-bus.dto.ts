import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsArray, Min } from 'class-validator';

export class BookBusDto {
  @ApiProperty({
    description: 'Bus schedule ID to book',
    example: 1,
  })
  @IsInt()
  @Min(1)
  busScheduleId: number;

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
    description: 'Number of seniors',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  seniors: number;

  @ApiPropertyOptional({
    description: 'Seat numbers to reserve (optional)',
    example: ['12A', '12B', '13A'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seatNumbers?: string[];

  @ApiPropertyOptional({
    description: 'Special notes or requests',
    example: 'Need assistance with luggage',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
