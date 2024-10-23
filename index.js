import { CookieJar } from 'tough-cookie';
import { createHash } from 'crypto';
import 'dotenv/config';
import _ from 'lodash';

if (!process.env.PASSWORD) {
  throw new Error('Environment variable PASSWORD is not set.');
}

const hashedPassword = createHash('sha256')
  .update(process.env.PASSWORD)
  .digest('hex');
const host = 'http://192.168.0.1';
const cookieJar = new CookieJar();

console.log('Retrieving token...');
let res = await fetch(`${host}/`);
await cookieJar.setCookie(res.headers.get('set-cookie'), `${host}/`);
console.log('Token retrieved successfully!');

console.log('Logging in...');
res = await fetch(`${host}/xml/setter.xml`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Cookie: await cookieJar.getCookieString(`${host}/`),
  },
  body: new URLSearchParams({
    token: _.find(await cookieJar.getCookies(`${host}/`), {
      key: 'sessionToken',
    }).value,
    fun: 15,
    Username: 'NULL',
    Password: hashedPassword,
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
