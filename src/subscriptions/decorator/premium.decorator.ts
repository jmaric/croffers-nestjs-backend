import { SetMetadata } from '@nestjs/common';

export const RequirePremium = () => SetMetadata('requirePremium', true);
