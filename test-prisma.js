import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 20));

await prisma.$disconnect();
await pool.end();
