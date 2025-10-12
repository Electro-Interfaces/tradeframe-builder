import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('ENV Variables Test:');
console.log('STS_API_URL:', process.env.STS_API_URL);
console.log('STS_API_USERNAME:', process.env.STS_API_USERNAME);
console.log('STS_API_PASSWORD:', process.env.STS_API_PASSWORD ? '***' : 'undefined');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
