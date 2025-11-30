import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTransportServiceDto } from './create-transport.dto.js';

export class UpdateTransportServiceDto extends PartialType(
  OmitType(CreateTransportServiceDto, ['service'] as const),
) {}