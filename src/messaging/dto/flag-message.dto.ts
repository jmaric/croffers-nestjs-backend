import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FlagMessageDto {
  @ApiProperty({
    description: 'Reason for flagging the message',
    example: 'Off-platform payment request',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
