const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

async function main() {
  console.log('Initializing database...');

  try {
    // User Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar TEXT,
        balance REAL DEFAULT 0.0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created User table');

    // GameSession Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS GameSession (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'waiting',
        betAmount REAL NOT NULL,
        winnerId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Junction table for GameSession players
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _GameSessionToUser (
        A TEXT NOT NULL,
        B TEXT NOT NULL,
        FOREIGN KEY (A) REFERENCES GameSession(id) ON DELETE CASCADE,
        FOREIGN KEY (B) REFERENCES User(id) ON DELETE CASCADE,
        UNIQUE(A, B)
      );
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS _GameSessionToUser_B_index ON _GameSessionToUser(B);
    `);
    console.log('Created GameSession tables');

    // Transaction Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Transaction" (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE RESTRICT
      );
    `);
    console.log('Created Transaction table');

    // BotSettings Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS BotSettings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        difficulty TEXT DEFAULT 'medium',
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created BotSettings table');

    console.log('Database initialization completed successfully.');
  } catch (e) {
    console.error('Error initializing database:', e);
  } finally {
    client.close();
  }
}

main();
