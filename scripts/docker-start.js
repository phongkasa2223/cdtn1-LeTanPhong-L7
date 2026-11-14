/**
 * Điểm vào của container app: chờ CSDL nhận kết nối, chạy migration, nạp dữ liệu mẫu (nếu SEED_DEMO_DATA không phải
 * "false"), rồi khởi động API. Migration và seed đều chạy lại được nên khởi động lại container không nhân đôi dữ liệu.
 * Viết bằng Node thay vì shell để không dính lỗi xuống dòng CRLF hay thiếu quyền thực thi trên máy khác.
 */
const { runSqlDir } = require('./run-sql');

const ATTEMPTS = 30;
const DELAY_MS = 2000;

const say = (text) => process.stdout.write(`[docker-start] ${text}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Chạy `work`; lỗi thì chờ rồi thử lại tối đa ATTEMPTS lần (CSDL vừa khởi tạo có thể chưa nhận kết nối ngay). */
async function withRetry(label, work) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (err) {
      if (attempt >= ATTEMPTS) throw err;
      say(`${label} chưa được (${err.code || err.message}), thử lại ${attempt}/${ATTEMPTS}`);
      await sleep(DELAY_MS);
    }
  }
}

async function main() {
  const log = (line) => process.stdout.write(`[docker-start] ${line}`);
  await withRetry('migrations', () => runSqlDir('migrations', { log }));
  if (process.env.SEED_DEMO_DATA === 'false') {
    say('SEED_DEMO_DATA=false: bỏ qua dữ liệu mẫu');
  } else {
    await runSqlDir('seeds', { log });
  }
  say('khởi động API');
  require('../src/server'); // eslint-disable-line global-require -- chỉ nạp sau khi CSDL sẵn sàng
}

main().catch((err) => {
  process.stderr.write(`[docker-start] LỖI: ${err.message}\n`);
  process.exit(1);
});
