const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validListing, normalizeListings, verifiedPhoto, buildReferences, filterListings } = require('../crib/app.js');
const data = require('../crib/data.js');
// Synthetic fixtures only; never published as marketplace observations.
const row = (overrides = {}) => ({
  id: '1234567890123', url: 'https://www.goofish.com/item?id=1234567890123',
  title: '测试床源', price: 200, bedType: '折叠床', material: '布网与钢架',
  district: '雨花区', status: 'observed', observedAt: '2026-09-08T12:00:00+08:00',
  evidence: '仅测试夹具', photo: null, ...overrides
});
const another = overrides => row({ id: '1234567890124',
  url: 'https://www.goofish.com/item?id=1234567890124', ...overrides });

test('empty source data produces no invented reference catalogue', () => {
  assert.deepEqual(buildReferences([]), []);
  assert.deepEqual(normalizeListings([]), []);
});
test('admission requires real source fields and ID matching', () => {
  assert.equal(validListing(row()), true);
  for (const override of [
    {url: 'https://www.goofish.com/item?id=999'}, {url:'https://evil.example/item?id=1234567890123'},
    {evidence:''}, {observedAt:'invalid'}, {price:-1}, {price:undefined}, {status:'优先看'}
  ]) assert.equal(validListing(row(override)), false);
});
test('no brand, low prices, arbitrary and unknown materials remain admissible', () => {
  for (const material of ['实木', '铝合金', '钢架与布网', '复合材料', '其他结构', '待核实']) {
    assert.equal(validListing(row({material, brand:null, price:5})), true);
    assert.equal(buildReferences([row({material})])[0].material, material);
  }
});
test('latest observation wins before aggregation; unavailable removes reference sample', () => {
  const older = row({price:100});
  const newer = row({price:300,observedAt:'2026-09-08T13:00:00+08:00'});
  assert.equal(normalizeListings([newer,older]).length,1);
  assert.equal(buildReferences([older,newer])[0].minPrice,300);
  assert.deepEqual(buildReferences([older,{...newer,status:'unavailable'}]),[]);
});
test('groups reflect actual type/material and trace to sample records', () => {
  const a = row();
  const b = another({price:400});
  const groups = buildReferences([a,b]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].items.length,2);
  assert.equal(groups[0].minPrice,200);
  assert.equal(groups[0].maxPrice,400);
  assert.equal(buildReferences([a,another({material:'铝合金'})]).length,2);
});
test('unknown price never becomes zero and sorts last in both directions', () => {
  const unknown = another({price:null});
  assert.equal(buildReferences([unknown])[0].minPrice,null);
  for (const sort of ['price-asc','price-desc']) {
    assert.equal(filterListings([unknown,row()],{sort})[1].price,null);
  }
});
test('filters compose and text search is case insensitive', () => {
  const a = row({brand:'Example'});
  assert.equal(filterListings([a,another({district:'岳麓区'})],
    {query:'EXAMPLE',district:'雨花区',type:'折叠床',material:'布网与钢架',status:'observed'}).length,1);
  assert.equal(filterListings([a],{material:'实木'}).length,0);
  assert.equal(filterListings([a,row({status:'unavailable',observedAt:'2026-09-08T13:00:00+08:00'})],
    {status:'observed'}).length,0);
});
test('photo must belong to the same source item; no cross-item or brand fallback', () => {
  const item = row();
  const photo = {url:'https://img.alicdn.com/test.jpg',itemId:item.id,sourceUrl:item.url,verified:true};
  assert.equal(verifiedPhoto({...item,photo}),photo.url);
  assert.equal(verifiedPhoto(item),null);
  for (const change of [
    {itemId:'999'}, {sourceUrl:'https://www.goofish.com/item?id=999'},
    {verified:false}, {url:'javascript:alert(1)'}, {url:'https://alicdn.com.evil.example/x.jpg'}
  ]) assert.equal(verifiedPhoto({...item,photo:{...photo,...change}}),null);
});
test('production records are valid, unique and cannot reuse known stroller photos', () => {
  const stroller = fs.readFileSync(path.join(__dirname,'../stroller/data.js'),'utf8');
  assert.equal(normalizeListings(data.listings).length,data.listings.length);
  for (const item of data.listings) {
    assert.ok(validListing(item));
    if (item.photo) {
      assert.ok(verifiedPhoto(item));
      assert.equal(stroller.includes(item.photo.url),false);
    }
  }
});
test('README removes private deployment references', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../README.md'),'utf8'),/sensen\.li/i);
});
