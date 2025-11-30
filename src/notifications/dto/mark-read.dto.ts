import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'Mark as read (true) or unread (false)',
    example: true,
  })
  @IsBoolean()
  isRead: boolean;
}
