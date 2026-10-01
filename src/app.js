/* Progressive enhancement only: every comparison is already complete static HTML. */
document.documentElement.classList.add('js');
const body = document.body;
const base = new URL(body.dataset.base, location.href);
const allowed = {family:['heading','table','caveat'],document:['fr','en'],tool:['readability','trafilatura','readability_lxml','newspaper4k','justext','html2text','markdownify'],ui:['fr','en']};
const form = document.getElementById('comparison-controls');
if(form) form.addEventListener('submit',event=>{
  event.preventDefault();
  const values = new FormData(form);
  const target = `cases/${body.dataset.ui}-${values.get('family')}-${values.get('document')}-${values.get('tool')}.html#comparison`;
  location.assign(new URL(target,base));
});
if(form && location.search){
  const params = new URLSearchParams(location.search);
  const state = {family:body.dataset.family,document:body.dataset.document,tool:body.dataset.tool,ui:body.dataset.ui};
  let invalid = false;
  for(const [key,value] of params){if(!allowed[key]?.includes(value) || params.getAll(key).length!==1) invalid=true;else state[key]=value;}
  if(invalid){
    const notice = document.getElementById('parameter-notice');notice.hidden=false;
    notice.textContent=body.dataset.ui==='en'?'Unknown or repeated parameter. The comparison shown below remains selected. Choose another combination or use the complete index.':'Paramètre inconnu ou répété. La comparaison ci-dessous reste sélectionnée. Choisissez une autre combinaison ou utilisez l’index complet.';
  }else{
    location.replace(new URL(`cases/${state.ui}-${state.family}-${state.document}-${state.tool}.html#comparison`,base));
  }
}
