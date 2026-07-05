/**
 * Тесты tokenService — целостность JWT (ядро авторизации).
 * Запуск: npm run test:server (node --test, без внешних зависимостей).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const tokenService = require('../services/auth/tokenService');

const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'unit@test.local' };

function b64url(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function signWith(secret, unsigned) {
  return crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
}

test('валидный токен верифицируется и возвращает payload', () => {
  const { token } = tokenService.createAccessToken(USER);
  const payload = tokenService.verifyAccessToken(token);
  assert.equal(payload.sub, USER.id);
  assert.equal(payload.email, USER.email);
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test('подделанный payload отклоняется', () => {
  const { token } = tokenService.createAccessToken(USER);
  const [header, , signature] = token.split('.');
  const forgedPayload = b64url({ sub: 'attacker', email: 'evil@x', exp: 9999999999 });
  assert.throws(
    () => tokenService.verifyAccessToken(`${header}.${forgedPayload}.${signature}`),
    /Невалидный токен/
  );
});

test('подделанная подпись отклоняется', () => {
  const { token } = tokenService.createAccessToken(USER);
  const [header, payload] = token.split('.');
  const forgedSignature = signWith('wrong-secret', `${header}.${payload}`);
  assert.throws(
    () => tokenService.verifyAccessToken(`${header}.${payload}.${forgedSignature}`),
    /Невалидный токен/
  );
});

test('alg:none в заголовке не обходит проверку (HMAC применяется всегда)', () => {
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const payload = b64url({ sub: USER.id, exp: 9999999999 });
  assert.throws(
    () => tokenService.verifyAccessToken(`${header}.${payload}.`),
    /Невалидный токен/
  );
});

test('истёкший токен отклоняется', () => {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub: USER.id, exp: Math.floor(Date.now() / 1000) - 10 });
  const unsigned = `${header}.${payload}`;
  const signature = signWith(process.env.JWT_SECRET, unsigned);
  assert.throws(
    () => tokenService.verifyAccessToken(`${unsigned}.${signature}`),
    /Токен истек/
  );
});

test('токен без exp отклоняется', () => {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub: USER.id });
  const unsigned = `${header}.${payload}`;
  const signature = signWith(process.env.JWT_SECRET, unsigned);
  assert.throws(() => tokenService.verifyAccessToken(`${unsigned}.${signature}`), /Токен истек/);
});

test('мусорные значения отклоняются', () => {
  assert.throws(() => tokenService.verifyAccessToken(''), /Токен не предоставлен/);
  assert.throws(() => tokenService.verifyAccessToken('a.b'), /Невалидный токен/);
  assert.throws(() => tokenService.verifyAccessToken('a.b.c.d'), /Невалидный токен/);
});
