function mapLink(row) {
  if (!row) {
    return null;
  }

  return {
    code: row.code,
    destinationUrl: row.destination_url,
    clickCount: row.click_count
  };
}

function createLink(database, { code, destinationUrl }) {
  const result = database.prepare(`
    INSERT INTO links (code, destination_url)
    VALUES (?, ?)
    ON CONFLICT(code) DO NOTHING
  `).run(code, destinationUrl);

  return result.changes === 1;
}

function getLinkByCode(database, code) {
  const row = database.prepare(`
    SELECT code, destination_url, click_count
    FROM links
    WHERE code = ?
  `).get(code);

  return mapLink(row);
}

function listLinks(database) {
  const rows = database.prepare(`
    SELECT code, destination_url, click_count
    FROM links
    ORDER BY code
  `).all();

  return rows.map(mapLink);
}

function incrementClickCount(database, code) {
  const row = database.prepare(`
    UPDATE links
    SET click_count = click_count + 1
    WHERE code = ?
    RETURNING destination_url
  `).get(code);

  return row ? row.destination_url : null;
}

module.exports = {
  createLink,
  getLinkByCode,
  incrementClickCount,
  listLinks
};
