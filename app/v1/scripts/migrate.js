const { mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { migrateDatabase } = require('../lib/database');

const databasePath = resolve(
  process.env.DATABASE_PATH || './data/links.sqlite'
);

mkdirSync(dirname(databasePath), { recursive: true });
const result = migrateDatabase(databasePath);

if (result.schemaVersion > result.latestVersion) {
  console.warn(
    `Database schema version ${result.schemaVersion} is newer than this image's migrations; no migration was applied`
  );
} else {
  console.log(
    `Database schema version ${result.schemaVersion}; applied ${result.migrationsApplied} migration(s)`
  );
}
