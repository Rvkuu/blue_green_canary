const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const {
  assertDatabaseReady,
  migrateDatabase,
  openDatabase
} = require('../lib/database');
const {
  createLink,
  getLinkByCode,
  incrementClickCount,
  listLinks
} = require('../lib/link-store');

let temporaryDirectory;
let databasePath;
let database;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'url-shortener-test-'));
  databasePath = join(temporaryDirectory, 'links.sqlite');
  migrateDatabase(databasePath);
  database = openDatabase(databasePath);
});

afterEach(() => {
  if (database) {
    database.close();
    database = undefined;
  }
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

test('creates and lists a link with an initial click count of zero', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });

  assert.deepEqual(getLinkByCode(database, 'Ab12Cd34'), {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com',
    clickCount: 0
  });
  assert.deepEqual(listLinks(database), [{
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com',
    clickCount: 0
  }]);
});

test('reports duplicate codes without replacing the existing link', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });

  assert.equal(createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://another.example'
  }), false);
  assert.equal(getLinkByCode(database, 'Ab12Cd34').destinationUrl, 'https://example.com');
});

test('enforces code length and non-negative click counts in the schema', () => {
  assert.throws(() => database.prepare(`
    INSERT INTO links (code, destination_url)
    VALUES (?, ?)
  `).run('short', 'https://example.com'));

  assert.throws(() => database.prepare(`
    INSERT INTO links (code, destination_url, click_count)
    VALUES (?, ?, ?)
  `).run('Ab12Cd34', 'https://example.com', -1));
});

test('increments clicks atomically for known codes and ignores unknown codes', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });

  assert.equal(incrementClickCount(database, 'Ab12Cd34'), 'https://example.com');
  assert.equal(incrementClickCount(database, 'missing1'), null);
  assert.equal(incrementClickCount(database, 'Ab12Cd34'), 'https://example.com');
  assert.equal(getLinkByCode(database, 'Ab12Cd34').clickCount, 2);
});

test('reapplying migrations preserves existing data', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });
  migrateDatabase(databasePath);

  assert.equal(database.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(getLinkByCode(database, 'Ab12Cd34').destinationUrl, 'https://example.com');
});

test('application startup requires the database migrations to be applied', () => {
  const unmigratedDatabase = openDatabase(':memory:');

  try {
    assert.throws(
      () => assertDatabaseReady(unmigratedDatabase),
      /run the database migrations/
    );
  } finally {
    unmigratedDatabase.close();
  }
});

test('v1 remains compatible with a newer additive schema during rollback', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });
  database.exec('ALTER TABLE links ADD COLUMN v2_metadata TEXT');
  database.exec('PRAGMA user_version = 2');

  assert.doesNotThrow(() => assertDatabaseReady(database));
  assert.deepEqual(migrateDatabase(databasePath), {
    schemaVersion: 2,
    migrationsApplied: 0,
    latestVersion: 1
  });
  assert.equal(getLinkByCode(database, 'Ab12Cd34').destinationUrl, 'https://example.com');
});

test('persists links and click counts after reopening the database', () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com'
  });
  incrementClickCount(database, 'Ab12Cd34');
  database.close();
  database = openDatabase(databasePath);

  assert.deepEqual(getLinkByCode(database, 'Ab12Cd34'), {
    code: 'Ab12Cd34',
    destinationUrl: 'https://example.com',
    clickCount: 1
  });
});
