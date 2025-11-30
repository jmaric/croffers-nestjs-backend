import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAccommodationServiceDto } from './create-accommodation.dto.js';

export class UpdateAccommodationServiceDto extends PartialType(
  OmitType(CreateAccommodationServiceDto, ['service'] as const),
) {}