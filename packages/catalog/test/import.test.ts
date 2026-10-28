import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanText, parseFeed, parseAge, parseDimensions, validEAN, validateImport } from '../src/index';

test('provided feed: all 68 products retain stable IDs and leading-zero EAN semantics',async()=>{
  const snapshot=await parseFeed(await readFile('five_brands.xml','utf8'));
  assert.equal(snapshot.products.length,68);
  assert.equal(new Set(snapshot.products.map(p=>p.id)).size,68);
  assert.ok(snapshot.products.every(p=>p.brand==='INKATOYS'&&validEAN(p.ean)));
  assert.equal(snapshot.products.filter(p=>p.available).length,59);
  assert.equal(snapshot.products.flatMap(p=>p.images).length,314);
  assert.ok(snapshot.products[0].description.includes("М'яконабивна"));
  assert.ok(!snapshot.products[0].description.includes('&#'));
  assert.ok(snapshot.products[0].attributes.find(a=>a.name.startsWith('Розміри'))?.unit===null);
});
test('malformed and empty feeds fail before import',async()=>{
  await assert.rejects(parseFeed('<yml_catalog><shop>'),/Invalid XML/);
  await assert.rejects(parseFeed('<yml_catalog><shop><offers/></shop></yml_catalog>'));
});
test('clean nested HTML entities without retaining executable markup',()=>{
  assert.equal(cleanText('&lt;script&gt;alert(1)&lt;/script&gt;М&amp;#39;яка &amp;quot;іграшка&amp;quot;'),`М'яка "іграшка"`);
});
test('age union keeps open upper bound; unknown ages stay unknown',()=>{
  assert.deepEqual(parseAge('3-6 років|6-12 років|від 12 років'),{min:3,max:null});
  assert.deepEqual(parseAge('6-12 років'),{min:6,max:12});
  assert.deepEqual(parseAge(''),{min:null,max:null});
});
test('parse dimensional values without assuming source units',()=>{
  assert.deepEqual(parseDimensions('200х170х500'),[200,170,500]);
  assert.deepEqual(parseDimensions('20,5 × 17 × 50'),[20.5,17,50]);
  assert.equal(parseDimensions('n/a'),null);
});
test('EAN checks reject changed check digits and preserve strings',()=>{
  assert.equal(validEAN('4820266221478'),true);
  assert.equal(validEAN('4820266221479'),false);
  assert.equal(validEAN('482026622147'),false);
});
test('loss protection is applied per brand and permits exactly 30%',()=>{
  const previous=Array.from({length:10},(_,i)=>({id:String(i),brand:'A'}));
  assert.doesNotThrow(()=>validateImport(previous,previous.slice(0,7)));
  assert.throws(()=>validateImport(previous,previous.slice(0,6)),/30%/);
  assert.throws(()=>validateImport(previous,[{id:'100',brand:'B'}]),/30%/);
  assert.throws(()=>validateImport([],[]),/Порожній/);
  assert.throws(()=>validateImport([],[previous[0],previous[0]]),/Duplicate/);
});
