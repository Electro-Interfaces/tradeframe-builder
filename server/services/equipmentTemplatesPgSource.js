const postgres = require('../db/pool');

async function listTemplates() {
  const { rows } = await postgres.query(
    'SELECT * FROM equipment_templates ORDER BY name'
  );
  return rows;
}

async function getTemplateById(id) {
  return postgres.queryOne(
    'SELECT * FROM equipment_templates WHERE id = $1',
    [id]
  );
}

async function createTemplate(data) {
  const row = await postgres.queryOne(
    `INSERT INTO equipment_templates
       (name, technical_code, system_type, description, status, default_params, allow_component_template_ids)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[])
     RETURNING *`,
    [
      data.name,
      data.technical_code,
      data.system_type,
      data.description || null,
      data.status !== false,
      JSON.stringify(data.default_params || {}),
      data.allow_component_template_ids || [],
    ]
  );
  return row;
}

async function updateTemplate(id, data) {
  const fields = ['updated_at = now()'];
  const params = [id];

  if (data.name !== undefined) {
    params.push(data.name);
    fields.push(`name = $${params.length}`);
  }
  if (data.technical_code !== undefined) {
    params.push(data.technical_code);
    fields.push(`technical_code = $${params.length}`);
  }
  if (data.system_type !== undefined) {
    params.push(data.system_type);
    fields.push(`system_type = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description);
    fields.push(`description = $${params.length}`);
  }
  if (data.status !== undefined) {
    params.push(data.status);
    fields.push(`status = $${params.length}`);
  }
  if (data.default_params !== undefined) {
    params.push(JSON.stringify(data.default_params));
    fields.push(`default_params = $${params.length}::jsonb`);
  }
  if (data.allow_component_template_ids !== undefined) {
    params.push(data.allow_component_template_ids);
    fields.push(`allow_component_template_ids = $${params.length}::text[]`);
  }

  return postgres.queryOne(
    `UPDATE equipment_templates SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
}

async function deleteTemplate(id) {
  const result = await postgres.query(
    'DELETE FROM equipment_templates WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
}

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
