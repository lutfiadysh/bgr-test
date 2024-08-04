var sqlite3 = require('sqlite3').verbose();
var mkdirp = require('mkdirp');
var crypto = require('crypto');

mkdirp.sync('./var/db');

var db = new sqlite3.Database('./var/db/bgrTestLutfi.db');

db.serialize(() => {

  db.prepare("CREATE TABLE IF NOT EXISTS users ( \
    id INTEGER PRIMARY KEY, \
    username TEXT UNIQUE, \
    email TEXT UNIQUE, \
    hashed_password BLOB, \
    salt BLOB, \
    role_id INTEGER NOT NULL, \
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, \
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP \
  )").run();

  db.prepare("CREATE TABLE IF NOT EXISTS products ( \
    id INTEGER PRIMARY KEY, \
    name TEXT NOT NULL, \
    description TEXT NOT NULL, \
    price INTEGER NOT NULL, \
    stock INTEGER NOT NULL, \
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, \
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP \
  )").run();

  db.prepare("CREATE TABLE IF NOT EXISTS roles ( \
    id INTEGER PRIMARY KEY, \
    name TEXT NOT NULL, \
    code TEXT NOT NULL UNIQUE, \
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, \
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP \
  )").run();

  db.prepare("CREATE TABLE IF NOT EXISTS cart ( \
    id INTEGER PRIMARY KEY, \
    product_id INTEGER NOT NULL, \
    qty INTEGER NOT NULL, \
    user_id INTEGER NOT NULL, \
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, \
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP \
  )").run();

  db.prepare(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        total INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        payment_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

  db.prepare(`
      CREATE TABLE IF NOT EXISTS payment_products (
        id INTEGER PRIMARY KEY,
        payment_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        total INTEGER NOT NULL,
        qty INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

  db.run(`INSERT OR IGNORE INTO roles (name, code) VALUES (?, ?)`, [
    'SUPERADMIN',
    'SDM',
  ]);

  db.run(`INSERT OR IGNORE INTO roles (name, code) VALUES (?, ?)`, [
    'ADMIN STOCK',
    'AST',
  ]);

  db.run(`INSERT OR IGNORE INTO roles (name, code) VALUES (?, ?)`, [
    'KASIR',
    'KSR',
  ]);

  var salt = crypto.randomBytes(16);
  db.run('INSERT OR IGNORE INTO users (username, hashed_password, salt, role_id, email) VALUES (?, ?, ?, ?, ?)', [
    'administrator',
    crypto.pbkdf2Sync('12345678', salt, 310000, 32, 'sha256'),
    salt,
    1,
    'administrator@google.dev'
  ]);

  db.run('INSERT OR IGNORE INTO users (username, hashed_password, salt, role_id, email) VALUES (?, ?, ?, ?, ?)', [
    'adminstock',
    crypto.pbkdf2Sync('12345678', salt, 310000, 32, 'sha256'),
    salt,
    2,
    'adminstock@google.dev'
  ]);

  db.run('INSERT OR IGNORE INTO users (username, hashed_password, salt, role_id, email) VALUES (?, ?, ?, ?, ?)', [
    'kasir',
    crypto.pbkdf2Sync('12345678', salt, 310000, 32, 'sha256'),
    salt,
    3,
    'kasir@google.dev'
  ]);
});

module.exports = db;