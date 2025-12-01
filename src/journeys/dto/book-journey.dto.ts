import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class BookJourneyDto {
  @ApiPropertyOptional({
    description: 'Special notes or requests for the entire journey',
    example: 'Please arrange wheelchair accessibility for all segments',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Guest details for all travelers',
    example: {
      guests: [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  guestDetails?: any;

  @ApiProperty({
    description: 'Stripe payment method ID or payment details',
    example: 'pm_1234567890abcdef',
  })
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({
    description: 'Emergency contact information',
    example: { name: 'Emergency Contact', phone: '+385 91 123 4567' },
  })
  @IsOptional()
  @IsObject()
  emergencyContact?: any;
}
