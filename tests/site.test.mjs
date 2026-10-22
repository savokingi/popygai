import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {products,categories,works,guides,bundles,calculatePrice,validContact} from '../data.js';
import {prerender,staticRoutes} from '../app.js';

test('Business cards use the published 96-piece kits, with no invented volume discounts',()=>{
 assert.equal(calculatePrice('business-cards',{quantity:96,paper:'coated',sides:'one'}),44.17);
 assert.equal(calculatePrice('business-cards',{quantity:192,paper:'coated',sides:'two'}),106.2);
 assert.equal(calculatePrice('business-cards',{quantity:96,paper:'calendered',sides:'two'}),66.45);
 assert.equal(calculatePrice('business-cards',{quantity:100}),null);
});
test('Leaflet estimates correspond to the correct format, sides and 100-piece kits',()=>{
 assert.equal(calculatePrice('flyers',{quantity:100,format:'A6',sides:'one'}),38.08);
 assert.equal(calculatePrice('flyers',{quantity:300,format:'A5',sides:'two'}),384.09);
 assert.equal(calculatePrice('flyers',{quantity:100,format:'A4',sides:'two'}),255.99);
 assert.equal(calculatePrice('flyers',{quantity:101}),null);
});
test('Document calculation counts physical sheets and handles two-sided colour correctly',()=>{
 assert.equal(calculatePrice('documents',{quantity:10,format:'A4',color:'bw',sides:'one'}),3.5);
 assert.equal(calculatePrice('documents',{quantity:10,format:'A3',color:'color',sides:'two'}),62.1);
 assert.equal(calculatePrice('documents',{quantity:2,format:'A4',color:'color',sides:'two'}),6.96);
});
test('Invalid and unsupported configurations never produce a misleading price',()=>{
 for(const quantity of [-1,0,NaN,Infinity,1.2])assert.equal(calculatePrice('documents',{quantity}),null);
 assert.equal(calculatePrice('documents',{quantity:5,format:'A0'}),null);
 assert.equal(calculatePrice('mugs',{quantity:50}),null);
 assert.equal(calculatePrice('business-cards',{quantity:96,paper:'unknown'}),null);
});
test('A request requires a usable phone number or a complete email address',()=>{
 for(const value of ['test@example.com','+375 (44) 588-08-55','8 029 123-45-67'])assert.ok(validContact(value),value);
 for(const value of ['','@','name@','hello','+375','55555','hello5555555'])assert.equal(validContact(value),false,value);
});
test('Catalog, collections, portfolio and guides have unique, valid relationships',()=>{
 for(const list of [products,categories,works,guides,bundles])assert.equal(new Set(list.map(i=>i.id)).size,list.length);
 for(const p of products)assert.ok(categories.some(c=>c.id===p.cat));
 for(const w of works)assert.ok(products.some(p=>p.id===w.product));
 for(const b of bundles)for(const id of b.items)assert.ok(products.some(p=>p.id===id));
 for(const g of guides)assert.ok(g.sections.length>=4);
});
test('All catalog and portfolio images and original identity assets are present locally',async()=>{
 const names=new Set([...products,...categories.slice(1),...works].map(p=>p.image==='certificates'?'business-cards':p.image));
 for(const name of names)await access(new URL(name.endsWith('-art')?`../assets/illustrations/${name}.svg`:`../assets/photos/${name}.webp`,import.meta.url));
 for(const name of ['wordmark-tight.svg','wordmark-white-tight.svg','parrot.png'])await access(new URL(`../assets/brand/${name}`,import.meta.url));
 const manifest=JSON.parse(await readFile(new URL('../assets/asset-manifest.json',import.meta.url),'utf8'));
 assert.ok(manifest.assets.length>=20);
});
test('Every public page has complete prerendered HTML, one main heading and the real brand',()=>{
 assert.equal(staticRoutes.length,42);
 for(const route of staticRoutes){
   const page=prerender(route);
   assert.equal((page.content.match(/<h1[ >]/g)||[]).length,1,route);
   assert.ok(page.content.length>1000,route);
   assert.ok(page.header.includes('wordmark-tight.svg'),route);
   assert.ok(page.title.endsWith(' — Попугай'),route);
   assert.ok(!page.content.includes('[object Object]'),route);
 }
 assert.ok(prerender('/catalog').content.includes('Фото на документы'));
});
