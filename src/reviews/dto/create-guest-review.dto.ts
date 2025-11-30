import { IsNotEmpty, IsInt, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GuestReviewTag } from './review-tags.enum.js';

export class CreateGuestReviewDto {
  @ApiProperty({
    description: 'Booking ID for the completed booking being reviewed',
    example: 1,
    type: 'integer',
  })
  @IsInt()
  @IsNotEmpty()
  bookingId: number;

  @ApiProperty({
    description: 'Binary rating: true = 👍 would host again, false = 👎 would not host again',
    example: true,
    type: 'boolean',
  })
  @IsBoolean()
  @IsNotEmpty()
  wouldHostAgain: boolean;

  @ApiProperty({
    description: 'One required tag that describes the guest',
    example: 'Respectful guest',
    enum: GuestReviewTag,
    enumName: 'GuestReviewTag',
  })
  @IsEnum(GuestReviewTag)
  @IsNotEmpty()
  tag: GuestReviewTag;
}