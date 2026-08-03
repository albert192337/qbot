/**
 * market 烟测：构造一个最小合法 asset-pack → 上传 → 列表 → 下载校验字节
 * → 传封面 → 错 token 拒绝 → 下架 → 列表清空。
 * 用法：node smoke.mjs [http://host:24251]（默认 localhost）
 */
const BASE = process.argv[2] || 'http://127.0.0.1:24251';

function assert(cond, msg) {
  if (!cond) {
    console.error(`SMOKE FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ok: ${msg}`);
}

/** 最小合法包：manifest.json + 1 个假 webm（格式同 asset-pack.ts） */
function buildPack() {
  const manifest = Buffer.from(JSON.stringify({ name: '烟测角色', actions: {} }), 'utf8');
  const webm = Buffer.from('fake-webm-bytes-for-smoke');
  const files = [
    { path: 'manifest.json', size: manifest.length },
    { path: 'actions/idle.webm', size: webm.length },
  ];
  const header = Buffer.from(JSON.stringify({ files }), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(header.length);
  return Buffer.concat([len, header, manifest, webm]);
}

/** 最小 PNG（8B 魔数 + 随便凑的体） */
const fakePng = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('smoke'),
]);

const pack = buildPack();

// 上传
let res = await fetch(`${BASE}/skins?name=烟测角色&uploader=smoke`, {
  method: 'POST',
  body: pack,
});
assert(res.ok, `上传 → ${res.status}`);
const { hash, token } = await res.json();
assert(/^[0-9a-f]{16}$/.test(hash) && token?.length === 32, `拿到 hash=${hash} + token`);

// 重复上传去重
res = await fetch(`${BASE}/skins?name=x`, { method: 'POST', body: pack });
assert(res.status === 409, '重复上传 → 409 exists');

// 坏包拒收
res = await fetch(`${BASE}/skins`, { method: 'POST', body: Buffer.from('garbage') });
assert(res.status === 400, '坏包 → 400 bad_pack');

// 列表
res = await fetch(`${BASE}/skins`);
const { skins } = await res.json();
const mine = skins.find((s) => s.hash === hash);
assert(mine && mine.name === '烟测角色' && mine.actions === 1, '列表含新皮肤（动作数=1）');
assert(!('token' in mine), '列表不泄露 token');

// 下载校验字节
res = await fetch(`${BASE}/skins/${hash}/pack`);
const got = Buffer.from(await res.arrayBuffer());
assert(got.equals(pack), '下载字节与上传一致');

// 封面：错 token 拒、对 token 收、可读回
res = await fetch(`${BASE}/skins/${hash}/preview?token=wrong`, { method: 'POST', body: fakePng });
assert(res.status === 403, '错 token 传封面 → 403');
res = await fetch(`${BASE}/skins/${hash}/preview?token=${token}`, { method: 'POST', body: fakePng });
assert(res.ok, '封面上传');
res = await fetch(`${BASE}/skins/${hash}/preview`);
assert(res.ok && res.headers.get('content-type') === 'image/png', '封面可读回');

// 下架：错 token 拒、对 token 删
res = await fetch(`${BASE}/skins/${hash}?token=wrong`, { method: 'DELETE' });
assert(res.status === 403, '错 token 下架 → 403');
res = await fetch(`${BASE}/skins/${hash}?token=${token}`, { method: 'DELETE' });
assert(res.ok, '下架');
res = await fetch(`${BASE}/skins`);
assert(!(await res.json()).skins.some((s) => s.hash === hash), '列表已移除');

console.log('SMOKE OK');
