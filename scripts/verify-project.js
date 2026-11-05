/* Native-source validation. No generated web application or runtime dependency. */
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {inspectComponentGraph} = require('./lib/component-graph');
const root = path.resolve(__dirname, '..', 'miniprogram');
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]); }
const files=walk(root);const errors=[];
const relative=f=>path.relative(root,f).replace(/\\/g,'/');
const jsons=files.filter(f=>f.endsWith('.json'));
jsons.forEach(f=>{try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){errors.push(relative(f)+': '+e.message);}});
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
app.pages.forEach(route=>['.js','.json','.wxml','.wxss'].forEach(ext=>{if(!fs.existsSync(path.join(root,route+ext)))errors.push('Missing route file: '+route+ext);}));
app.tabBar.list.forEach(tab=>['iconPath','selectedIconPath'].forEach(key=>{if(!fs.existsSync(path.join(root,tab[key])))errors.push('Missing tab icon '+tab[key]);}));
const jsFiles=files.filter(f=>f.endsWith('.js'));
jsFiles.forEach(file=>{const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)errors.push(relative(file)+': '+result.stderr);});
const wxmlFiles=files.filter(f=>f.endsWith('.wxml'));
wxmlFiles.forEach(file=>{
  const source=fs.readFileSync(file,'utf8');
  const js=fs.readFileSync(file.replace(/\.wxml$/,'.js'),'utf8');
  for(const match of source.matchAll(/(?:bind|catch)(?::[\w-]+|[\w-]+)\s*=\s*["']([\w]+)["']/g)){
    if(!(new RegExp('\\b'+match[1]+'\\s*\\(')).test(js))errors.push(relative(file)+': unbound handler '+match[1]);
  }
  for(const match of source.matchAll(/src=["'](\/assets\/[^"'{}]+)["']/g))if(!fs.existsSync(path.join(root,match[1])))errors.push(relative(file)+': missing asset '+match[1]);
});
const componentGraph=inspectComponentGraph(root);
errors.push(...componentGraph.errors);
const packageBytes=files.reduce((sum,f)=>sum+fs.statSync(f).size,0);
console.log('Native sources: '+app.pages.length+' routes, '+wxmlFiles.length+' WXML templates, '+jsFiles.length+' JavaScript files, '+files.filter(f=>f.endsWith('.png')).length+' PNGs; '+(packageBytes/1024).toFixed(1)+' KB.');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Routes, JSON, JavaScript syntax, handlers, '+componentGraph.components.size+' component bundles/registrations/dependencies, WXML aliases and static image paths: PASS');
