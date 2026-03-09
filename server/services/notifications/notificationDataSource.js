const pgSource = require('./notificationPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  createNotificationRule: (...args) => getSource().createNotificationRule(...args),
  deleteNotificationRule: (...args) => getSource().deleteNotificationRule(...args),
  findTelegramLinkCode: (...args) => getSource().findTelegramLinkCode(...args),
  getNotificationRule: (...args) => getSource().getNotificationRule(...args),
  getNotificationRules: (...args) => getSource().getNotificationRules(...args),
  getNotifications: (...args) => getSource().getNotifications(...args),
  getRequestedSource,
  getRoleNotificationSubscriptions: (...args) => getSource().getRoleNotificationSubscriptions(...args),
  getUserById: (...args) => getSource().getUserById(...args),
  getUserByTelegramChatId: (...args) => getSource().getUserByTelegramChatId(...args),
  getUserNotificationSettings: (...args) => getSource().getUserNotificationSettings(...args),
  getUserNotificationSubscriptions: (...args) => getSource().getUserNotificationSubscriptions(...args),
  generateTelegramLinkCode: (...args) => getSource().generateTelegramLinkCode(...args),
  markNotificationAsRead: (...args) => getSource().markNotificationAsRead(...args),
  markTelegramLinkCodeUsed: (...args) => getSource().markTelegramLinkCodeUsed(...args),
  saveTelegramBinding: (...args) => getSource().saveTelegramBinding(...args),
  saveUserNotificationSettings: (...args) => getSource().saveUserNotificationSettings(...args),
  saveUserNotificationSubscription: (...args) => getSource().saveUserNotificationSubscription(...args),
  unlinkTelegramByChatId: (...args) => getSource().unlinkTelegramByChatId(...args),
  updateNotificationRule: (...args) => getSource().updateNotificationRule(...args),
};
