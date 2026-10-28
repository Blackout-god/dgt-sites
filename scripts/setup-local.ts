import { randomBytes } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
const file = 'apps/hub/.dev.vars';
try { await access(file); console.log('Local hub settings already exist.'); }
catch { await writeFile(file, `LOCAL_DEVELOPMENT="true"\nADMIN_TOKEN="${randomBytes(32).toString('hex')}"\nPARTNER_API_KEY="${randomBytes(32).toString('hex')}"\n`); console.log('Generated local hub settings.'); }
