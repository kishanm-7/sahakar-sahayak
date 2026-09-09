import dotenv from 'dotenv';

// Next.js loads .env.local for us, but a plain `node scripts/...` run does not,
// so command-line scripts import this file FIRST.
//
// Why a separate file instead of calling dotenv.config() inside the script?
// Because ES modules evaluate all their imports before any of their own code
// runs. If we called dotenv.config() in the script body, lib/openai.js would
// already have been evaluated with an empty OPENAI_API_KEY. Importing this
// module ahead of the others guarantees the env is populated in time.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
