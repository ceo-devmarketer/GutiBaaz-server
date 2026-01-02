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

// Based on error analysis, PrismaLibSQL might expect config object or the client instance is not being read correctly.
// Trying to pass the client instance is failing. 
// However, standard usage is passing the client. 
// Let's try to revert to standard usage but ensure we are using the correct import and version.
// Actually, let's try to pass the config object if the type error suggested it expects 'Config'.

const adapter = new PrismaLibSQL({
  url: url,
  authToken: authToken,
});
const prisma = new PrismaClient({ adapter });

export default prisma;
