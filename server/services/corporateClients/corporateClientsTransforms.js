function normalizeCorporateClient(row) {
  return {
    id: String(row.id),
    networkId: String(row.network_id || row.networkId),
    networkName: row.network_name || row.networkName || '',
    name: row.name,
    inn: row.inn || undefined,
    contactPerson: row.contact_person || row.contactPerson || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    description: row.description || '',
    isActive: row.is_active != null ? row.is_active : (row.isActive ?? true),
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
    updatedAt: new Date(row.updated_at || row.updatedAt || row.created_at || Date.now()),
    createdBy: row.created_by || row.createdBy || undefined,
    updatedBy: row.updated_by || row.updatedBy || undefined,
  };
}

function buildCorporateClientRecord(input, actorUserId, options = {}) {
  return {
    network_id: input.networkId,
    name: String(input.name || '').trim(),
    inn: input.inn ? String(input.inn).trim() : null,
    contact_person: input.contactPerson ? String(input.contactPerson).trim() : null,
    phone: input.phone ? String(input.phone).trim() : null,
    email: input.email ? String(input.email).trim() : null,
    description: input.description || '',
    is_active: input.isActive != null ? !!input.isActive : true,
    created_by: options.includeCreatedBy ? (actorUserId || 'system') : undefined,
    updated_by: actorUserId || 'system',
  };
}

module.exports = {
  normalizeCorporateClient,
  buildCorporateClientRecord,
};
