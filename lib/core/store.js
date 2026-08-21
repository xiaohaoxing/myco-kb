// node:sqlite 封装（ADR-010 B：文件为唯一事实源，sqlite 只做增量缓存/持久状态）
// 表：
//   events  变更事件日志（append-only）：id/at/packageId/rel/kind/contractId/before/after/bump
//   stale   stale 注册表（受影响待确认节点）：node/packageId/rel/at/reason/eventId
//   hashes  文件内容 hash 缓存（变更检测基准）：rel/hash
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export class MycoStore {
  constructor(dataDir) {
    this.dbPath = join(dataDir, 'state.db')
    mkdirSync(dirname(this.dbPath), { recursive: true })
    this.db = new DatabaseSync(this.dbPath)
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.migrate()
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        packageId TEXT NOT NULL,
        rel TEXT NOT NULL,
        kind TEXT NOT NULL,
        contractId TEXT,
        before TEXT,
        after TEXT,
        bump TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stale (
        node TEXT PRIMARY KEY,
        packageId TEXT NOT NULL,
        rel TEXT NOT NULL,
        at TEXT NOT NULL,
        reason TEXT NOT NULL,
        eventId INTEGER
      );
      CREATE TABLE IF NOT EXISTS hashes (
        rel TEXT PRIMARY KEY,
        hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS drafts (
        node TEXT PRIMARY KEY,
        packageId TEXT NOT NULL,
        rel TEXT NOT NULL,
        eventId INTEGER,
        prompt TEXT,
        draft TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        at TEXT NOT NULL
      );
    `)
  }

  // ---- events ----
  appendEvent(evt) {
    const info = this.db.prepare(
      'INSERT INTO events (at, packageId, rel, kind, contractId, before, after, bump) VALUES (?,?,?,?,?,?,?,?)',
    ).run(evt.at, evt.packageId, evt.rel, evt.kind, evt.contractId ?? null, evt.before ?? null, evt.after ?? null, evt.bump)
    return Number(info.lastInsertRowid)
  }

  listEvents(limit = 50) {
    return this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit)
  }

  // ---- stale ----
  markStale(node, { packageId, rel, reason, eventId }) {
    this.db.prepare(
      'INSERT OR REPLACE INTO stale (node, packageId, rel, at, reason, eventId) VALUES (?,?,?,?,?,?)',
    ).run(node, packageId, rel, new Date().toISOString(), reason, eventId ?? null)
  }

  clearStale(node) {
    this.db.prepare('DELETE FROM stale WHERE node = ?').run(node)
  }

  listStale() {
    return this.db.prepare('SELECT * FROM stale ORDER BY at DESC').all()
  }

  // ---- hashes（变更检测基准）----
  getHashes() {
    const rows = this.db.prepare('SELECT rel, hash FROM hashes').all()
    return new Map(rows.map((r) => [r.rel, r.hash]))
  }

  setHash(rel, hash) {
    this.db.prepare('INSERT OR REPLACE INTO hashes (rel, hash) VALUES (?,?)').run(rel, hash)
  }

  // ---- drafts（subagent 起草结果）----
  saveDraft(node, { packageId, rel, eventId, prompt, draft, status = 'pending', error = null }) {
    this.db.prepare(
      'INSERT OR REPLACE INTO drafts (node, packageId, rel, eventId, prompt, draft, status, error, at) VALUES (?,?,?,?,?,?,?,?,?)',
    ).run(node, packageId, rel, eventId ?? null, prompt ?? null, draft ?? null, status, error, new Date().toISOString())
  }

  listDrafts() {
    return this.db.prepare('SELECT * FROM drafts ORDER BY at DESC').all()
  }

  clearDraft(node) {
    this.db.prepare('DELETE FROM drafts WHERE node = ?').run(node)
  }

  close() {
    try { this.db.close() } catch { /* ignore */ }
  }
}
