import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTourServiceDto } from './create-tour.dto.js';

export class UpdateTourServiceDto extends PartialType(
  OmitType(CreateTourServiceDto, ['service'] as const),
) {}