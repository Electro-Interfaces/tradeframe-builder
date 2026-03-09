const authDataSource = require('../services/auth/authDataSource');
const tokenService = require('../services/auth/tokenService');

async function resolveUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = tokenService.verifyAccessToken(token);
  const user = await authDataSource.getAppUserById(payload.sub);

  if (!user) {
    throw new Error('Пользователь не найден или недоступен');
  }

  req.auth = payload;
  req.user = user;
  return user;
}

async function requireAuth(req, res, next) {
  if (!(req.headers.authorization || '').startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    await resolveUserFromRequest(req);
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Невалидный токен' });
  }
}

async function tryAuth(req, res, next) {
  try {
    await resolveUserFromRequest(req);
  } catch {
    // optional auth
  }

  return next();
}

module.exports = {
  requireAuth,
  tryAuth,
};
