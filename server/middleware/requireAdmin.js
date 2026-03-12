/**
 * Middleware для проверки административного доступа.
 * Извлечён из users.js для переиспользования в networks, tradingPoints, nomenclature, legal.
 */

/**
 * Проверяет, есть ли у пользователя административный доступ.
 * Проверяет роли: super_admin, system_admin, network_admin.
 * Проверяет permissions: section admin/networks + resource + manage/write.
 */
function hasAdminAccess(user) {
  if (!user) return false;

  const roleCodes = new Set([
    user.role,
    ...(Array.isArray(user.roles) ? user.roles.map((role) => role.roleCode) : []),
  ].filter(Boolean));

  if (['super_admin', 'system_admin', 'network_admin'].some((code) => roleCodes.has(code))) {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.some((permission) => {
    const actions = Array.isArray(permission?.actions) ? permission.actions : [];
    const canManage = actions.includes('manage') || actions.includes('write');

    return canManage && (
      permission.section === 'admin'
      || permission.section === 'networks'
      || permission.section === 'nomenclature'
    );
  });
}

/**
 * Middleware: требует админский доступ (403 если нет прав).
 * Использование: router.post('/', requireAdminAccess, handler)
 */
function requireAdminAccess(req, res, next) {
  if (!hasAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
  }

  return next();
}

module.exports = {
  hasAdminAccess,
  requireAdminAccess,
};
