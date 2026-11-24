// Admin login: one username and a scrypt password hash from the environment,
// and a signed, HttpOnly session cookie. No session table is needed.
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
export const SESSION_COOKIE = 'ya_admin';
export const SESSION_HOURS = 12;

/** @returns {Promise<string>} `scrypt$<salt hex>$<hash hex>`, safe to keep in .env */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password), salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [kind, saltHex, hashHex] = String(stored).split('$');
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(String(password), Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Equal-time string comparison for the username. */
export function sameText(a, b) {
  const x = createHmac('sha256', 'cmp').update(String(a)).digest();
  const y = createHmac('sha256', 'cmp').update(String(b)).digest();
  return timingSafeEqual(x, y);
}

// The password hash doubles as the signing key: changing the password signs everyone out.
const sign = (key, value) => createHmac('sha256', key).update(value).digest('base64url');

export function createSession(key, now = Date.now()) {
  const exp = String(now + SESSION_HOURS * 3600_000);
  return `${exp}.${sign(key, exp)}`;
}

export function checkSession(key, token, now = Date.now()) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || Number(exp) < now) return false;
  const want = Buffer.from(sign(key, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim());
  }
  return '';
}

// `node server/auth.js` reads a password on stdin and prints the line to put in .env.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', async () => {
    const password = input.replace(/\r?\n$/, '');
    if (password.length < 10) {
      console.error('Use a password of at least 10 characters.');
      process.exit(1);
    }
    console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
  });
}
