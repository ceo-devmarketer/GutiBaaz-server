import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('----------------------------------------');
console.log('DEBUG: Checking Environment Variables');
console.log('DATABASE_URL:', url ? `${url.substring(0, 10)}...` : 'UNDEFINED');
console.log('TURSO_AUTH_TOKEN:', authToken ? 'SET' : 'UNDEFINED');
console.log('All Env Keys:', Object.keys(process.env).join(', '));
console.log('----------------------------------------');

if (!url) {
  throw new Error('FATAL: DATABASE_URL is not defined in environment variables');
}

const libsql = createClient({
  url: url,
  authToken: authToken,
});

const adapter = new PrismaLibSQL(libsql as any);
const prisma = new PrismaClient({ adapter });

export default prisma;
