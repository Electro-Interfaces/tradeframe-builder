const crypto = require('crypto');

const ACCESS_TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 8 * 60 * 60 * 1000);

function getTokenSecret() {
  const secret = process.env.JWT_SECRET || process.env.AUTH_TOKEN_SECRET;
  if (secret) {
    return secret;
  }

  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('JWT_SECRET не задан');
  }

  return 'tradeframe-dev-access-secret';
}

function encodeBase64Url(value) {
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signToken(unsignedToken) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(unsignedToken)
    .digest('base64url');
}

function createAccessToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000);
  const header = encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeBase64Url({
    sub: user.id,
    email: user.email,
    iat: issuedAt,
    exp: expiresAt,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = signToken(unsignedToken);

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

function verifyAccessToken(token) {
  if (!token) {
    throw new Error('Токен не предоставлен');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Невалидный токен');
  }

  const [header, payload, signature] = parts;
  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = signToken(unsignedToken);
  const providedSignature = Buffer.from(signature, 'utf8');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

  if (providedSignature.length !== expectedSignatureBuffer.length) {
    throw new Error('Невалидный токен');
  }

  if (!crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)) {
    throw new Error('Невалидный токен');
  }

  const decodedPayload = decodeBase64Url(payload);
  if (!decodedPayload.exp || decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Токен истек');
  }

  return decodedPayload;
}

function getAccessTokenTtlMs() {
  return ACCESS_TOKEN_TTL_MS;
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  getAccessTokenTtlMs,
};
