/** Bỏ dấu, hạ chữ thường, gộp khoảng trắng: "Nguyễn  Văn An" -> "nguyen van an". */
function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

function bigrams(text) {
  const counts = new Map();
  for (let i = 0; i < text.length - 1; i += 1) {
    const pair = text.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  return counts;
}

/**
 * Điểm tương đồng họ tên từ 0 đến 1 (hệ số Dice trên cặp ký tự liền nhau).
 * Chỉ dùng để sắp xếp cặp nghi trùng, không dùng để tự gộp (BR4).
 */
function nameSimilarity(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const left = bigrams(x);
  const right = bigrams(y);
  let overlap = 0;
  for (const [pair, n] of left) overlap += Math.min(n, right.get(pair) || 0);
  return (2 * overlap) / (x.length - 1 + y.length - 1);
}

module.exports = { normalizeName, nameSimilarity };
