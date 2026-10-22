import { cp, mkdir, rm, access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {staticRoutes,prerender} from '../app.js';
const root = process.cwd();
const out = path.resolve(root, 'dist');
if (out !== path.join(root, 'dist')) throw new Error('Invalid output directory');
await rm(out, {recursive:true, force:true});
await mkdir(out, {recursive:true});
for (const name of ['index.html','styles.css','app.js','data.js','assets']) {
  await access(path.join(root,name));
  await cp(path.join(root,name),path.join(out,name),{recursive:true,filter:source=>{
    if(source.includes(path.sep+'source'))return false;
    if(source.includes(path.sep+'photos'+path.sep)&&!source.endsWith('.webp'))return false;
    return true;
  }});
}
const template=await readFile(path.join(root,'index.html'),'utf8');
function pageHtml(route){
 const result=prerender(route);
 const depth=route.split('/').filter(Boolean).length;
 const base=depth?'../'.repeat(depth):'./';
 let html=template.replace('<head>',`<head>\n    <base href="${base}">`).replace('<body>',`<body data-route="${route}">`)
 .replace('<div id="site-header"></div>',`<div id="site-header">${result.header}</div>`)
 .replace('<main id="main" tabindex="-1"></main>',`<main id="main" tabindex="-1">${result.content}</main>`)
 .replace('<div id="site-footer"></div>',`<div id="site-footer">${result.footer}</div>`)
 .replace('<title>Попугай — печатаем ваши идеи</title>',`<title>${result.title}</title>`)
 .replace('content="Попугай — печатаем ваши идеи"',`content="${result.title}"`);
 html=html.replace(/href="#\/([^"#]*)"/g,(_,target)=>{
   const [pathname,query]=target.split('?');
   return `href="./${pathname?pathname+'/':''}${query?'?'+query:''}"`;
 });
 return html;
}
for(const route of staticRoutes){
 const directory=path.join(out,...route.split('/').filter(Boolean));
 await mkdir(directory,{recursive:true});
 await writeFile(path.join(directory,'index.html'),pageHtml(route));
}
await writeFile(path.join(out,'404.html'),pageHtml('/missing').replace('<base href="../">','<base href="./">'));
await writeFile(path.join(out,'.nojekyll'),'');
await writeFile(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\n');
console.log(`Built ${staticRoutes.length} prerendered pages in dist/ — GitHub Pages compatible.`);
