import dotenv from 'dotenv';
dotenv.config({ path: ['../.env', '.env'] });
console.log('GEMINI_API_KEY configured:', Boolean(process.env.GEMINI_API_KEY));
console.log('CWD:', process.cwd());
