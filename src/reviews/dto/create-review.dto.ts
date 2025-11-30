import { IsNotEmpty, IsInt, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewTag } from './review-tags.enum.js';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking ID for the completed booking being reviewed',
    example: 1,
    type: 'integer',
  })
  @IsInt()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({
    description: 'Binary rating: true = 👍 would stay again, false = 👎 would not stay again',
    example: true,
    type: 'boolean',
  })
  @IsBoolean()
  @IsNotEmpty()
  wouldStayAgain: boolean;

  @ApiProperty({
    description: 'One required tag that describes the experience',
    example: 'Super clean',
    enum: ReviewTag,
    enumName: 'ReviewTag',
  })
  @IsEnum(ReviewTag)
  @IsNotEmpty()
  tag: ReviewTag;
}