//
// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

const assert = require('node:assert/strict');
const runScript = new (Object.getPrototypeOf(async function(){}).constructor)(
  'process', 'context', 'github', 'core',
  require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../workflows/ci-scope.yml'), 'utf8')
    .split('          script: |\n')[1].split('\n')
    .map(line => line.slice(12)).join('\n'));
async function check(scope, names, expected, opts = {}) {
  let output;
  const files = names.map(x => typeof x === 'string' ? {filename:x} : x);
  const github = {
    paginate: async () => { if(opts.error) throw Error('offline'); return files; },
    rest:{pulls:{listFiles:()=>{},get: async()=>({data:{
      changed_files: opts.count ?? files.length, head:{sha:opts.head ?? 'abc'}
    }})}}
  };
  await runScript({env:{CI_SCOPE:scope}},
    {eventName:opts.event ?? 'pull_request',repo:{owner:'x',repo:'y'},
     payload:{pull_request:{number:1,head:{sha:'abc'}}}},
    github,{warning:()=>{},setOutput:(k,v)=>output=v});
  assert.equal(output,String(expected),scope+': '+JSON.stringify(names));
}
(async()=>{
for(const scope of ['commons','server','distributed','cluster','docker','dependencies']) {
 await check(scope,['README.md','hugegraph-server/AGENTS.md','.serena/project.yml'],false);
 await check(scope,['pom.xml'],true);
 await check(scope,['.github/workflows/ci-scope.yml'],true);
 await check(scope,['README.md'],true,{error:true});
 await check(scope,['README.md'],true,{count:3001});
 await check(scope,['README.md'],true,{head:'moved'});
 await check(scope,['README.md'],true,{event:'push'});
 await check(scope,['README.md'],true,{event:'workflow_dispatch'});
}
await check('commons',['hugegraph-store/hg-store-core/src/main/java/A.java'],false);
await check('server',['hugegraph-commons/hugegraph-common/src/main/java/A.java'],true);
await check('distributed',['hugegraph-server/hugegraph-hstore/src/main/java/A.java'],true);
await check('docker',['hugegraph-server/hugegraph-dist/src/assembly/static/conf/x.txt'],true);
await check('server',['hugegraph-server/hugegraph-test/src/main/resources/case.md'],true);
await check('dependencies',['install-dist/scripts/dependency/known-dependencies.txt'],true);
await check('server',[{filename:'docs/old.md',previous_filename:'hugegraph-server/A.java'}],true);
await check('server',['new-build-tool.sh'],true);
console.log('56 path and fallback scenarios passed');
})().catch(e=>{console.error(e);process.exit(1)});
