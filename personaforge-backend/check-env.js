import dotenv from 'dotenv';
dotenv.config({ path: ['../.env', '.env'] });
console.log('GROQ_API_KEY configured:', Boolean(process.env.GROQ_API_KEY));
console.log('CWD:', process.cwd());
