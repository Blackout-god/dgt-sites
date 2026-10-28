import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const app=path.join(root,'apps/storefront');
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{
  cwd:app,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_DEMO_MODE:'true',NEXT_PUBLIC_HUB_URL:'',NEXT_PUBLIC_SITE_URL:''}
});
if(result.status!==0)process.exit(result.status||1);
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.join(root,'output/pages-demo',stamp);
await mkdir(output,{recursive:true});
await cp(path.join(app,'out'),output,{recursive:true});
await writeFile(path.join(output,'_headers'),`/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'\n`);
let files=0,total=0;
async function inspect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await inspect(file);else{const size=(await stat(file)).size;if(size>25*1024*1024)throw new Error(`Pages file exceeds 25 MiB: ${file}`);files++;total+=size;}}}
await inspect(output);
if(files>20000)throw new Error('Pages file limit exceeded');
await mkdir(path.join(root,'.data'),{recursive:true});
await writeFile(path.join(root,'.data/pages-demo-build.json'),JSON.stringify({directory:output,files,bytes:total,createdAt:new Date().toISOString()},null,2));
console.log(`Demo assets: ${output}\nFiles: ${files}; size: ${(total/1024/1024).toFixed(1)} MiB`);
