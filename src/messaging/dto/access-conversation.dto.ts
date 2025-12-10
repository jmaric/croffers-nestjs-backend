import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AccessConversationDto {
  @ApiProperty({
    description: 'Reason for accessing the conversation',
    example: 'Dispute Resolution - #123',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
