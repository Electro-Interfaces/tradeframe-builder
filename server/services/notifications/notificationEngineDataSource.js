const notificationEnginePgSource = require('./notificationEnginePgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return notificationEnginePgSource;
}

module.exports = {
  createDeliveryLog: (...args) => getSource().createDeliveryLog(...args),
  createNotification: (...args) => getSource().createNotification(...args),
  deleteOldNotifications: (...args) => getSource().deleteOldNotifications(...args),
  findRecentNotification: (...args) => getSource().findRecentNotification(...args),
  getActiveRules: (...args) => getSource().getActiveRules(...args),
  getRecipients: (...args) => getSource().getRecipients(...args),
  incrementRuleNotifications: (...args) => getSource().incrementRuleNotifications(...args),
  markNotificationSent: (...args) => getSource().markNotificationSent(...args),
  touchRuleCheck: (...args) => getSource().touchRuleCheck(...args),
  getRequestedSource,
};
