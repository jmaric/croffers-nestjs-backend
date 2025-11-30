import { IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterReviewDto {
  @ApiPropertyOptional({
    description: 'Filter by service ID',
    example: 1,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  serviceId?: number;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 1,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Filter by user ID (reviewer)',
    example: 1,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filter by positive (true) or negative (false) reviews',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  wouldStayAgain?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by publication status (default: true for published only)',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination (default: 1)',
    example: 1,
    minimum: 1,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page (default: 10)',
    example: 10,
    minimum: 1,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}