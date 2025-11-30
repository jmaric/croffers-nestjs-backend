import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({
    description: 'Reason for cancellation (required)',
    example: 'Plans changed due to unexpected circumstances',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}