const auditPgSource = require('./auditPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return auditPgSource;
}

module.exports = {
  cleanOldAuditLogs: (...args) => getSource().cleanOldAuditLogs(...args),
  createAuditLog: (...args) => getSource().createAuditLog(...args),
  getAuditLogById: (...args) => getSource().getAuditLogById(...args),
  getAuditLogStatistics: (...args) => getSource().getAuditLogStatistics(...args),
  getAuditLogs: (...args) => getSource().getAuditLogs(...args),
  getRecentAuditLogs: (...args) => getSource().getRecentAuditLogs(...args),
  getRequestedSource,
};
