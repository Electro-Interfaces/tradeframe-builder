require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { transformTenantsToOrg } = require('../../services/org/orgTransforms');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'tenants-export.json');

const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'org-transformed.json');

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Файл не найден: ${inputPath}`);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const transformed = transformTenantsToOrg(input.tenants || []);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    transformed_at: new Date().toISOString(),
    source_file: inputPath,
    counts: {
      networks: transformed.networks.length,
      trading_points: transformed.tradingPoints.length,
      trading_point_external_codes: transformed.tradingPointExternalCodes.length,
    },
    ...transformed,
  }, null, 2));

  console.log(`Сформировано сетей: ${transformed.networks.length}`);
  console.log(`Сформировано точек: ${transformed.tradingPoints.length}`);
  console.log(`Сформировано внешних кодов: ${transformed.tradingPointExternalCodes.length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
