import type Phaser from 'phaser';
export type Area = 'nursery' | 'living' | 'practice' | 'porch';
export const AREAS: Record<
  Area,
  {
    name: string;
    title: string;
    story: string;
    objects: [string, string, string][];
  }
> = {
  nursery: {
    name: '孵化间',
    title: '等一位新朋友。',
    story: '把图片放进孵化台，等一个故事慢慢长出来。',
    objects: [
      ['ledger', '翻开手记', '孵化记录 · 我的朋友'],
      ['hatch', '走近孵化台', '迎接新朋友'],
      ['door', '回到桌面', '继续今天的陪伴'],
    ],
  },
  living: {
    name: '起居室',
    title: '把日子过成喜欢的样子。',
    story: '见面礼放在木箱里，收藏的家具会让小屋越来越像你。',
    objects: [
      ['characters', '朋友相册', '改名 · 资料 · 带到桌面'],
      ['rewards', '打开见面礼', '积累 · 开箱 · 合成'],
      ['furnish', '布置小屋', '摆放 · 移动 · 收藏'],
    ],
  },
  practice: {
    name: '练习室',
    title: '每个小动作，都有心意。',
    story: '选一位朋友来练习。翻开练习册时，草稿会留在原来的那一页。',
    objects: [
      ['persona', '上台练习', '动作 · 表情 · 导入'],
      ['scene-actions', '排练生活', '工作 · 音乐 · 会议'],
      ['tasks', '查看练习进度', '后台生成 · 继续 · 整理'],
    ],
  },
  porch: {
    name: '门廊',
    title: '推开门，遇见彼此。',
    story: '集市上交换模样，留言桌旁和朋友坐一会儿。',
    objects: [
      ['market', '逛逛集市', '下载 · 分享 · 管理作品'],
      ['lounge', '朋友留言桌', '找房 · 开房 · 聊天'],
      ['claude', '接通工作信号', 'Claude Code · 连接状态'],
    ],
  },
};
/** Each area owns its artwork and interactive objects; hidden containers never receive input. */
export function drawArea(
  scene: Phaser.Scene,
  area: Exclude<Area, 'nursery'>,
  visit: (place: string) => void,
): Phaser.GameObjects.Container {
  const before = new Set(scene.children.list);
  const g = scene.add.graphics();
  const sage = 0x758873,
    wood = 0xb38355,
    edge = 0x796346;
  g.fillStyle(area === 'porch' ? 0xe2e5d0 : 0xf3eddc).fillRect(
    0,
    105,
    1120,
    580,
  );
  g.fillStyle(0xd4b890).fillRect(0, 473, 1120, 247);
  g.lineStyle(1, 0xa58b68, 0.45);
  for (let y = 480; y < 720; y += 43) g.lineBetween(0, y, 1120, y);
  for (let x = 0; x < 1120; x += 110) g.lineBetween(x, 110, x, 469);
  g.fillStyle(edge).fillRect(0, 469, 1120, 6);
  scene.add.ellipse(520, 559, 435, 106, 0xb4bea0).setStrokeStyle(2, 0x8f9e7e);
  const label = (x: number, y: number, text: string) =>
    scene.add
      .text(x, y, text, {
        fontFamily: 'serif',
        fontSize: '16px',
        color: '#665b46',
      })
      .setOrigin(0.5);
  const frame = (x: number, y: number, w: number, h: number) => {
    g.fillStyle(wood).fillRoundedRect(x, y, w, h, 8);
    g.fillStyle(0xf7edce).fillRoundedRect(x + 9, y + 9, w - 18, h - 18, 3);
  };
  if (area === 'living') {
    frame(135, 193, 148, 165);
    g.fillStyle(sage).fillEllipse(209, 280, 58, 75);
    g.fillStyle(0xe3c378).fillCircle(209, 259, 16);
    label(209, 333, '我们的相册');
    g.fillStyle(edge).fillRect(130, 475, 18, 70).fillRect(275, 475, 18, 70);
    g.fillStyle(wood).fillRoundedRect(113, 425, 193, 58, 8);
    g.fillStyle(0xefe3bf).fillRoundedRect(145, 396, 125, 35, 4);
    label(208, 413, '朋友们');
    g.fillStyle(0x97724b).fillRoundedRect(424, 398, 192, 139, 8);
    g.fillStyle(0xc5975b).fillRoundedRect(416, 366, 208, 65, 20);
    g.lineStyle(3, edge).strokeRoundedRect(416, 366, 208, 65, 20);
    g.fillStyle(0xe8d291).fillRect(508, 396, 24, 42);
    g.fillStyle(edge).fillCircle(520, 415, 4);
    label(520, 348, '陪伴的礼物');
    g.fillStyle(sage).fillRoundedRect(841, 355, 214, 153, 17);
    g.fillStyle(0xa8b494)
      .fillRoundedRect(854, 374, 86, 105, 8)
      .fillRoundedRect(951, 374, 87, 105, 8);
    g.fillStyle(edge).fillRect(860, 508, 12, 29).fillRect(1026, 508, 12, 29);
    label(948, 337, '把收藏摆出来');
  } else if (area === 'practice') {
    g.fillStyle(edge).fillRect(104, 511, 230, 20);
    g.fillStyle(0xb59465).fillRect(116, 530, 208, 17);
    g.fillStyle(0xc18c73)
      .fillRoundedRect(120, 190, 33, 305, 6)
      .fillRoundedRect(284, 190, 33, 305, 6);
    g.fillStyle(0xe8d7ae).fillRect(150, 190, 135, 17);
    label(218, 240, '今日的小剧场');
    frame(425, 215, 194, 202);
    g.lineStyle(2, 0xada282);
    for (let y = 260; y < 393; y += 36) g.lineBetween(449, y, 593, y);
    label(521, 236, '生活排练表');
    for (const [i, t] of ['工作', '听歌', '开会'].entries())
      label(520, 280 + i * 36, t);
    g.fillStyle(wood).fillRoundedRect(853, 330, 180, 210, 5);
    g.fillStyle(edge).fillRect(863, 383, 160, 8).fillRect(863, 463, 160, 8);
    for (let i = 0; i < 7; i++) {
      g.fillStyle([sage, 0xb88267, 0xdbbd7d][i % 3]).fillRect(
        868 + i * 21,
        402,
        15,
        58,
      );
    }
    label(944, 358, '练习手记');
  } else {
    g.fillStyle(0xb18a60).fillRect(110, 296, 192, 221);
    g.fillStyle(0xdcb794).fillRect(97, 288, 218, 35);
    for (let i = 0; i < 7; i++) {
      g.fillStyle(i % 2 ? 0xe9dfbe : sage).fillRect(97 + i * 31, 230, 31, 65);
    }
    frame(130, 345, 65, 80);
    frame(216, 345, 65, 80);
    label(208, 478, '朋友的模样');
    g.fillStyle(edge).fillRect(432, 479, 15, 63).fillRect(600, 479, 15, 63);
    g.fillStyle(wood).fillRoundedRect(409, 437, 228, 49, 7);
    frame(452, 335, 139, 97);
    label(522, 381, '留一句话');
    g.fillStyle(sage).fillRoundedRect(465, 491, 113, 49, 10);
    frame(858, 302, 188, 178);
    g.fillStyle(sage).fillRoundedRect(870, 315, 164, 151, 5);
    for (let x = 881; x < 991; x += 11)
      g.lineStyle(2, 0xb7c4a3).lineBetween(x, 335, x, 423);
    g.fillStyle(0xdfcd95).fillCircle(1006, 440, 12);
    label(950, 277, '工作信号台');
  }
  for (const [i, [place]] of AREAS[area].objects.entries())
    scene.add
      .zone([210, 520, 948][i], 380, 240, 320)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => visit(place));
  const detail = scene.add.graphics();
  detail.fillStyle(0x756545, 0.045);
  for (let i = 0; i < 850; i++)
    detail.fillCircle((i * 137.7) % 1120, 143 + ((i * 83.3) % 520), 0.7);
  detail.lineStyle(1, 0xf8e5bf, 0.45);
  for (let y = 482; y < 690; y += 43) detail.lineBetween(0, y, 1120, y);
  detail.lineStyle(2, edge, 0.6).lineBetween(727, 137, 727, 215);
  detail.fillStyle(0xe4c486).fillRoundedRect(703, 211, 48, 33, 15);
  detail.lineStyle(2, 0xb6a279).strokeRoundedRect(703, 211, 48, 33, 15);
  scene.add.ellipse(727, 243, 100, 72, 0xffeeaf, 0.15);
  for (const [x, y] of [
    [76, 464],
    [773, 488],
  ]) {
    detail.fillStyle(0xbc8d6a).fillRoundedRect(x - 18, y - 30, 36, 35, 4);
    detail.fillStyle(0xcf9f79).fillRoundedRect(x - 22, y - 34, 44, 8, 3);
    detail.lineStyle(2, 0x748667).lineBetween(x, y - 32, x, y - 115);
    for (let i = 0; i < 5; i++)
      scene.add
        .ellipse(
          x + (i % 2 ? 1 : -1) * 12,
          y - 48 - i * 13,
          32,
          12,
          0x7e9473,
          0.85,
        )
        .setAngle(i % 2 ? 30 : -30);
  }
  const objects = scene.children.list.filter((o) => !before.has(o));
  return scene.add.container(0, 0, objects);
}
