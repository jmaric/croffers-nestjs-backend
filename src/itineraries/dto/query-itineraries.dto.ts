import { IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryItinerariesDto {
  @ApiPropertyOptional({
    description: 'Filter by public itineraries only',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  publicOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
