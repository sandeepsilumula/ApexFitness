#!/usr/bin/env node
'use strict'; const {readStdin,logToProjectFile}=require('./shared');
async function main(){const p=await readStdin();if(p.hook_event_name!=='PostToolUse'||p.tool_name!=='Bash'){process.stdout.write('{}');process.exit(0)}
const cmd=p.tool_input?.command,r=p.tool_response;const ec=r?.exit_code??r?.exitCode??0;const err=(r?.stderr||r?.error||r?.output||'').trim().slice(0,300);
if(ec===0&&!err){process.stdout.write('{}');process.exit(0)}
logToProjectFile(p,'auto-remediate.log','FAILED: '+cmd.slice(0,300)+'\\n  Exit: '+ec+'\\n  '+err);process.stdout.write('{}');process.exit(0)}
main().catch(()=>{process.stdout.write('{}');process.exit(0)});