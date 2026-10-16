import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

// Executes rendering and event logic against isolated document/storage doubles.
// This does not control a browser or claim to verify visual layout.
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const elements=new Map(), listeners={}, storage=new Map(), checks=[];
function element(){return {innerHTML:'',textContent:'',value:'',dataset:{},style:{},open:false,isConnected:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false}}}
for(const id of ['#main','#header','#footer','#cookie','#toast','#overlay','#site-search','#search-results'])elements.set(id,element());
const location={pathname:'/',search:'',hash:'',origin:'http://localhost:8088'};
const context=vm.createContext({URLSearchParams,URL,console,location,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener:(k,fn)=>listeners[k]=fn,body:{style:{}},documentElement:{},activeElement:null},window:{addEventListener(){},scrollTo(){}},history:{replaceState(a,b,url){location.pathname=url},pushState(a,b,url){location.pathname=url}},setTimeout:()=>0,clearTimeout(){},matchMedia:()=>({matches:true})});
const data=fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^export /gm,'');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/^import[^\n]*\n/,'');
vm.runInContext(data+'\n'+app,context);
const run=code=>vm.runInContext(code,context);
const check=(label,fn)=>{fn();checks.push(label)};
const click=dataset=>listeners.click({target:{closest:s=>s==='button'?{dataset}:null},button:0});
const allProducts=run('products');
check('Three silk rugs across three edits',()=>{assert.equal(allProducts.length,3);assert.equal(new Set(allProducts.map(p=>p.id)).size,3);assert.equal(run('Object.keys(collections).length'),3)});
for(const language of ['ar','en']){
 run(`lang='${language}'`);
 for(const p of allProducts){
  context.testProduct=p;
  check(`${language}: complete page and local images for ${p.id}`,()=>{
   const html=run('productPage(testProduct)');
   assert.ok(html.includes(language==='ar'?p.ar:p.en));
   assert.ok(!html.includes('undefined'));
   for(const [,src] of html.matchAll(/src="(\/assets\/[^\"]+)"/g)) assert.ok(fs.existsSync(path.join(root,src)),src);
   if(p.partner){assert.ok(html.includes(p.source));assert.ok(html.includes(language==='ar'?'الصور من رحال':'Original RIHAL photography'));}
  });
 }
 for(const route of ['/','/catalog','/about','/concierge','/gifting','/buyers','/journal','/provenance','/contact','/care','/privacy','/terms','/favorites','/request',...run('Object.keys(collections)').map(id=>'/collections/'+id),...run('articles.map(a=>a.id)').map(id=>'/journal/'+id)]){
  check(`${language}: render ${route}`,()=>{location.pathname=route;run('render(false)');const html=elements.get('#main').innerHTML;assert.ok(html.length>100);assert.ok(!html.includes('undefined'));assert.ok(!/IRTH|RIHAL|رحال|إرث|كسوة/.test(html));assert.ok(!html.includes(language==='ar'?'الصفحة المطلوبة غير موجودة':'The requested page could not be found'))});
 }
 check(`${language}: search finds the requested rug`,()=>{elements.get('#site-search').value='Safaa';run('searchResults()');const html=elements.get('#search-results').innerHTML;assert.ok(html.includes('/products/safaa-silk'));assert.ok(!html.includes('/products/noor-silk'))});
}
check('Collection filter and query combine correctly',()=>{
 elements.set('[data-catalog]',{dataset:{catalog:'navy'}});elements.set('#catalog-search',{value:'Noor'});elements.set('#sort',{value:'curated'});elements.set('#catalog-items',element());location.pathname='/collections/navy';run('updateCatalog()');const html=elements.get('#catalog-items').innerHTML;assert.ok(html.includes('/products/noor-silk'));assert.ok(!html.includes('/products/safaa-silk'));elements.delete('[data-catalog]');
});
check('Rug bag item preserves image, quantity and removal',()=>{
 click({add:'noor-silk'});click({add:'noor-silk'});assert.equal(JSON.parse(storage.get('tiraze-bag'))[0].qty,2);assert.ok(elements.get('#overlay').innerHTML.includes('carpet.webp'));click({remove:'0'});assert.deepEqual(JSON.parse(storage.get('tiraze-bag')),[]);
});
check('Tiraze storage does not overwrite the original brand',()=>{assert.ok(![...storage.keys()].some(k=>k.startsWith('irth-')))});
check('Language switch persists English and Arabic',()=>{run("lang='ar'");click({action:'language'});assert.equal(JSON.parse(storage.get('tiraze-lang')),'en');assert.equal(run('document.documentElement.dir'),'ltr');click({action:'language'});assert.equal(run('document.documentElement.dir'),'rtl')});
check('Mobile menu exposes search and silk rug navigation',()=>{click({action:'menu'});const html=elements.get('#overlay').innerHTML;assert.ok(html.includes('data-action="search"'));assert.ok(html.includes('/care'))});
fs.writeFileSync(path.join(root,'interaction-verification.json'),JSON.stringify({method:'Isolated JavaScript document/storage doubles; no browser layout verification',passed:checks.length,checks},null,2));
console.log(`PASS ${checks.length} rendering and interaction checks; no real browser storage modified.`);
