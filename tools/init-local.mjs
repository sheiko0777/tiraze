import { randomBytes } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
const target=new URL('../apps/web/.dev.vars',import.meta.url);await mkdir(new URL('../apps/web/',import.meta.url),{recursive:true});
try{await writeFile(target,'AUTH_SECRET='+randomBytes(48).toString('hex')+'\n',{flag:'wx',mode:0o600});console.log('Created ignored local authentication secret.');}catch(error){if(error.code!=='EEXIST')throw error;console.log('Existing local secrets retained.');}
