const pgSource = require('./legalPgSource');

function getRequestedSource() {
  return 'pg';
}

function getSource() {
  return pgSource;
}

module.exports = {
  acceptDocument: (...args) => getSource().acceptDocument(...args),
  createDocumentDraft: (...args) => getSource().createDocumentDraft(...args),
  getAcceptanceJournal: (...args) => getSource().getAcceptanceJournal(...args),
  getAuditLog: (...args) => getSource().getAuditLog(...args),
  getCurrentDocumentVersion: (...args) => getSource().getCurrentDocumentVersion(...args),
  getDocumentStatistics: (...args) => getSource().getDocumentStatistics(...args),
  getDocumentTypeInfo: (...args) => getSource().getDocumentTypeInfo(...args),
  getDocumentTypes: (...args) => getSource().getDocumentTypes(...args),
  getDocumentVersion: (...args) => getSource().getDocumentVersion(...args),
  getDocumentVersions: (...args) => getSource().getDocumentVersions(...args),
  getRequestedSource,
  getUserAcceptances: (...args) => getSource().getUserAcceptances(...args),
  getUserConsentRequirement: (...args) => getSource().getUserConsentRequirement(...args),
  publishDocumentVersion: (...args) => getSource().publishDocumentVersion(...args),
  updateDocumentVersion: (...args) => getSource().updateDocumentVersion(...args),
  updateUserLegalStatus: (...args) => getSource().updateUserLegalStatus(...args),
};
