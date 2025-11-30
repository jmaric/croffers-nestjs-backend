import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateActivityServiceDto } from './create-activity.dto.js';

export class UpdateActivityServiceDto extends PartialType(
  OmitType(CreateActivityServiceDto, ['service'] as const),
) {}