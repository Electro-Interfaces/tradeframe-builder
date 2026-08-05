/**
 * Тесты cacheSnapshot — персистентность кэша между рестартами.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';
process.env.PORT = '39999'; // изолированный файл снапшота для тестов

const NodeCache = require('../node_modules/node-cache');
const { saveSnapshot, loadSnapshot } = require('../services/cacheSnapshot');

const SNAPSHOT_FILE = path.join(os.tmpdir(), 'tradeframe-cache-unittest-39999.json');

test('save → load восстанавливает значения и остаточный TTL', () => {
  const src = new NodeCache({ stdTTL: 0, useClones: false });
  src.set('key-long', { rows: [1, 2, 3] }, 3600);
  src.set('key-forever', 'v', 0);

  const saved = saveSnapshot(src, 'unittest');
  assert.equal(saved, 2);
  assert.ok(fs.existsSync(SNAPSHOT_FILE));

  const dst = new NodeCache({ stdTTL: 0, useClones: false });
  const restored = loadSnapshot(dst, 'unittest');
  assert.equal(restored, 2);
  assert.deepEqual(dst.get('key-long'), { rows: [1, 2, 3] });
  assert.equal(dst.get('key-forever'), 'v');

  // Остаточный TTL близок к исходному
  const ttl = dst.getTtl('key-long');
  assert.ok(ttl > Date.now() + 3500 * 1000 && ttl <= Date.now() + 3600 * 1000);

  // Снапшот одноразовый — файл удалён
  assert.equal(fs.existsSync(SNAPSHOT_FILE), false);
});

test('протухшие записи не восстанавливаются', () => {
  const src = new NodeCache({ stdTTL: 0, useClones: false });
  src.set('fresh', 1, 3600);
  src.set('stale', 2, 3600);
  saveSnapshot(src, 'unittest');

  // Руками протухаем запись в файле
  const raw = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  raw.entries.find((e) => e.key === 'stale').expiresAt = Date.now() - 1000;
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(raw));

  const dst = new NodeCache({ stdTTL: 0, useClones: false });
  const restored = loadSnapshot(dst, 'unittest');
  assert.equal(restored, 1);
  assert.equal(dst.get('fresh'), 1);
  assert.equal(dst.get('stale'), undefined);
});

test('повторное сохранение атомарно заменяет предыдущий снапшот', () => {
  const src = new NodeCache({ stdTTL: 0, useClones: false });
  src.set('value', 'old', 3600);
  assert.equal(saveSnapshot(src, 'unittest'), 1);

  src.set('value', 'new', 3600);
  assert.equal(saveSnapshot(src, 'unittest'), 1);

  const dst = new NodeCache({ stdTTL: 0, useClones: false });
  assert.equal(loadSnapshot(dst, 'unittest'), 1);
  assert.equal(dst.get('value'), 'new');
});

test('нет файла — load возвращает 0 и не падает', () => {
  const dst = new NodeCache();
  assert.equal(loadSnapshot(dst, 'unittest'), 0);
});

test('битый файл — load возвращает -1 и удаляет его', () => {
  fs.writeFileSync(SNAPSHOT_FILE, 'не json');
  const dst = new NodeCache();
  assert.equal(loadSnapshot(dst, 'unittest'), -1);
  assert.equal(fs.existsSync(SNAPSHOT_FILE), false);
});
