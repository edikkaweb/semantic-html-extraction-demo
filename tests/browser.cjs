/* Optional browser checks. Install the documented test dependencies first. */
const {chromium,firefox}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=process.env.DEMO_URL||'http://127.0.0.1:4180/semantic-html-extraction-demo/';
const out=process.env.TEST_OUTPUT||path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(root,'data/display.json')));
const engine=process.env.BROWSER||'chromium';
const report={date:new Date().toISOString(),base,engine,allComparisons:[],scenarios:[],axe:[],limitations:['Automated checks are not a complete accessibility audit.','No screen reader or independent AI agent test.'],passed:false};
(async()=>{
 const browser=await (engine==='firefox'?firefox:chromium).launch(engine==='firefox'?{headless:true}:{channel:'chrome',headless:true});report.browserVersion=browser.version();
 try{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),p=await context.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const ui of ['fr','en'])for(const family of ['heading','table','caveat'])for(const doc of ['fr','en'])for(const tool of Object.keys(data.cases[0].outcomes)){
  const url=`cases/${ui}-${family}-${doc}-${tool}.html`;
  assert.equal((await p.goto(base+url,{waitUntil:'load'})).status(),200,url);
  const observed=await p.evaluate(()=>({lang:document.documentElement.lang,cases:[...document.querySelectorAll('.observations')].map(e=>({id:e.dataset.case,tool:e.dataset.tool,rows:[...e.querySelectorAll('dd')].map(v=>({field:v.dataset.field,value:v.dataset.value}))})),overflow:document.documentElement.scrollWidth>innerWidth,headings:document.querySelectorAll('h1').length}));
  assert.equal(observed.lang,ui);assert.equal(observed.overflow,false,url);assert.equal(observed.headings,1);assert.equal(observed.cases.length,2);
  for(const v of observed.cases){const c=data.cases.find(c=>c.id===v.id),verdict=c.outcomes[tool].verdict;assert.equal(c.language,doc);assert.equal(c.family,family);assert.equal(v.tool,tool);for(const [i,row]of v.rows.entries()){
   if(verdict.status!=='ok'){assert.equal(row.value,'not_evaluated');continue;}
   if(family==='heading'&&i===0){assert.equal(row.value,['explicit','markdown_heading','text_only'].includes(verdict.heading_relation)?'present':'absent');continue;}
   if(row.field.includes('expected.json')){assert.equal(row.value,'not_evaluated');continue;}
   assert.equal(row.value,verdict[row.field]??(row.field==='heading_level'?'none_detected':'not_evaluated'),`${url}/${row.field}`);
  }}
  assert.equal(await p.locator('.controls').isVisible(),false);report.allComparisons.push({url,noJS:true,mobile:true,passed:true});
 }
 assert.deepEqual(errors,[]);await context.close();
 const scenarios=[['fr','caveat','fr','readability'],['en','table','en','trafilatura'],['fr','heading','en','justext'],['en','table','fr','markdownify']];
 for(const [ui,family,doc,tool] of scenarios)for(const width of [390,1440])for(const js of [true,false]){
  const c=await browser.newContext({javaScriptEnabled:js,viewport:{width,height:1000}}),p=await c.newPage(),network=[],pageErrors=[];
  p.on('pageerror',e=>pageErrors.push(e.message));p.on('request',r=>network.push(r.url()));
  const url=`cases/${ui}-${family}-${doc}-${tool}.html#comparison`;await p.goto(base+url,{waitUntil:'networkidle'});
  assert.equal(await p.locator('.variant').count(),2);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const rects=await p.locator('.variant').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
  if(width===1440)assert.equal(rects[0].y,rects[1].y);else assert(rects[1].y>rects[0].y);
  await p.locator('.proof summary').first().press('Enter');assert.equal(await p.locator('.proof').first().getAttribute('open'),'');
  assert.equal(await p.locator('.proof pre').first().isVisible(),true);
  assert(network.every(u=>u.startsWith(base)),`external runtime request: ${network}`);
  if(js){assert.equal(await p.locator('.controls').isVisible(),true);await p.getByLabel(ui==='fr'?'Famille de cas':'Case family',{exact:true}).selectOption('table');await p.getByRole('button',{name:ui==='fr'?'Comparer':'Compare',exact:true}).click();await p.waitForURL(base+`cases/${ui}-table-${doc}-${tool}.html#comparison`);await p.reload();assert.equal(await p.locator('body').getAttribute('data-family'),'table');}
  assert.deepEqual(pageErrors,[]);report.scenarios.push({url,width,js,passed:true});await c.close();
 }
 const c=await browser.newContext({viewport:{width:1440,height:1000}}),p2=await c.newPage();
 await p2.goto(base+'?family=table&document=en&tool=trafilatura&ui=en');await p2.waitForURL(base+'cases/en-table-en-trafilatura.html#comparison');
 await p2.goto(base+'?tool=unknown');assert.equal(await p2.locator('#parameter-notice').isVisible(),true);assert.equal(await p2.locator('body').getAttribute('data-tool'),'readability');
 await p2.goto(base+'?tool=justext&tool=readability');assert.equal(await p2.locator('#parameter-notice').isVisible(),true);
 await p2.goto(base);await p2.keyboard.press('Tab');assert.equal(await p2.evaluate(()=>document.activeElement.className),'skip');await p2.keyboard.press('Enter');
 let hitCode=false,hitSelect=false,hitSummary=false;
 for(let i=0;i<35;i++){await p2.keyboard.press('Tab');const el=await p2.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle,focus:document.activeElement.matches(':focus-visible')}));if(['PRE','SELECT','SUMMARY'].includes(el.tag)){assert(el.focus&&el.outline!=='none');hitCode ||=el.tag==='PRE';hitSelect ||=el.tag==='SELECT';hitSummary ||=el.tag==='SUMMARY';if(el.tag==='SUMMARY'){await p2.keyboard.press('Enter');assert.equal(await p2.locator('.proof').first().getAttribute('open'),'');break;}}}
 assert(hitCode&&hitSelect&&hitSummary,'keyboard reaches selectors, source regions and proof summary');report.keyboard={passed:true};
 const axeFile=process.env.AXE_PATH||require.resolve('axe-core/axe.min.js');
 for(const ui of ['fr','en'])for(const page of ['index','method','real','sources']){
  await p2.goto(base+(page==='index'?(ui==='fr'?'index.html':'index-en.html'):`${ui}-${page}.html`));
  if(page==='index')await p2.locator('.proof summary').first().click();
  await p2.addScriptTag({path:axeFile});const a=await p2.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});report.axe.push({ui,page,...a});assert.equal(a.violations.length,0,JSON.stringify(a.violations));
 }
 await p2.goto(base);await p2.screenshot({path:path.join(out,'desktop-home.png')});await p2.goto(base+'#comparison');await p2.screenshot({path:path.join(out,'desktop-comparison.png')});await p2.setViewportSize({width:390,height:844});await p2.goto(base+'#comparison');await p2.screenshot({path:path.join(out,'mobile-comparison.png')});
 await c.close();report.passed=true;
 }catch(e){report.error=e.stack;process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(out,'browser-'+engine+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,comparisons:report.allComparisons.length,scenarios:report.scenarios.length,axe:report.axe.length,error:report.error},null,2));}
})();
