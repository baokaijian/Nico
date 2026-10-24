// Local read-only inventory: no blob contents, names or private record values in output.
import {execFileSync} from 'node:child_process';
const rows=execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n');
const categories={privateData:0,originalMedia:0,environment:0,review:0,authorizedReleaseMedia:0};
for(const row of rows){const name=row.slice(row.indexOf(' ')+1);if(/^data\//.test(name))categories.privateData++;else if(/^uploads\//.test(name))categories.originalMedia++;else if(/(?:^|\/)\.env(?:\.|$)/.test(name)&&!name.endsWith('.example'))categories.environment++;else if(/^review\//.test(name))categories.review++;else if(/^release\/uploads\//.test(name))categories.authorizedReleaseMedia++;}
console.log(JSON.stringify({scope:'local Git reachable objects; path inventory only, not a complete content/secret scan',categories,requiresSpecificConsent:categories.privateData+categories.originalMedia+categories.environment+categories.review>0,historyChanged:false}));
