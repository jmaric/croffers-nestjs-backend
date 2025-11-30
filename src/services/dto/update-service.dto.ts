import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto.js';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ServiceStatus } from '../../../generated/prisma/client/client.js';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus;
}