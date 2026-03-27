import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const ignoredDirs = new Set([
  '.git',
  '.claude',
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.idea',
]);

const legacyAllowlist = new Set([
  'docs/deployment/DEPLOYMENT_HISTORY.md',
]);

const findings = [];

function isIgnoredDir(relativePath) {
  const parts = relativePath.split('/').filter(Boolean);
  return parts.some((part) => ignoredDirs.has(part));
}

function isLegacyAllowed(relativePath) {
  return relativePath.startsWith('docs/_archive/') || legacyAllowlist.has(relativePath);
}

function isIgnoredFile(relativePath) {
  const baseName = path.basename(relativePath);
  return baseName === '.env';
}

function getLineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function pushMatches({ relativePath, text, regex, message }) {
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const { line, column } = getLineAndColumn(text, match.index ?? 0);
    findings.push({
      file: relativePath,
      line,
      column,
      message,
      snippet: match[0],
    });
  }
}

function scanFile(absolutePath) {
  const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
  if (isIgnoredDir(relativePath)) {
    return;
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) {
      scanFile(path.join(absolutePath, entry));
    }
    return;
  }

  if (isIgnoredFile(relativePath)) {
    return;
  }

  const buffer = fs.readFileSync(absolutePath);
  if (buffer.includes(0)) {
    return;
  }

  const text = buffer.toString('utf8');

  if (relativePath.startsWith('src/')) {
    pushMatches({
      relativePath,
      text,
      regex: /\bVITE_STS_API_(URL|USERNAME|PASSWORD)\b/g,
      message: 'Во frontend найден legacy STS env. Используйте только backend proxy.',
    });
  }

  pushMatches({
    relativePath,
    text,
    regex: /\b\d{8,10}:[A-Za-z0-9_-]{20,}\b/g,
    message: 'Найден token-like секрет. Уберите его из репозитория и используйте secrets/.env.',
  });

  if (!isLegacyAllowed(relativePath)) {
    pushMatches({
      relativePath,
      text,
      regex: /\btradeframe-backend-proxy\b/g,
      message: 'Найдено legacy имя backend процесса вне исторических файлов.',
    });
  }
}

scanFile(repoRoot);

if (findings.length === 0) {
  console.log('Repository guards passed.');
  process.exit(0);
}

console.error('Repository guards failed:');
for (const finding of findings) {
  console.error(
    `- ${finding.file}:${finding.line}:${finding.column} ${finding.message}`,
  );
  console.error(`  ${finding.snippet}`);
}

process.exit(1);
