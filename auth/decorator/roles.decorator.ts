import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client/client.js';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);