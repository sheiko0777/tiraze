import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { backupKey,encryptBackup,decryptBackup } from './lib/backup.ts';
const [mode,input,output]=process.argv.slice(2);
if(!['encrypt','verify'].includes(mode)||!input||(mode==='encrypt'&&!output))throw new Error('Usage: node tools/backup.mjs encrypt input.sql output.tzb | verify input.tzb');
const key=backupKey(process.env.BACKUP_KEY_HEX??'');
if(mode==='encrypt'){if(resolve(input)===resolve(output))throw new Error('Input and output must differ');await writeFile(output,encryptBackup(await readFile(input),key),{flag:'wx',mode:0o600});console.log('Encrypted backup written. Keep the key outside the backup storage.');}
else {const sql=decryptBackup(await readFile(input,'utf8'),key).toString('utf8');const db=new DatabaseSync(':memory:');try{db.exec(sql);const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();for(const table of tables){if(!/^[A-Za-z0-9_]+$/.test(table.name))throw new Error('Unsupported table name');db.prepare('SELECT COUNT(*) AS count FROM "'+table.name+'"').get();}console.log('Authenticated backup restored into isolated in-memory SQLite: '+tables.length+' tables readable. This is not remote D1 recovery evidence.');}finally{db.close();}}
