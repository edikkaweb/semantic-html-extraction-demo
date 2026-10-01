import fs from 'node:fs';
import path from 'node:path';
import {root, importData, hash, tools} from './import.mjs';
import {comparison,browse,method,realIndex,realPage,sources,shell,rawPath} from './render.mjs';
const {archive,data,bytes} = await importData();
const dist=path.join(root,'dist');
// Only this demo's generated dist is replaced. Original files are never modified.
fs.rmSync(dist,{recursive:true,force:true});
const put=(name,content)=>{const p=path.join(dist,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);};
put('assets/style.css',fs.readFileSync(path.join(root,'src/style.css')));
put('assets/app.js',fs.readFileSync(path.join(root,'src/app.js')));
put('assets/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0c1a24"/><text x="6" y="24" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#d8e58a">e</text></svg>');
put('.nojekyll','');
put('originals/'+data.provenance.file,bytes);
for(const [name,buffer] of archive.files) put(rawPath(name),buffer);
put('data/display.json',JSON.stringify(data,null,2)+'\n');
put('data/provenance.json',JSON.stringify({provenance:data.provenance,mapping:data.mapping,htmlDelivery:'Original .html files are delivered as .html.txt without changing their bytes. No preview executes archived code.'},null,2)+'\n');
let count=0;
for(const ui of ['fr','en']) {
 put(ui==='fr'?'index.html':'index-en.html',comparison(data,ui,'caveat','fr','readability','./',true));
 for(const family of ['heading','table','caveat']) for(const doc of ['fr','en']) for(const [tool] of tools){put(`cases/${ui}-${family}-${doc}-${tool}.html`,comparison(data,ui,family,doc,tool,'../'));count++;}
 put(`${ui}-browse.html`,browse(data,ui));put(`${ui}-method.html`,method(data,ui));put(`${ui}-real.html`,realIndex(data,ui));put(`${ui}-sources.html`,sources(data,archive.manifest,ui));
 for(const page of data.real.pages) put(`real/${ui}-${page.id}.html`,realPage(data,page,ui));
}
put('404.html',shell({ui:'fr',title:'Comparaison introuvable / Comparison not found',description:'Choisir une comparaison dans l’index / Choose a comparison in the index',base:'/semantic-html-extraction-demo/',alternate:'/semantic-html-extraction-demo/en-browse.html',body:'<h1>Cette comparaison n’existe pas.</h1><p>Choisissez un lien dans <a href="/semantic-html-extraction-demo/fr-browse.html">l’index des 42 comparaisons</a>.</p><div lang="en"><h2>This comparison does not exist.</h2><p>Choose a link from the <a href="/semantic-html-extraction-demo/en-browse.html">42-comparison index</a>.</p></div>'}));
const records=[];function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,f.name);if(f.isDirectory())walk(full);else records.push({path:path.relative(dist,full).split(path.sep).join('/'),sha256:hash(fs.readFileSync(full))});}}walk(dist);
put('build-manifest.json',JSON.stringify({demoVersion:data.demoVersion,packageSha256:data.provenance.sha256,comparisonPages:count,files:records},null,2)+'\n');
console.log(`Built ${count} comparison pages, 16 real-page views and provenance. ${records.length} files. No new extraction, no network request.`);
