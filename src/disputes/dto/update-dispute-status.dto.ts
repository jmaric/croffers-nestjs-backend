import { IsNotEmpty, IsEnum } from 'class-validator';
import { DisputeStatus } from '../../../generated/prisma/client/enums.js';

export class UpdateDisputeStatusDto {
  @IsNotEmpty()
  @IsEnum(DisputeStatus)
  status: DisputeStatus;
}
