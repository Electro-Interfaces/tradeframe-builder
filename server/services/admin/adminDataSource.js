const pgSource = require('./adminPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  getRequestedSource,
  getSource,
  assignRoleToUser: (input) => getSource().assignRoleToUser(input),
  createRole: (input) => getSource().createRole(input),
  createUser: (input) => getSource().createUser(input),
  deleteRole: (roleId) => getSource().deleteRole(roleId),
  getRoleByCode: (code, options) => getSource().getRoleByCode(code, options),
  getRoleById: (roleId, options) => getSource().getRoleById(roleId, options),
  getRoles: (options) => getSource().getRoles(options),
  getUserByEmail: (email, options) => getSource().getUserByEmail(email, options),
  getUserById: (userId, options) => getSource().getUserById(userId, options),
  getUserRoles: (userId) => getSource().getUserRoles(userId),
  getUsers: (options) => getSource().getUsers(options),
  getUsersWithRoles: (options) => getSource().getUsersWithRoles(options),
  purgeSoftDeletedUsers: () => getSource().purgeSoftDeletedUsers(),
  removeRoleFromUser: (input) => getSource().removeRoleFromUser(input),
  restoreUser: (userId) => getSource().restoreUser(userId),
  setUserPassword: (userId, newPassword) => getSource().setUserPassword(userId, newPassword),
  softDeleteUser: (userId) => getSource().softDeleteUser(userId),
  updateRole: (roleId, input) => getSource().updateRole(roleId, input),
  updateUser: (userId, input) => getSource().updateUser(userId, input),
};
