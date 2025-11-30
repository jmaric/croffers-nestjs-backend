import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../../../generated/prisma/client/client.js';

export class QueryFavoritesDto {
  @ApiProperty({
    description: 'Filter by service type',
    enum: ServiceType,
    required: false,
    example: ServiceType.ACCOMMODATION,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
