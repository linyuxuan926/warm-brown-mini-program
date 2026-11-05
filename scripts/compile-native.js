/* Optional official wcc/wcsc compiler check. Compiler stays outside miniprogram/. */
const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..','miniprogram');
const bin=path.resolve(__dirname,'..','tools-cache','node_modules','miniprogram-compiler','bin',process.platform==='win32'?'windows':process.platform==='darwin'?'mac':'linux');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root);const relative=f=>path.relative(root,f).replace(/\\/g,'/');
const wxmls=files.filter(f=>f.endsWith('.wxml')).map(relative);const wxsss=files.filter(f=>f.endsWith('.wxss')).map(relative);
let count=0;const custom=[];
files.filter(f=>f.endsWith('.json')).forEach(file=>{const config=JSON.parse(fs.readFileSync(file,'utf8'));if(config.usingComponents){count++;custom.push(relative(file).replace(/\.json$/,'.wxml'),Object.keys(config.usingComponents).length,...Object.keys(config.usingComponents));}});
const wcc=path.join(bin,'wcc'+(process.platform==='win32'?'.exe':''));const wcsc=path.join(bin,'wcsc'+(process.platform==='win32'?'.exe':''));
if(!fs.existsSync(wcc)){console.error('Optional compiler missing. Run: npm install --prefix tools-cache --no-audit --no-fund --ignore-scripts miniprogram-compiler@0.2.3');process.exit(1);}
const builds=[{name:'WXML',bin:wcc,args:['-d','-cc',[count,...custom].join(' '),...wxmls,'-gn','$gwx']},{name:'WXSS',bin:wcsc,args:['-db',...wxsss]}];
const report=[];
for(const build of builds){const result=spawnSync(build.bin,build.args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});const passed=result.status===0&&!result.error;report.push({kind:build.name,templates:build.name==='WXML'?wxmls.length:wxsss.length,passed,status:result.status,stderr:result.stderr||'',error:result.error?result.error.message:''});console.log(build.name+': '+(passed?'PASS':'FAIL')+' ('+(build.name==='WXML'?wxmls.length:wxsss.length)+' files)');if(!passed)console.error(result.stderr||result.error);}
fs.mkdirSync(path.resolve(__dirname,'..','artifacts'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'..','artifacts','native-compile.json'),JSON.stringify({compiler:'wechat-miniprogram/miniprogram-compiler@0.2.3 bundled wcc/wcsc (legacy compiler, not a DevTools runtime)',checkedAt:new Date().toISOString(),results:report},null,2));
if(report.some(r=>!r.passed))process.exit(1);
