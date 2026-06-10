/**
 * Интеграционный тест мультитенантной изоляции базы знаний (kbService) на эфемерном Postgres.
 * Сценарий: компания ГИГ = сети {ГИГ, БТО}; отдельная компания Acme. Проверяем, что пользователь
 * ГИГ видит ГИГ+БТО, но НЕ Acme — во всех путях (дерево, статья, поиск, контакты), а super видит всё.
 *
 * Запуск: DATABASE_URL=<ephemeral> node scripts/js/test-kb-isolation.cjs (после migrate).
 */
const pool = require('../../server/db/pool');
const kb = require('../../server/services/kbService');

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}
const q = (sql, params) => pool.query(sql, params);

async function main() {
  // ── сети ──
  const g1 = (await q(`INSERT INTO networks (name, code, external_id) VALUES ('ГИГ','gig','15') RETURNING id`)).rows[0].id;
  const b1 = (await q(`INSERT INTO networks (name, code, external_id) VALUES ('БТО','bto','3') RETURNING id`)).rows[0].id;
  const a1 = (await q(`INSERT INTO networks (name, code, external_id) VALUES ('Acme','acme','99') RETURNING id`)).rows[0].id;

  // ── компании (member_network_ids — JSONB-массив строк-UUID) ──
  await q(`INSERT INTO chat_matrix_companies (network_id, space_id, member_network_ids) VALUES ($1,'!s1',$2::jsonb)`, [g1, JSON.stringify([g1, b1])]);
  await q(`INSERT INTO chat_matrix_companies (network_id, space_id, member_network_ids) VALUES ($1,'!s2',$2::jsonb)`, [a1, JSON.stringify([a1])]);

  // ── статьи ──
  const artGig = (await q(`INSERT INTO kb_articles (network_id,title,body_plain,status,doc_kind) VALUES ($1,'Пожарная безопасность ГИГ','Запрещено курить при пожаре на территории','published','lnd') RETURNING id`, [g1])).rows[0].id;
  const artBto = (await q(`INSERT INTO kb_articles (network_id,title,body_plain,status,doc_kind) VALUES ($1,'Регламент БТО','Регламент эвакуации сотрудников','published','regulation') RETURNING id`, [b1])).rows[0].id;
  const artAcme = (await q(`INSERT INTO kb_articles (network_id,title,body_plain,status,doc_kind) VALUES ($1,'Секрет Acme','Секретный пожарный регламент Acme','published','lnd') RETURNING id`, [a1])).rows[0].id;

  // ── контакты ──
  await q(`INSERT INTO kb_contacts (network_id,full_name,position,phone) VALUES ($1,'Иванов Иван','инженер ПБ','+79210000001')`, [g1]);
  await q(`INSERT INTO kb_contacts (network_id,full_name,position,phone) VALUES ($1,'Петров Acme','директор','+79990000002')`, [a1]);

  const userGig = { id: 'u1', role: 'manager', roles: [{ scope: 'network', scopeValues: [g1] }] };
  const userAcme = { id: 'u2', role: 'manager', roles: [{ scope: 'network', scopeValues: [a1] }] };
  const superUser = { id: 'u3', role: 'super_admin', roles: [{ scope: 'global', scopeValues: [] }] };

  console.log('\n[Дерево]');
  const t = await kb.getTree(userGig, g1);
  const ids = t.articles.map((a) => a.id);
  check('ГИГ видит свою статью', ids.includes(artGig));
  check('ГИГ видит статью БТО (одна компания)', ids.includes(artBto));
  check('ГИГ НЕ видит статью Acme', !ids.includes(artAcme));
  check('ГИГ→Acme: доступ запрещён (denied)', (await kb.getTree(userGig, a1)).denied === true);

  console.log('\n[Статья]');
  check('ГИГ→Acme статья: 404 (notFound)', (await kb.getArticle(userGig, artAcme)).notFound === true);
  check('ГИГ→своя статья: открывается', !!(await kb.getArticle(userGig, artGig)).article);

  console.log('\n[Поиск]');
  const sGig = (await kb.search(userGig, 'пожар', g1)).articles.map((a) => a.id);
  check('Поиск ГИГ «пожар»: находит своё', sGig.includes(artGig));
  check('Поиск ГИГ «пожар»: НЕ находит Acme', !sGig.includes(artAcme));
  const sAcme = (await kb.search(userAcme, 'пожар', a1)).articles.map((a) => a.id);
  check('Поиск Acme «пожар»: находит своё', sAcme.includes(artAcme));
  check('Поиск Acme «пожар»: НЕ находит ГИГ', !sAcme.includes(artGig));
  const csGig = await kb.search(userGig, 'Петров', g1);
  check('Поиск ГИГ по фамилии: НЕ выдаёт контакт Acme', !csGig.contacts.some((c) => c.full_name === 'Петров Acme'));

  console.log('\n[Контакты]');
  const cGig = (await kb.listContacts(userGig, g1)).contacts.map((c) => c.full_name);
  check('Контакты ГИГ: свой есть', cGig.includes('Иванов Иван'));
  check('Контакты ГИГ: чужого (Acme) нет', !cGig.includes('Петров Acme'));

  console.log('\n[Super-admin]');
  check('Super видит статью Acme', (await kb.getTree(superUser, a1)).articles.map((a) => a.id).includes(artAcme));

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  await pool.closePool();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('ERROR', e.message, '\n', e.stack); process.exit(2); });
