const { _electron: electron } = require(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async () => {
  const root = path.resolve(__dirname, '..');
  const data = await mkdtemp(path.join(os.tmpdir(), 'qbot-house-qa-'));
  const output = path.join(root, '.superpowers/house-preview');
  await mkdir(output, { recursive: true });
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.join(root, 'app/test/fixtures/nursery-main.cjs')],
    env: { ...process.env, QBOT_QA_DATA: data },
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForSelector('#scene canvas');
    const shot = async (n) => {
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(output, n + '.png') });
    };
    const open = async (pane) => {
      await page.evaluate((p) => window.qbot.ui.openConsole(p), pane);
      await page
        .locator(
          `#book-pages [data-pane="${pane}"]:not([hidden])[data-ready="true"]`,
        )
        .waitFor();
    };
    const close = async () =>
      page.getByRole('button', { name: '合上手册', exact: true }).click();
    for (const [area, name] of [
      ['living', '起居室'],
      ['practice', '练习室'],
      ['porch', '门廊'],
    ]) {
      await page.getByRole('button', { name, exact: true }).click();
      assert.equal(
        await page.locator('#world').getAttribute('data-area'),
        area,
      );
      await shot(area);
    }
    await open('characters');
    await page.locator('.edit-char').first().click();
    await page
      .locator('[data-pane=profile]:not([hidden]) #profile-name')
      .waitFor();
    await page.locator('#profile-name').fill('保留的草稿');
    await page.getByRole('button', { name: '动作练习', exact: true }).click();
    await page.locator('.preview-action').first().waitFor();
    await page.locator('.preview-action').first().click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#actor video')].some(
        (v) => v.currentTime > 0,
      ),
    );
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'activate').length,
      ),
      0,
    );
    await shot('practice-book');
    await page.getByRole('button', { name: '它的故事', exact: true }).click();
    assert.equal(
      await page.locator('#profile-name').inputValue(),
      '保留的草稿',
    );
    await shot('story-book');
    await app.evaluate(() => {
      global.qa.status = { stage: 'done', actions: global.qa.manifest.actions };
    });
    await open('profile');
    await page
      .getByRole('combobox', { name: '一起练习的朋友' })
      .selectOption('new-friend');
    await page.getByRole('dialog').waitFor();
    await shot('confirmation');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#house-book').isVisible(), true);
    assert.equal(
      await page.locator('#profile-name').inputValue(),
      '保留的草稿',
    );
    await page.getByRole('button', { name: '保存资料', exact: true }).click();
    await page.getByText('已保存', { exact: true }).waitFor();
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'rename').length,
      ),
      1,
    );
    for (const pane of [
      'scene-actions',
      'stickers',
      'prompts',
      'tasks',
      'market',
      'claude',
      'settings',
    ]) {
      await open(pane);
      await shot(pane);
    }
    await page.locator('#set-generation-mode').selectOption('local');
    await page.waitForFunction(
      async () => (await window.qbot.settings.get()).generationMode === 'local',
    );
    await page.locator('#set-developer-mode').check();
    await open('devtools');
    await page.locator('#dev-perc-events').waitFor();
    await shot('tools');
    await open('rewards');
    await page.getByRole('button', { name: /拆一份礼物/ }).click();
    await page
      .getByRole('button', { name: /拆一份礼物/ })
      .dispatchEvent('click');
    await page.getByText('收到了「山水挂画」', { exact: true }).waitFor();
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'box').length,
      ),
      1,
    );
    await shot('gift');
    await page.getByRole('button', { name: '摆放家具', exact: true }).click();
    await page.locator('.furniture-choice').first().click();
    assert.equal(await page.locator('.placed-furniture').count(), 1);
    await page.locator('.placed-furniture').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('slider', { name: '家具大小' }).fill('1.4');
    await app.evaluate(() => {
      global.qa.failDecor = true;
    });
    await page.getByRole('button', { name: '保存布置', exact: true }).click();
    await page.getByText(/保存失败，请重试/).waitFor();
    assert.equal(await page.locator('.placed-furniture').count(), 1);
    await app.evaluate(() => {
      global.qa.failDecor = false;
    });
    await page.getByRole('button', { name: '保存布置', exact: true }).click();
    await page
      .getByText('布置已保存，桌面小屋也会同步更新。', { exact: true })
      .waitFor();
    assert.equal(await app.evaluate(() => global.qa.decor[0].scale), 1.4);
    await shot('furnish');
    await close();
    await open('furnish');
    assert.equal(await page.locator('.placed-furniture').count(), 1);
    await open('lounge');
    await page.getByText('午后的书房', { exact: true }).waitFor();
    await shot('porch-book');
    await page.getByRole('button', { name: '进入', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'join').length,
      ),
      0,
    );
    await page.getByRole('button', { name: '进入', exact: true }).click();
    await page
      .getByRole('button', { name: '知道了，进房', exact: true })
      .click();
    await page.locator('#room-view').waitFor();
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'join').length,
      ),
      1,
    );
    await page.locator('[data-display-mode=room]').click();
    assert.equal(await app.evaluate(() => global.qa.mode), 'room');
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'leave').length,
      ),
      0,
    );
    // Hydrate a room through the same main-process cache used after lazy mount/reopen.
    await app.evaluate(() => {
      const q = global.qa;
      q.rooms = {
        status: { phase: 'in-room', memberId: 'me' },
        room: {
          roomId: '12345678',
          name: '午后的书房',
          kind: 'study',
          capacity: 8,
          ownerId: 'me',
          listed: true,
          members: [{ memberId: 'me', nickname: '测试朋友', online: true }],
        },
        chat: [],
      };
    });
    await close();
    await open('lounge');
    await page.locator('#chat-input').fill('你好');
    await page
      .locator('#chat-input')
      .dispatchEvent('keydown', { key: 'Enter', isComposing: true });
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'chat').length,
      ),
      0,
    );
    await page.getByRole('button', { name: '发送', exact: true }).click();
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'chat').length,
      ),
      1,
    );
    await shot('chat');
    await page.getByRole('button', { name: '退出房间', exact: true }).click();
    await page.locator('#list-view').waitFor();
    assert.equal(
      await app.evaluate(
        () => global.qa.calls.filter((c) => c[0] === 'leave').length,
      ),
      1,
    );
    await app.evaluate(() => global.qa.win.setSize(840, 570));
    await shot('small-book');
    assert.equal(
      await page.locator('#house-book').evaluate((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      }),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS: four areas, all books, draft retention, stage preview without activation, generation mode, developer gate, reward result, furnishing failure/save/reload, cached chat, IME, leave, minimum window.\nScreenshots: ' +
        output,
    );
  } finally {
    await app.close();
    await rm(data, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
