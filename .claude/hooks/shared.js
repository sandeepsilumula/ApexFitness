#!/usr/bin/env node
'use strict'; async function readStdin(){const c=[];for await(const b of process.stdin)c.push(b);const r=Buffer.concat(c).toString('utf8').trim();try{return JSON.parse(r)}catch{return{}}}
function denyResponse(r){return JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:r}})}
function logToProjectFile(p,n,e){const fs=require('fs'),pt=require('path'),pR=p.cwd||process.cwd(),lD=pt.join(pR,'.claude','hooks'),lF=pt.join(lD,n);try{if(!fs.existsSync(lD))fs.mkdirSync(lD,{recursive:true});const ts=new Date().toISOString();fs.appendFileSync(lF,'['+ts+'] '+e+'\n','utf8')}catch(e){}}
module.exports={readStdin,denyResponse,logToProjectFile};