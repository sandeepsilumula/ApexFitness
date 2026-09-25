#!/usr/bin/env node
'use strict'; const fs=require('fs'),pt=require('path'),{readStdin}=require('./shared');
async function main(){const p=await readStdin();const cwd=p.cwd||process.cwd();const cf=pt.join(cwd,'.claude','.context-counter.txt');const lf=pt.join(cwd,'.claude','.context-usage.log');
let c=0;try{if(fs.existsSync(cf)){const r=fs.readFileSync(cf,'utf8').trim().split('\\n')[0];const n=parseInt(r,10);if(Number.isFinite(n)&&n>=0)c=n}}catch{}
c++;try{const d=pt.dirname(cf);if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});fs.writeFileSync(cf,c+'\\n','utf8');const ts=new Date().toISOString();fs.appendFileSync(lf,'['+ts+'] TOOL_CALL: '+(p.tool_name||'?')+' (total: '+c+')\\n','utf8')}catch{}
if(c===50)process.stderr.write('\\n  [CONTEXT MONITOR] 50 calls. Run /compact.\\n\\n');else if(c===100)process.stderr.write('\\n  [CONTEXT MONITOR] 100 calls. Run /compact soon.\\n\\n');else if(c===150)process.stderr.write('\\n  [CONTEXT MONITOR] 150 calls. Run /compact now.\\n\\n');else if(c>200&&c%50===0)process.stderr.write('\\n  [CONTEXT MONITOR] '+c+' calls. Critical.\\n\\n')
if(c>=500){try{fs.writeFileSync(cf,'0\\n','utf8');if(fs.existsSync(lf))fs.unlinkSync(lf)}catch{}}process.stdout.write('{}');process.exit(0)}
main().catch(()=>{process.stdout.write('{}');process.exit(0)});