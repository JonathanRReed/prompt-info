import { expect, test, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';
import { cases, routeFiles } from './cases.mjs';

const repo = fileURLToPath(new URL('../../',import.meta.url));
const root = mkdtempSync(join(tmpdir(),'prompt-info-lint-'));
for (const file of [...routeFiles, 'app/contact/page.tsx','app/contact/helper.tsx','app/(group)/grouped/page.tsx','app/@slot/parallel/page.tsx','app/_private/page.tsx','app/api/route.ts','pages/api/health.ts']) {
  const path=join(root,file); mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,'export default function Page() { return null }');
}
const eslint = new ESLint({cwd:root,overrideConfigFile:join(repo,'eslint.config.mjs'),overrideConfig:{settings:{next:{rootDir:root}}}});
const upstream = JSON.parse(readFileSync(new URL('./upstream-diagnostics.json',import.meta.url)));
afterAll(()=>rmSync(root,{recursive:true,force:true}));

async function diagnostics(fixture) {
  const file=join(root,fixture.filename);
  mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,fixture.code);
  const [result]=await eslint.lintText(fixture.code,{filePath:file});
  expect(result.messages.filter(m=>m.fatal),fixture.name).toEqual([]);
  const messages=result.messages.filter(m=>m.ruleId?.endsWith(`/${fixture.rule}`))
    .map(m=>({rule:fixture.rule,severity:m.severity}));
  if (existsSync(join(repo,'.oxlintrc.json'))) {
    const ox=spawnSync(join(repo,'node_modules/.bin/oxlint'),['--threads=1','--config',join(repo,'.oxlintrc.json'),'--format=json',file],{cwd:root,encoding:'utf8'});
    if (![0,1].includes(ox.status)) throw new Error(ox.stderr || ox.stdout);
    const report=JSON.parse(ox.stdout);
    messages.push(...report.diagnostics.filter(m=>m.code===`next(${fixture.rule})`).map(m=>({rule:fixture.rule,severity:m.severity==='error'?2:1})));
  }
  return messages;
}

for (const fixture of cases) {
  test(`preserves upstream behavior: ${fixture.name}`, async()=>{
    const expected=upstream.results.find(r=>r.name===fixture.name).diagnostics;
    expect(expected.length,fixture.name).toBe(fixture.expected);
    expect(await diagnostics(fixture)).toEqual(expected);
  });
}

for (const [href,expected] of [['/contact/',1],['/grouped/',1],['/parallel/',1],['/contact/helper/',0],['/file.pdf',0],['/_private/',0],['/api/',0],['/api/health/',0],['/posts/hello.json',1]]) {
  test(`discovers real app routes rather than source files: ${href}`,async()=>{
    const fixture={name:href,filename:'components/links.tsx',rule:'no-html-link-for-pages',code:`const x = <a href=${JSON.stringify(href)}>Link</a>;`};
    expect(await diagnostics(fixture)).toEqual(expected?[{rule:fixture.rule,severity:2}]:[]);
  });
}

test('all non-Next effective rule severities and options survive preset replacement',async()=>{
  const old=JSON.parse(readFileSync(new URL('./baseline-config.json',import.meta.url)));
  const config=await eslint.calculateConfigForFile(join(root,'components/example.tsx'));
  for (const [rule,value] of Object.entries(old.rules)) {
    if (!rule.startsWith('@next/next/')) expect(config.rules[rule],rule).toEqual(value);
  }
  expect(config.settings).toMatchObject(old.settings);
});

for (const [name,code,rule,severity] of [
  ['conditional hook','import {useState} from "react"; function Example({enabled}) { if(enabled) useState(0); return null; }','react-hooks/rules-of-hooks',2],
  ['effect dependencies','import {useEffect} from "react"; function Example({value}) { useEffect(()=>{console.log(value)},[]); return null; }','react-hooks/exhaustive-deps',1],
  ['compiler purity','function Example() { return <span>{Date.now()}</span>; }','react-hooks/purity',2],
  ['compiler refs','import {useRef} from "react"; function Example() { const ref=useRef(0); return <span>{ref.current}</span>; }','react-hooks/refs',2],
  ['image accessibility','const Example = () => <img src="/image.png" />;','jsx-a11y/alt-text',1],
  ['invalid aria','const Example = () => <button aria-madeup="true">Go</button>;','jsx-a11y/aria-props',1],
  ['React keys','const Example = () => [1,2].map(n=><span>{n}</span>);','react/jsx-key',2],
  ['anonymous export','export default {};','import/no-anonymous-default-export',1],
]) {
  test(`retains real ESLint diagnostics: ${name}`,async()=>{
    const [result]=await eslint.lintText(code,{filePath:join(root,'components/example.tsx')});
    expect(result.messages.filter(m=>m.ruleId===rule).map(m=>m.severity)).toEqual([severity]);
  });
}

test('both supported file families retain parsing and JSX lint coverage',async()=>{
  for(const ext of ['js','jsx','mjs','ts','tsx']) {
    const code=ext==='ts'?'export const value: number = 1;':'const Example = () => <img src="/a.png" />;';
    const [result]=await eslint.lintText(code,{filePath:join(root,`components/example.${ext}`)});
    expect(result.messages.filter(m=>m.fatal)).toEqual([]);
    if(ext!=='ts') expect(result.messages.filter(m=>m.ruleId==='jsx-a11y/alt-text').map(m=>m.severity)).toEqual([1]);
  }
});

test('cyclic destination aliases cannot crash linting or hide another navigation',async()=>{
  const fixture={name:'cyclic aliases',filename:'components/navigation.ts',rule:'no-location-assign-relative-destination',code:'let a = b; let b = a; location.assign(a); location.assign("/about");'};
  expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:1}]);
});

test('CommonJS files retain Next navigation coverage',async()=>{
  const fixture={name:'CommonJS navigation',filename:'navigation.cjs',rule:'no-location-assign-relative-destination',code:'window.location.assign("/about");'};
  expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:1}]);
});

test('the moved Next errors still run across all original file extensions',async()=>{
  for(const ext of ['js','jsx','mjs','cjs','ts','tsx','mts','cts']) {
    const fixture={name:`module assignment ${ext}`,filename:`module-check.${ext}`,rule:'no-assign-module-variable',code:'const module = {};'};
    expect(await diagnostics(fixture)).toEqual([{rule:fixture.rule,severity:2}]);
  }
});
