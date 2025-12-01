import { SetMetadata } from '@nestjs/common';
import { SupplierAddonType } from '../../../generated/prisma/client/client.js';

export const RequireAddon = (addonType: SupplierAddonType) =>
  SetMetadata('requiredAddon', addonType);

export const ApiScope = (scope: string) => SetMetadata('apiScope', scope);
