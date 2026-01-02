import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('DB Config:', { 
  url: url ? 'Set' : 'Unset', 
  authToken: authToken ? 'Set' : 'Unset',
  urlValue: url // Temporary log to see the value (be careful with secrets in prod, but needed for debug)
});

const libsql = createClient({
  url: url!,
  authToken: authToken,
});

const adapter = new PrismaLibSQL(libsql as any);
const prisma = new PrismaClient({ adapter });

export default prisma;
