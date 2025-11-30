import { Module } from '@nestjs/common';
import { VersionController } from './controllers/version.controller.js';

@Module({
  controllers: [VersionController],
})
export class CommonModule {}
