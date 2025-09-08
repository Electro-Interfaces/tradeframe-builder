// Декодируем JWT токен для получения project ref
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Декодируем payload часть JWT
const payload = token.split('.')[1];
const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());

console.log('Декодированный JWT:');
console.log(JSON.stringify(decoded, null, 2));

const projectRef = decoded.ref;
const supabaseUrl = `https://${projectRef}.supabase.co`;

console.log(`\nProject Ref: ${projectRef}`);
console.log(`Supabase URL: ${supabaseUrl}`);