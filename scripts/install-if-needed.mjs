import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const hash=createHash('sha256').update(readFileSync('package-lock.json')).digest('hex');
const marker='node_modules/.dream-lock-hash';
if(!existsSync(marker)||readFileSync(marker,'utf8')!==hash){
  console.log('Updating Docker dependencies to match package-lock.json…');
  const result=spawnSync('npm',['ci','--cache','/tmp/npm-cache','--no-audit','--no-fund'],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
  writeFileSync(marker,hash);
}
