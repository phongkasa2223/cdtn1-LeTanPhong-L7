/** Tạo .env từ .env.example, tự sinh mật khẩu DB và khóa JWT ngẫu nhiên. Không ghi đè .env đã có. */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.env');

if (fs.existsSync(target)) {
  process.stdout.write('.env đã có, giữ nguyên.\n');
  process.exit(0);
}

const secret = () => randomBytes(24).toString('hex');
const text = fs.readFileSync(path.join(root, '.env.example'), 'utf8')
  .replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${secret()}`)
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret()}`);

fs.writeFileSync(target, text, { flag: 'wx' });
process.stdout.write('Đã tạo .env (mật khẩu DB và JWT_SECRET sinh ngẫu nhiên).\n');
