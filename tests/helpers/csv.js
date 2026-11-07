/** Dựng file CSV nhỏ cho test: tiêu đề đúng BR8, các dòng truyền vào, xuống dòng kiểu Windows, mã hóa UTF-8. */
const HEADER = 'ho_ten,so_dien_thoai,email,dia_chi,ngay_sinh,ngay_tao';

const csv = (...rows) => Buffer.from([HEADER, ...rows].join('\r\n'), 'utf8');

module.exports = { HEADER, csv };
