import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateReviewDto {
  @ApiProperty({
    description: 'Whether to publish or unpublish the review',
    example: false,
  })
  @IsBoolean()
  isPublished: boolean;

  @ApiPropertyOptional({
    description: 'Reason for moderation action',
    example: 'Contains inappropriate language',
  })
  @IsString()
  @IsOptional()
  moderationReason?: string;
}
