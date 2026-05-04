/**
 * Middleware проверки прав на работу с документами корректировки остатков (inventory).
 * Действия: read | write | send.
 * super_admin / system_admin — полный доступ без проверки permissions.
 */

const SUPER_ADMIN_ROLES = new Set(['super_admin', 'system_admin']);

function getRoleCodes(user) {
  const codes = new Set();
  if (user?.role) codes.add(user.role);
  if (Array.isArray(user?.roles)) {
    for (const role of user.roles) {
      if (role?.roleCode) codes.add(role.roleCode);
    }
  }
  return codes;
}

function hasInventoryPermission(user, action) {
  if (!user) return false;

  const roleCodes = getRoleCodes(user);
  for (const code of roleCodes) {
    if (SUPER_ADMIN_ROLES.has(code)) return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.some((permission) => {
    if (permission?.section !== 'inventory') return false;
    const actions = Array.isArray(permission.actions) ? permission.actions : [];
    return actions.includes(action) || actions.includes('manage');
  });
}

function requireInventoryPermission(action) {
  return function (req, res, next) {
    if (!hasInventoryPermission(req.user, action)) {
      return res.status(403).json({
        error: `Недостаточно прав для операции inventory.${action}`,
      });
    }
    return next();
  };
}

module.exports = {
  hasInventoryPermission,
  requireInventoryPermission,
};
