'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.resolve(
  process.env.DB_PATH || path.join(__dirname, '..', 'data', 'techvn.db')
);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db = null;

function getDB() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");
  _db.exec("PRAGMA synchronous = NORMAL");
  _db.exec("PRAGMA cache_size = -32000");
  _db.exec("PRAGMA temp_store = MEMORY");
  return _db;
}

function migrate() {
  const db = getDB();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Parse statements: split on ; but skip comments and blanks
  const stmts = sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let ok = 0;
  for (const stmt of stmts) {
    try {
      db.exec(stmt);
      ok++;
    } catch (e) {
      // IF NOT EXISTS statements produce harmless errors on re-run
      if (!e.message.includes('already exists') &&
          !e.message.includes('no transaction')) {
        // Only warn on unexpected errors
        if (!stmt.startsWith('PRAGMA')) {
          console.warn('[Migration] Skip:', e.message.slice(0, 60));
        }
      }
    }
  }
  console.log(`[DB] Migration done: ${ok} statements`);
  return ok;
}

function all(sql, params = []) {
  return getDB().prepare(sql).all(...params);
}

function get(sql, params = []) {
  return getDB().prepare(sql).get(...params) || null;
}

function run(sql, params = []) {
  return getDB().prepare(sql).run(...params);
}

function transaction(fn) {
  const db = getDB();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    throw e;
  }
}

module.exports = { getDB, migrate, all, get, run, transaction };
