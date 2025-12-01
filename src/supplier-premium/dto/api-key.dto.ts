import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsInt } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name for the API key',
    example: 'Production API',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Scopes/permissions for the API key',
    type: [String],
    example: ['bookings:read', 'services:read'],
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Rate limit (requests per hour)',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  rateLimit?: number;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Update name for the API key',
    example: 'Updated Production API',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Update scopes/permissions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Update rate limit',
    example: 2000,
  })
  @IsOptional()
  @IsInt()
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Activate or deactivate key',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API Key ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Key name', example: 'Production API' })
  name: string;

  @ApiProperty({ description: 'Last 4 characters of key', example: '****abc123' })
  keyPreview: string;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Last used at' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Expires at' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Request count', example: 245 })
  requestCount: number;

  @ApiProperty({ description: 'Rate limit (per hour)', example: 1000 })
  rateLimit: number;

  @ApiProperty({ description: 'Scopes', type: [String] })
  scopes: string[];

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: 'Full API key (only shown once)',
    example: 'sk_live_abc123def456',
  })
  apiKey: string;
}
