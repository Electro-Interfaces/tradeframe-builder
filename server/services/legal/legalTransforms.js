const LEGAL_DOCUMENT_TYPES = ['tos', 'privacy', 'pdn'];

function isLegalDocumentType(value) {
  return LEGAL_DOCUMENT_TYPES.includes(String(value || ''));
}

function normalizeDocumentVersion(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    doc_type_id: row.doc_type_id,
    doc_type_code: row.doc_type_code,
    version: row.version,
    status: row.status,
    title: row.title || '',
    content_html: row.content_html || '',
    content_md: row.content_md || '',
    checksum: row.checksum || '',
    changelog: row.changelog || '',
    locale: row.locale || 'ru',
    is_current: Boolean(row.is_current),
    editor_id: row.editor_id || '',
    editor_name: row.editor_name || '',
    published_at: row.published_at || undefined,
    archived_at: row.archived_at || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeDocumentType(row, currentVersion) {
  return {
    code: row.code,
    title: row.title,
    current_version: currentVersion ? normalizeDocumentVersion(currentVersion) : undefined,
  };
}

function normalizeAcceptance(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name || row.name || 'Пользователь',
    user_email: row.user_email || row.email || '',
    doc_version_id: row.doc_version_id,
    doc_type_code: row.doc_type_code,
    doc_version: row.doc_version || '',
    accepted_at: row.accepted_at,
    ip_address: row.ip_address || '',
    user_agent: row.user_agent || '',
    source: row.source || 'web',
    immutable: true,
    created_at: row.created_at,
  };
}

function normalizeUserLegalStatus(row) {
  if (!row) {
    return null;
  }

  return {
    user_id: row.user_id,
    tos_version_id: row.tos_version_id || undefined,
    privacy_version_id: row.privacy_version_id || undefined,
    pdn_version_id: row.pdn_version_id || undefined,
    tos_accepted_at: row.tos_accepted_at || undefined,
    privacy_accepted_at: row.privacy_accepted_at || undefined,
    pdn_accepted_at: row.pdn_accepted_at || undefined,
    requires_consent: row.requires_consent !== false,
    updated_at: row.updated_at,
  };
}

function buildCurrentVersionsMap(versions) {
  return (versions || []).reduce((accumulator, item) => {
    if (item?.doc_type_code) {
      accumulator[item.doc_type_code] = normalizeDocumentVersion(item);
    }
    return accumulator;
  }, {});
}

function buildUserConsentRequirement(userId, statusRow, versions) {
  const status = normalizeUserLegalStatus(statusRow);
  const currentVersionsByType = buildCurrentVersionsMap(versions);
  const pendingDocuments = [];
  const currentAcceptances = [];

  LEGAL_DOCUMENT_TYPES.forEach((docType) => {
    const currentVersion = currentVersionsByType[docType];
    if (!currentVersion) {
      return;
    }

    const versionField = `${docType}_version_id`;
    const acceptedAtField = `${docType}_accepted_at`;
    const acceptedVersionId = status?.[versionField];
    const hasAcceptance = acceptedVersionId === currentVersion.id;

    if (!hasAcceptance) {
      pendingDocuments.push({
        type: docType,
        version_id: currentVersion.id,
        version: currentVersion.version,
        title: currentVersion.title || currentVersion.doc_type_code,
      });
    }

    currentAcceptances.push({
      type: docType,
      version_id: acceptedVersionId || undefined,
      version: hasAcceptance ? currentVersion.version : undefined,
      accepted_at: status?.[acceptedAtField] || undefined,
    });
  });

  return {
    user_id: userId,
    requires_consent: pendingDocuments.length > 0,
    pending_documents: pendingDocuments,
    current_acceptances: currentAcceptances,
  };
}

module.exports = {
  LEGAL_DOCUMENT_TYPES,
  buildCurrentVersionsMap,
  buildUserConsentRequirement,
  isLegalDocumentType,
  normalizeAcceptance,
  normalizeDocumentType,
  normalizeDocumentVersion,
  normalizeUserLegalStatus,
};
