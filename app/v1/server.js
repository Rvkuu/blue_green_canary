const { resolve } = require('node:path');
const { createApp } = require('./app');
const {
  assertDatabaseReady,
  openDatabase
} = require('./lib/database');

const port = Number(process.env.PORT || 3001);
const databasePath = resolve(process.env.DATABASE_PATH || './data/links.sqlite');
const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:8080';
const database = openDatabase(databasePath);

try {
  assertDatabaseReady(database);
  const app = createApp({ database, publicBaseUrl });
  const server = app.listen(port, () => {
    console.log(`v1 running on ${port}`);
  });

  function shutdown() {
    server.close(() => database.close());
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  database.close();
  throw error;
}
