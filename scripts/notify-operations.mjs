import {sendOperationsAlert} from '../shared/operations-alerts.mjs';
import fs from 'node:fs';
import path from 'node:path';
// Fixed CI payload. Never serialize the environment, git commit text, logs or workflow errors.
const kind=process.env.NICO_ALERT_KIND==='release-mismatch'?'release-mismatch':'release-failed';
let event={kind,category:kind==='release-mismatch'?'mismatch':'internal',runId:`ci-${process.env.GITHUB_RUN_ID||'0'}`},result;
try{
 const args=process.argv.slice(2);
 if(args.length){if(args.length!==2||args[0]!=='--pending-file'||!path.isAbsolute(args[1])||fs.statSync(args[1]).size>4096)throw Error();event=JSON.parse(fs.readFileSync(args[1],'utf8'));}
 result=await sendOperationsAlert(event,{webhook:process.env.NICO_OPERATIONS_WEBHOOK,allowedHosts:(process.env.NICO_OPERATIONS_ALLOWED_HOSTS||'').split(',').map(v=>v.trim()).filter(Boolean)});
}catch{result={status:'configuration',attempts:0};}
console.log(JSON.stringify({schema:1,...result}));
process.exitCode=['delivered','not-configured'].includes(result.status)?0:1;
