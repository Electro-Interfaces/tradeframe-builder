const pgSource = require('./messagingPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  createMessage: (...args) => getSource().createMessage(...args),
  createMessageRecipients: (...args) => getSource().createMessageRecipients(...args),
  deleteMessage: (...args) => getSource().deleteMessage(...args),
  getMessageById: (...args) => getSource().getMessageById(...args),
  getMessageStats: (...args) => getSource().getMessageStats(...args),
  getMessages: (...args) => getSource().getMessages(...args),
  getRecipientCandidates: (...args) => getSource().getRecipientCandidates(...args),
  getRequestedSource,
  updateMessage: (...args) => getSource().updateMessage(...args),
  updateRecipientStatus: (...args) => getSource().updateRecipientStatus(...args),
};
