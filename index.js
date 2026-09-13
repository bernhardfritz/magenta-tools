import { CookieJar } from 'tough-cookie';
import { createHash, createCipheriv } from 'crypto';
import 'dotenv/config';
import _ from 'lodash';

async function encryptPassword(sessionToken, password) {
    // 1. Generate key and IV using SHA256 and MD5 hashes
    const key = createHash('sha256').update(sessionToken).digest();
    const iv = createHash('md5').update(sessionToken).digest();

    // 2. Encrypt using AES-256-CBC with PKCS7 padding (Node's default padding)
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let ciphertext = cipher.update(password, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // 3. Replicate the original double-Base64 logic:
    // Convert base64 ciphertext back to a Hex string (matching CryptoJS.enc.Base64.parse().toString())
    const hexString = Buffer.from(ciphertext, 'base64').toString('hex');

    // Prepend a colon and encode the final string to Base64
    const finalResult = Buffer.from(":" + hexString).toString('base64');

    return finalResult;
}

if (!process.env.PASSWORD) {
  throw new Error('Environment variable PASSWORD is not set.');
}

const host = 'http://192.168.0.1';
const cookieJar = new CookieJar();

console.log('Retrieving token...');
let res = await fetch(`${host}/`);
await cookieJar.setCookie(res.headers.get('set-cookie'), `${host}/`);
console.log('Token retrieved successfully!');

const sessionToken = _.find(await cookieJar.getCookies(`${host}/`), {
    key: 'sessionToken',
  }).value;
const encryptedPassword = encryptPassword(sessionToken, process.env.PASSWORD);

console.log('Logging in...');
res = await fetch(`${host}/xml/setter.xml`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Cookie: await cookieJar.getCookieString(`${host}/`),
  },
  body: new URLSearchParams({
    token: sessionToken,
    fun: 15,
    Username: 'NULL',
    Password: encryptedPassword,
  }),
});
await cookieJar.setCookie(res.headers.get('set-cookie'), `${host}/`);
const text = await res.text();
if (!/successful;SID=\d/.test(text)) {
  throw new Error('Login failed!');
}
console.log('Logged in successfully!');

console.log('Restarting router...');
await fetch(`${host}/xml/setter.xml`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Cookie: await cookieJar.getCookieString(`${host}/`),
  },
  body: new URLSearchParams({
    token: _.find(await cookieJar.getCookies(`${host}/`), {
      key: 'sessionToken',
    }).value,
    fun: 8,
  }),
});
console.log('Router is now restarting!');
