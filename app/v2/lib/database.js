const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const migrations = [
  {
    version: 1,
    file: '001_create_links.sql'
  }
];
const minimumSchemaVersion = 1;

function openDatabase(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA busy_timeout = 5000');
  return database;
}

function getSchemaVersion(database) {
  return database.prepare('PRAGMA user_version').get().user_version;
}

function assertDatabaseReady(database) {
  const currentVersion = getSchemaVersion(database);

  if (currentVersion < minimumSchemaVersion) {
    throw new Error(
      `Database schema version ${currentVersion} is too old (requires at least ${minimumSchemaVersion}); run the database migrations`
    );
  }
}

function migrateDatabase(databasePath) {
  const database = openDatabase(databasePath);

  try {
    const latestVersion = migrations.at(-1)?.version ?? 0;
    let migrationsApplied = 0;

    for (const migration of migrations) {
      if (migration.version <= getSchemaVersion(database)) {
        continue;
      }

      database.exec('BEGIN EXCLUSIVE');
      try {
        const lockedVersion = getSchemaVersion(database);
        if (migration.version <= lockedVersion) {
          database.exec('COMMIT');
          continue;
        }
        if (migration.version !== lockedVersion + 1) {
          throw new Error(
            `Cannot apply schema migration ${migration.version} after version ${lockedVersion}`
          );
        }

        const migrationSql = readFileSync(
          join(__dirname, '..', 'migrations', migration.file),
          'utf8'
        );
        database.exec(migrationSql);
        database.exec(`PRAGMA user_version = ${migration.version}`);
        database.exec('COMMIT');
        migrationsApplied += 1;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }

    return {
      schemaVersion: getSchemaVersion(database),
      migrationsApplied,
      latestVersion
    };
  } finally {
    database.close();
  }
}

module.exports = {
  assertDatabaseReady,
  migrateDatabase,
  openDatabase
};
