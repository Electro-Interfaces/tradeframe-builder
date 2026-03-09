const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function createPasswordHash(password, salt) {
  return crypto
    .createHash('sha256')
    .update(`${password}${salt}`, 'utf8')
    .digest('base64');
}

function isBcryptHash(hash) {
  return typeof hash === 'string' && /^\$2[aby]?\$/.test(hash);
}

function verifyPassword(password, salt, expectedHash) {
  if (!password || !expectedHash) {
    return false;
  }

  // Bcrypt-хеши мигрированные из Supabase — salt встроен в сам хеш
  if (isBcryptHash(expectedHash)) {
    return bcrypt.compareSync(password, expectedHash);
  }

  // SHA256+salt — новый формат
  if (!salt) {
    return false;
  }

  const actualHash = createPasswordHash(password, salt);
  const actualBuffer = Buffer.from(actualHash, 'utf8');
  const expectedBuffer = Buffer.from(expectedHash, 'utf8');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function generateSalt() {
  return crypto.randomBytes(18).toString('base64url').slice(0, 24);
}

module.exports = {
  createPasswordHash,
  isBcryptHash,
  verifyPassword,
  generateSalt,
};
