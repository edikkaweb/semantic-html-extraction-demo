import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,importData,readPackage,derive,hash,tools,get} from '../src/import.mjs';
import {outcomeRows,variant,escape,outputExcerpt} from '../src/render.mjs';
const {archive,data,bytes}=await importData({verifyOnly:true});
const original=JSON.parse(archive.files.get('results.json'));

test('pinned ZIP and every original member are preserved in the publication',()=>{
 assert.equal(hash(bytes),data.provenance.sha256);assert.equal(archive.manifest.files.length,71);
 for(const [name,buffer] of archive.files){const delivery='sources/'+name+(name.endsWith('.html')?'.txt':'');assert.deepEqual(fs.readFileSync(path.join(root,'dist',delivery)),buffer,name);}
 assert.deepEqual(fs.readFileSync(path.join(root,'dist/originals',data.provenance.file)),bytes);
});
test('corruption and contradictory references stop import',()=>{
 const corrupt=Buffer.from(bytes);corrupt[80]^=1;assert.throws(()=>readPackage(corrupt),/ZIP SHA-256 mismatch/);
 const altered=new Map(archive.files),results=structuredClone(original);results.cases[0].html_sha256='0'.repeat(64);altered.set('results.json',Buffer.from(JSON.stringify(results)));assert.throws(()=>derive({files:altered,manifest:archive.manifest}),/Fixture/);
});
test('all 84 verdicts are copied from corrected results, with actual output fields and excerpts',()=>{
 let count=0;
 for(const c of data.cases){const source=original.cases.find(s=>s.id===c.id);assert.equal(c.inputExcerpt, c.html.slice(c.html.indexOf(c.inputExcerpt),c.html.indexOf(c.inputExcerpt)+c.inputExcerpt.length));for(const [id] of tools){const o=c.outcomes[id];assert.deepEqual(o.verdict,source.evaluation.relation[id]);assert(o.source.pointer.endsWith('/'+id));const raw=JSON.parse(archive.files.get(c.raw_output));if(o.verdict.output_field){assert.equal(o.output,get(raw,o.verdict.output_field));assert.equal(hash(o.output),o.verdict.output_sha256);assert(o.output.includes(outputExcerpt(o).text));}count++;}}
 assert.equal(count,84);
});
test('all 42 pairs are published in both UI languages, with separate document language',()=>{
 let count=0;for(const ui of ['fr','en'])for(const family of ['heading','table','caveat'])for(const doc of ['fr','en'])for(const [tool] of tools){const html=fs.readFileSync(path.join(root,`dist/cases/${ui}-${family}-${doc}-${tool}.html`),'utf8');assert(html.includes(`<html lang="${ui}">`));assert.equal((html.match(/class="variant"/g)||[]).length,2);assert(html.includes(`data-document="${doc}"`));assert(html.includes(`data-tool="${tool}"`));assert(html.includes('results.json#/cases/'));count++;}assert.equal(count,84);
});
test('no_output never becomes an absent relationship; errors are separately supported',()=>{
 const noOutput=data.cases.map(c=>c.outcomes.justext);assert(noOutput.every(o=>o.verdict.status==='no_output'));assert.equal(noOutput.length,12);
 for(const c of data.cases)assert(outcomeRows(c,c.outcomes.justext,'fr').every(row=>row[1]==='not_evaluated'));
 const synthetic=structuredClone(data.cases[0]);synthetic.outcomes.readability.verdict={status:'error',format:'html',evidence:null};synthetic.outcomes.readability.output=null;
 assert(outcomeRows(synthetic,synthetic.outcomes.readability,'en').every(row=>row[1]==='not_evaluated'));
 const html=variant(synthetic,'readability','en','../',0);assert(html.includes('Execution error'));assert(!html.includes('No output'));
 assert(!data.cases.some(c=>Object.values(c.outcomes).some(o=>o.verdict.status==='error')));
});
test('heading text, markup, level and unevaluated section membership remain distinct',()=>{
 const c=data.cases.find(c=>c.id==='heading-fr-2'),v=c.outcomes.readability;
 assert.equal(v.verdict.heading_relation,'text_only');assert.equal(v.verdict.heading_level,null);
 const rows=outcomeRows(c,v,'fr');assert.equal(rows[0][1],'present');assert.equal(rows[1][1],'text_only');assert.equal(rows[2][1],'none_detected');assert.equal(rows[3][1],'not_evaluated');
});
test('table values, columns, rows, captions and Markdown are not conflated',()=>{
 const a=data.cases.find(c=>c.id==='table-fr-1'),b=data.cases.find(c=>c.id==='table-fr-2');
 assert.equal(a.outcomes.trafilatura.verdict.column_header_relation,'explicit');assert.equal(a.outcomes.trafilatura.verdict.row_header_relation,'not_explicit');
 assert.equal(b.outcomes.trafilatura.verdict.column_header_relation,'not_explicit');
 assert.equal(a.outcomes.html2text.verdict.expected_data_row,'exact_values_in_order');assert.equal(a.outcomes.html2text.verdict.column_header_relation,'not_explicit');
 assert.equal(a.outcomes.markdownify.verdict.column_header_relation,'markdown_header_row');assert.equal(a.outcomes.markdownify.verdict.row_header_relation,'not_encoded_in_markdown');
});
test('default caveat comparison follows archived evidence and never infers claim attachment',()=>{
 const a=data.cases.find(c=>c.id==='caveat-fr-1'),b=data.cases.find(c=>c.id==='caveat-fr-2');assert.equal(a.outcomes.readability.verdict.caveat_text,'present');assert.equal(b.outcomes.readability.verdict.caveat_text,'absent');
 for(const c of data.cases.filter(c=>c.family==='caveat'))for(const [id]of tools)assert.equal(outcomeRows(c,c.outcomes[id],'fr').at(-1)[1],'not_evaluated');
});
test('real-page instability and both archived newspaper4k outputs remain present',()=>{
 assert.equal(data.real.pages.length,8);assert.equal(data.real.all_deterministic,false);
 const unstable=data.real.pages.filter(p=>!p.deterministic_replay);assert.equal(unstable.length,1);assert.equal(unstable[0].id,'article-ai-en');const r=unstable[0].raw;assert.equal(r.component_replays.newspaper4k,false);assert.notDeepEqual(r.nondeterministic_outputs.newspaper4k.first,r.nondeterministic_outputs.newspaper4k.replay);
 for(const ui of ['fr','en']){const html=fs.readFileSync(path.join(root,`dist/real/${ui}-article-ai-en.html`),'utf8');assert(html.includes(escape(JSON.stringify(r.nondeterministic_outputs.newspaper4k.first,null,2))));assert(html.includes(escape(JSON.stringify(r.nondeterministic_outputs.newspaper4k.replay,null,2))));}
});
test('counter-tests are the eight archived evaluator checks, not extraction runs',()=>{
 assert.deepEqual(data.counterTests,original.evaluator_counter_tests);assert.equal(data.counterTests.length,8);assert(data.counterTests.every(t=>t.positive_control_accepted===true&&t.accepted===false&&t.passed===true));
});
test('generated HTML uses only local resources and all local references resolve under Pages project path',()=>{
 const dist=path.join(root,'dist');const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(p,f.name)):[path.join(p,f.name)]);
 for(const file of walk(dist).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file);assert(!html.includes('<iframe'),file);for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const url=m[1].replace(/&amp;/g,'&');if(/^(https?:|#)/.test(url))continue;const pathname=url.split(/[?#]/)[0];const target=pathname.startsWith('/semantic-html-extraction-demo/')?path.join(dist,pathname.slice('/semantic-html-extraction-demo/'.length)):path.resolve(path.dirname(file),pathname);assert(fs.existsSync(target),file+' -> '+url);}for(const m of html.matchAll(/<(?:script|img)[^>]+src="([^"]+)"/g))assert(!/^https?:/.test(m[1]),file);}
});
