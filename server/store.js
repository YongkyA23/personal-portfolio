// Storage for the editable content document and the messages sent from the contact form.
// Two implementations share one shape: MySQL for production, memory for tests.
import mysql from 'mysql2/promise';

/**
 * @typedef {object} Store
 * @property {() => Promise<void>} init                 Create tables if missing.
 * @property {() => Promise<object|null>} getContent    The saved document, or null when none is saved.
 * @property {(doc: object) => Promise<void>} setContent
 * @property {(m: {name: string, contact: string, message: string}) => Promise<void>} addMessage
 * @property {() => Promise<Message[]>} listMessages  Newest first, at most 500.
 * @property {() => Promise<void>} close
 */

/** @typedef {{ at: string, name: string, contact: string, message: string }} Message */

const MAX_MESSAGES = 500;

/**
 * Wraps a one-time setup so it runs on first use and is retried after a failure.
 * This is what lets the server start while the database is still down.
 * @param {() => Promise<void>} init
 * @returns {() => Promise<void>}
 */
export function createLazyInit(init) {
  let ready = null;
  return () => {
    ready ??= init().catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  };
}

/** @returns {Store} */
export function createMemoryStore() {
  let content = null;
  const messages = [];
  return {
    async init() {},
    async getContent() {
      return content;
    },
    async setContent(doc) {
      content = structuredClone(doc);
    },
    async addMessage({ name, contact, message }) {
      messages.unshift({ at: new Date().toISOString(), name, contact, message });
      messages.length = Math.min(messages.length, MAX_MESSAGES);
    },
    async listMessages() {
      return messages.map((m) => ({ ...m }));
    },
    async close() {},
  };
}

/**
 * @param {string} databaseUrl mysql://user:password@host:3306/database
 * @returns {Store}
 */
export function createMysqlStore(databaseUrl) {
  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 5,
    waitForConnections: true,
    connectTimeout: 5000,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  const ensure = createLazyInit(async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS site_content (
           id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
           body JSON NOT NULL,
           updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
         ) CHARACTER SET utf8mb4`,
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS contact_messages (
           id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
           name VARCHAR(120) NOT NULL,
           contact VARCHAR(160) NOT NULL,
           message TEXT NOT NULL,
           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
         ) CHARACTER SET utf8mb4`,
      );
  });

  return {
    init: ensure,
    async getContent() {
      await ensure();
      const [rows] = await pool.query('SELECT body FROM site_content WHERE id = 1');
      if (rows.length === 0) return null;
      const body = rows[0].body;
      // MySQL returns JSON columns parsed; MariaDB (JSON is an alias of LONGTEXT) returns text.
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
    async setContent(doc) {
      await ensure();
      await pool.query(
        'INSERT INTO site_content (id, body) VALUES (1, ?) ON DUPLICATE KEY UPDATE body = VALUES(body)',
        [JSON.stringify(doc)],
      );
    },
    async addMessage({ name, contact, message }) {
      await ensure();
      await pool.query('INSERT INTO contact_messages (name, contact, message) VALUES (?, ?, ?)', [name, contact, message]);
    },
    async listMessages() {
      await ensure();
      const [rows] = await pool.query(`SELECT name, contact, message, created_at FROM contact_messages ORDER BY id DESC LIMIT ${MAX_MESSAGES}`);
      return rows.map((row) => ({ at: new Date(row.created_at).toISOString(), name: row.name, contact: row.contact, message: row.message }));
    },
    async close() {
      await pool.end();
    },
  };
}
