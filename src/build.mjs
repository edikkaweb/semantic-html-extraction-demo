import fs from 'node:fs';
import path from 'node:path';
import {root, importData, hash, tools} from './import.mjs';
import {comparison,browse,method,realIndex,realPage,sources,shell,rawPath} from './render.mjs';
const {archive,data,bytes} = await importData();
const dist=path.join(root,'dist');
// Only this demo's generated dist is replaced. Original files are never modified.
fs.rmSync(dist,{recursive:true,force:true});
const put=(name,content)=>{const p=path.join(dist,name);fs.mkdirSync(path.dirname(p),{recursive:true});if(name.endsWith('.html') && typeof content==='string') {
  if(name==='404.html') content=content.replace('</head>','<meta name="robots" content="noindex"></head>');
  else {
    const rootUrl='https://edikkaweb.github.io/semantic-html-extraction-demo/';
    const en=/^<html lang="en"/m.test(content);
    const opposite=name==='index.html'?'index-en.html':name==='index-en.html'?'index.html':name.replace(/(^|\/)(fr|en)-/,(_,prefix,language)=>prefix+(language==='fr'?'en':'fr')+'-');
    const url=file=>rootUrl+(file==='index.html'?'':file);
    const fr=en?opposite:name, english=en?name:opposite;
    content=content.replace('</head>',`<link rel="canonical" href="${url(name)}"><link rel="alternate" hreflang="fr" href="${url(fr)}"><link rel="alternate" hreflang="en" href="${url(english)}"><link rel="alternate" hreflang="x-default" href="${url(fr)}"><meta name="twitter:card" content="summary_large_image"><meta property="og:type" content="website"><meta property="og:url" content="${url(name)}"><meta property="og:image" content="https://edikkaweb.github.io/assets/semantic-html-extraction-demo.jpg"></head>`);
  }
}
fs.writeFileSync(p,content);};
put('assets/style.css',fs.readFileSync(path.join(root,'src/style.css')));
put('assets/app.js',fs.readFileSync(path.join(root,'src/app.js')));
put('assets/favicon.svg',"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 270\"><rect width=\"400\" height=\"270\" rx=\"28\" fill=\"#0c1a24\"/><path transform=\"translate(18 19)\" fill=\"#d8e58a\" d=\"M168 100.38v16H17v99h202l-16 16H0v-131ZM187.01.38h62.78a115.5 115.5 0 0 1 0 231H224l16-16h9.79a99.5 99.5 0 0 0 0-199h-62.78ZM0 .38h168v16H0Z\"/></svg>");
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
