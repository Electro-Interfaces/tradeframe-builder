/**
 * Снапшот in-memory кэша на диск: кэш переживает рестарты процесса.
 *
 * Каждый деплой перезапускает backend и раньше обнулял кэш целиком —
 * все пользователи одновременно шли в медленный STS/MSTO с холодного
 * старта («после выкатки всё тормозит»). Теперь shutdown сохраняет
 * живые записи с их TTL, а старт восстанавливает их.
 *
 * Снапшот одноразовый (удаляется после загрузки) — устаревший файл
 * не может «воскреснуть» после падения процесса без сохранения.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function snapshotPath(name) {
  const port = process.env.PORT || '3001';
  return path.join(os.tmpdir(), `tradeframe-cache-${name}-${port}.json`);
}

function saveSnapshot(cache, name) {
  const file = snapshotPath(name);
  const tempFile = `${file}.${process.pid}.tmp`;
  try {
    const now = Date.now();
    const entries = [];
    for (const key of cache.keys()) {
      const expiresAt = cache.getTtl(key); // undefined — нет ключа, 0 — без TTL
      if (expiresAt === undefined) continue;
      if (expiresAt !== 0 && expiresAt <= now) continue;
      const value = cache.get(key);
      if (value === undefined) continue;
      entries.push({ key, value, expiresAt: expiresAt || 0 });
    }
    fs.writeFileSync(tempFile, JSON.stringify({ savedAt: now, entries }));
    try {
      fs.renameSync(tempFile, file);
    } catch (error) {
      if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
      try { fs.unlinkSync(file); } catch (unlinkError) {
        if (unlinkError.code !== 'ENOENT') throw unlinkError;
      }
      fs.renameSync(tempFile, file);
    }
    return entries.length;
  } catch (error) {
    console.error(`[CacheSnapshot] save ${name} failed:`, error.message);
    return -1;
  } finally {
    try { fs.unlinkSync(tempFile); } catch { /* файл уже переименован или не создан */ }
  }
}

function loadSnapshot(cache, name) {
  const file = snapshotPath(name);
  try {
    if (!fs.existsSync(file)) return 0;
    const { entries } = JSON.parse(fs.readFileSync(file, 'utf8'));
    const now = Date.now();
    let restored = 0;
    for (const entry of entries || []) {
      if (entry.expiresAt !== 0 && entry.expiresAt <= now) continue;
      const ttlSec = entry.expiresAt === 0 ? 0 : Math.ceil((entry.expiresAt - now) / 1000);
      try {
        cache.set(entry.key, entry.value, ttlSec);
        restored++;
      } catch {
        break; // maxKeys — восстановили сколько влезло
      }
    }
    return restored;
  } catch (error) {
    console.error(`[CacheSnapshot] load ${name} failed:`, error.message);
    return -1;
  } finally {
    try { fs.unlinkSync(file); } catch { /* нет файла */ }
  }
}

module.exports = { saveSnapshot, loadSnapshot };
