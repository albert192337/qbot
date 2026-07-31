// CDP 驱动：打开 Studio 页 → 检查联动配置区域 → 中文输入动作名
const CDP = 'http://127.0.0.1:9223/json';

async function targets() {
  const r = await fetch(CDP);
  return r.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const ready = new Promise((res) => ws.addEventListener('open', res));
  return {
    ready,
    ws,
    send(method, params = {}) {
      const myId = ++id;
      ws.send(JSON.stringify({ id: myId, method, params }));
      return new Promise((res) => pending.set(myId, res));
    },
  };
}

async function evaluate(cli, expression) {
  const r = await cli.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    return { error: JSON.stringify(r.result.exceptionDetails) };
  }
  return r.result?.result?.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1. 连 pet 页，调 studio.open()
  const petTarget = (await targets()).find((t) => t.url.includes('/pet/'));
  if (!petTarget) throw new Error('pet target not found');
  const pet = connect(petTarget.webSocketDebuggerUrl);
  await pet.ready;
  await pet.send('Runtime.enable');
  console.log('[1] pet 页已连接');

  await evaluate(pet, 'window.qbot.studio.open()');
  console.log('[2] 已调用 studio.open()');
  await sleep(4000);

  // 2. 连 studio 页
  const studioTarget = (await targets()).find((t) => t.url.includes('/studio/'));
  if (!studioTarget) throw new Error('studio target not found — 窗口没打开');
  const st = connect(studioTarget.webSocketDebuggerUrl);
  await st.ready;
  await st.send('Runtime.enable');
  await st.send('Page.enable');
  console.log('[3] studio 页已连接:', studioTarget.url);

  await sleep(2500);

  // 3. 检查联动配置区域
  const report = await evaluate(st, `(() => {
    const h3s = [...document.querySelectorAll('#tab-actions h3')].map(h => h.textContent);
    const selects = [...document.querySelectorAll('.agent-action-select')].map(s => ({
      activity: s.dataset.activity ?? s.id,
      value: s.value,
      options: [...s.options].map(o => o.value),
    }));
    const nameInput = document.getElementById('new-action-name');
    const saveBtn = document.getElementById('save-agent-config');
    const doneLoops = document.getElementById('done-loops');
    return {
      headings: h3s,
      selectCount: selects.length,
      selects,
      hasNameInput: !!nameInput,
      nameLabel: nameInput?.previousElementSibling?.textContent,
      namePlaceholder: nameInput?.placeholder,
      hasSaveAgentConfigBtn: !!saveBtn,
      doneLoopsValue: doneLoops?.value,
    };
  })()`);
  console.log('[4] 页面结构:\n' + JSON.stringify(report, null, 2));

  // 4. 中文输入测试（真实键盘事件走 insertText）
  await evaluate(st, `document.getElementById('new-action-name').focus()`);
  await st.send('Input.insertText', { text: '摇摆' });
  await sleep(400);
  const typed = await evaluate(st, `(() => {
    const el = document.getElementById('new-action-name');
    const v = el.value.trim();
    return { value: v, passesValidation: /^[\\w一-鿿]+$/.test(v) };
  })()`);
  console.log('[5] 中文输入结果:', JSON.stringify(typed));

  // 5. 截图存证
  const shot = await st.send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    const fs = await import('node:fs');
    fs.writeFileSync('/tmp/qbot-verify/studio.png', Buffer.from(shot.result.data, 'base64'));
    console.log('[6] 截图: /tmp/qbot-verify/studio.png');
  }

  // 注意：不点击 #add-action（会真调 API 花钱）
  console.log('[7] 已跳过「新增并生成」点击（避免产生 API 费用）');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
