const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeName, nameSimilarity } = require('../src/services/similarity');
const { scorePairs } = require('../src/services/import.service');

test('TC-D1 normalizeName bỏ dấu, hạ chữ thường, gộp khoảng trắng', () => {
  assert.equal(normalizeName('  Nguyễn   VĂN  Đạt '), 'nguyen van dat');
  assert.equal(normalizeName(null), '');
});

test('TC-D2 cùng họ tên khác dấu/hoa thường thì giống nhau hoàn toàn (1.00)', () => {
  assert.equal(nameSimilarity('Nguyễn Văn An', 'NGUYEN VAN AN'), 1);
});

test('TC-D3 tên gần giống thì cao nhưng dưới 1; tên khác hẳn thì thấp', () => {
  const near = nameSimilarity('Nguyen Van An', 'Nguyen Van Anh');
  assert.ok(near > 0.8 && near < 1, `near = ${near}`);
  assert.ok(nameSimilarity('Nguyen Van An', 'Tran Thi Bich') < 0.3);
});

test('TC-D4 giá trị biên: tên rỗng hoặc quá ngắn cho điểm 0', () => {
  assert.equal(nameSimilarity('', 'An'), 0);
  assert.equal(nameSimilarity('A', 'B'), 0);
});

test('TC-D5 scorePairs gộp một cặp thành một dòng, ưu tiên khớp theo email và xếp id nhỏ trước', () => {
  const pairs = scorePairs([
    { aId: 5, bId: 2, aName: 'Lê Nam', bName: 'Le Nam', matchedBy: 'NAME_BIRTHDATE' },
    { aId: 2, bId: 5, aName: 'Le Nam', bName: 'Lê Nam', matchedBy: 'EMAIL' },
    { aId: 7, bId: 9, aName: 'An', bName: 'Binh', matchedBy: 'NAME_BIRTHDATE' },
  ]);
  assert.equal(pairs.length, 2);
  assert.deepEqual(pairs[0], { aId: 2, bId: 5, matchedBy: 'EMAIL', similarity: 1 });
  assert.equal(pairs[1].aId, 7);
});
