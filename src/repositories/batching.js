/** Chia mảng thành các lô nhỏ để INSERT hoặc IN theo từng lô (tránh câu lệnh quá lớn). */
const CHUNK_SIZE = 500;

/** Trả về từng cặp [vị trí đầu lô, lô]. */
function* chunks(list, size = CHUNK_SIZE) {
  for (let offset = 0; offset < list.length; offset += size) {
    yield [offset, list.slice(offset, offset + size)];
  }
}

module.exports = { chunks, CHUNK_SIZE };
