import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    // Optimized connection pool configuration
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Fail fast if connection cannot be established
      allowExitOnIdle: false, // Keep connections alive
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async enableShutdownHooks(app: any) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
