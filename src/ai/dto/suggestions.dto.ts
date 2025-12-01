import { ApiProperty } from '@nestjs/swagger';

export class SmartSuggestionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  suggestionType: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ isArray: true })
  serviceIds: number[];

  @ApiProperty()
  reasoning?: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  validUntil: Date;

  @ApiProperty({ description: 'Services included in this suggestion' })
  services?: any[];
}
