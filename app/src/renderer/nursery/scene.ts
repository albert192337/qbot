import Phaser from 'phaser';
import { drawArea, type Area } from './house';
import type { IncubationPhase } from './model';
export type Place = string;
const C = {
  ink: 0x5d5142,
  wood: 0xb08050,
  edge: 0x765a3d,
  cream: 0xf6efdd,
  sage: 0x718670,
  leaf: 0x5d785b,
  gold: 0xe7b75e,
};
/** A small real game scene: objects, hit areas, tweened feedback and an incubator state. */
export class NurseryScene extends Phaser.Scene {
  private areas = new Map<Area, Phaser.GameObjects.Container>();
  private area: Area = 'nursery';
  private dome!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Ellipse;
  private seed!: Phaser.GameObjects.Container;
  private lamps: Phaser.GameObjects.Arc[] = [];
  private fireflies: Phaser.GameObjects.Arc[] = [];
  private phase: IncubationPhase = 'empty';
  private reduced = false;
  private ready = false;
  private panelOpen = false;
  constructor(
    private visit: (place: Place) => void,
    private onReady: () => void,
  ) {
    super('nursery');
  }
  create(): void {
    const g = this.add.graphics();
    // Paper, dado and a timber floor. All artwork is deterministic and lives in the scene.
    g.fillStyle(0xf3eddc).fillRect(0, 0, 1120, 720);
    g.fillStyle(0xe7e0ca).fillRect(0, 451, 1120, 22);
    g.fillStyle(0x9b8764).fillRect(0, 470, 1120, 6);
    g.fillStyle(0xd4b890).fillRect(0, 476, 1120, 244);
    g.lineStyle(1, 0x9a805b, 0.35);
    for (let y = 502; y < 720; y += 43) g.lineBetween(0, y, 1120, y);
    for (let x = -900; x < 1800; x += 150)
      g.lineBetween(560 + (x - 560) * 0.25, 476, x, 720);
    // Quiet paper grain and wall panelling.
    g.fillStyle(0x756545, 0.05);
    for (let i = 0; i < 1100; i++)
      g.fillCircle((i * 137.7) % 1120, (i * 83.3) % 720, 0.7);
    g.lineStyle(1, 0xb7ac91, 0.28);
    for (let x = 20; x < 1120; x += 94) g.lineBetween(x, 109, x, 449);
    this.windowArt(g);
    this.doorArt(g);
    // Woven rug and concentric stitched border.
    this.add.ellipse(520, 571, 445, 112, 0xa79973, 0.25);
    this.add.ellipse(520, 565, 423, 99, 0xc4caab).setStrokeStyle(2, 0x8c9c7e);
    this.add.ellipse(520, 565, 390, 80).setStrokeStyle(1, 0x8c9c7e, 0.6);
    this.tableArt(g);
    this.ledgerArt(g);
    this.plant(g, 790, 456, 1.1);
    this.plant(g, 104, 470, 0.72);
    // Hanging sign, wire, warm glass lamp.
    g.lineStyle(2, C.edge, 0.6).lineBetween(518, 105, 518, 147);
    g.fillStyle(0xe7d2a8).fillRoundedRect(449, 145, 138, 36, 4);
    g.lineStyle(1.5, 0x9f8b63).strokeRoundedRect(449, 145, 138, 36, 4);
    this.add
      .text(518, 163, '新朋友孵化台', {
        fontFamily: 'serif',
        fontSize: '16px',
        color: '#655641',
      })
      .setOrigin(0.5);
    // The incubator reacts to generation stages; it never simulates time-based progress.
    this.glow = this.add.ellipse(518, 467, 245, 62, C.gold, 0.15);
    const dome = (this.dome = this.add.graphics());
    dome.fillStyle(0xf8ffef, 0.45).fillRoundedRect(412, 238, 212, 245, {
      tl: 106,
      tr: 106,
      bl: 15,
      br: 15,
    });
    dome.lineStyle(3, 0x8caa9e, 0.8).strokeRoundedRect(412, 238, 212, 245, {
      tl: 106,
      tr: 106,
      bl: 15,
      br: 15,
    });
    dome.lineStyle(4, 0xffffff, 0.7).lineBetween(434, 329, 434, 408);
    dome.lineStyle(2, 0xffffff, 0.65).lineBetween(441, 314, 452, 293);
    this.seed = this.add.container(518, 396);
    const shadow = this.add.ellipse(0, 70, 90, 18, C.edge, 0.13);
    const egg = this.add
      .ellipse(0, 0, 92, 121, 0xf2e7c7)
      .setStrokeStyle(2, 0xb5a176);
    const leaf = this.add.ellipse(15, -56, 29, 13, C.sage).setAngle(-35);
    const patch = this.add
      .ellipse(-15, -19, 16, 24, 0xffffff, 0.6)
      .setAngle(25);
    this.seed.add([shadow, egg, leaf, patch]);
    for (let i = 0; i < 8; i++) {
      this.lamps.push(
        this.add
          .circle(444 + i * 21, 504, 4.5, 0x9c8866)
          .setStrokeStyle(1, 0x786448),
      );
    }
    for (let i = 0; i < 9; i++) {
      const dot = this.add.circle(
        438 + ((i * 41) % 155),
        307 + ((i * 37) % 147),
        (i % 2) + 1.2,
        0xe6b756,
        0.55,
      );
      this.fireflies.push(dot);
    }
    this.hit(518, 397, 244, 312, 'hatch');
    this.hit(196, 491, 171, 140, 'ledger');
    this.hit(963, 350, 150, 299, 'door');
    const nurseryObjects = [...this.children.list];
    this.areas.set('nursery', this.add.container(0, 0, nurseryObjects));
    for (const area of ['living', 'practice', 'porch'] as const)
      this.areas.set(area, drawArea(this, area, this.visit).setVisible(false));
    this.ready = true;
    this.setArea(this.area);
    this.input.enabled = !this.panelOpen;
    this.setReducedMotion(
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    this.onReady();
  }
  private windowArt(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xc9b493).fillRoundedRect(136, 143, 231, 264, {
      tl: 111,
      tr: 111,
      bl: 5,
      br: 5,
    });
    g.fillStyle(0xdde4cf).fillRoundedRect(148, 155, 207, 240, {
      tl: 99,
      tr: 99,
      bl: 2,
      br: 2,
    });
    g.fillStyle(0xf7ecd0).fillCircle(293, 224, 31);
    g.fillStyle(0xb7c5a1).fillPoints(
      [
        { x: 148, y: 337 },
        { x: 213, y: 309 },
        { x: 279, y: 347 },
        { x: 355, y: 326 },
        { x: 355, y: 395 },
        { x: 148, y: 395 },
      ],
      true,
    );
    g.fillStyle(0x97ad8c).fillPoints(
      [
        { x: 148, y: 380 },
        { x: 231, y: 351 },
        { x: 290, y: 368 },
        { x: 355, y: 350 },
        { x: 355, y: 395 },
        { x: 148, y: 395 },
      ],
      true,
    );
    g.fillStyle(0xc9b493)
      .fillRect(246, 159, 10, 233)
      .fillRect(148, 283, 207, 9);
    g.lineStyle(3, 0x9b8764).strokeRoundedRect(136, 143, 231, 264, {
      tl: 111,
      tr: 111,
      bl: 5,
      br: 5,
    });
    g.fillStyle(0xb7a079).fillRoundedRect(122, 402, 260, 13, 3);
    // A shaft of afternoon light across the floor.
    g.fillStyle(0xfff8d9, 0.14).fillPoints(
      [
        { x: 148, y: 415 },
        { x: 355, y: 415 },
        { x: 701, y: 692 },
        { x: 381, y: 692 },
      ],
      true,
    );
    g.lineStyle(2, 0x7d927b, 0.75);
    g.lineBetween(174, 272, 183, 230).lineBetween(183, 246, 169, 236);
  }
  private doorArt(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xb7aa89).fillRoundedRect(884, 164, 162, 315, {
      tl: 78,
      tr: 78,
      bl: 3,
      br: 3,
    });
    g.fillStyle(0x82917b).fillRoundedRect(895, 176, 140, 298, {
      tl: 66,
      tr: 66,
      bl: 0,
      br: 0,
    });
    g.lineStyle(2, 0x65755e).strokeRoundedRect(895, 176, 140, 298, {
      tl: 66,
      tr: 66,
      bl: 0,
      br: 0,
    });
    g.fillStyle(0xc8d5b5).fillCircle(965, 248, 39);
    g.lineStyle(5, 0xb7aa89)
      .strokeCircle(965, 248, 39)
      .lineBetween(928, 248, 1002, 248)
      .lineBetween(965, 211, 965, 286);
    g.lineStyle(1, 0x65755e, 0.7).strokeRect(911, 315, 108, 139);
    g.fillStyle(0xe4c58a).fillCircle(1006, 352, 5);
    g.fillStyle(0xbaa886).fillRoundedRect(877, 475, 177, 12, 3);
    this.add
      .text(965, 391, '桌面', {
        fontFamily: 'serif',
        fontSize: '20px',
        color: '#e9e8d2',
      })
      .setOrigin(0.5);
  }
  private tableArt(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x785a3b).fillRect(404, 528, 15, 58).fillRect(617, 528, 15, 58);
    g.fillStyle(0xb58b57).fillRoundedRect(394, 481, 248, 61, 9);
    g.lineStyle(2, 0x89683f).strokeRoundedRect(394, 481, 248, 61, 9);
    g.fillStyle(0xd6b477).fillRoundedRect(381, 471, 274, 18, 7);
    g.lineStyle(1, 0x89683f, 0.5).lineBetween(404, 525, 631, 525);
    g.fillStyle(0x937349).fillCircle(517, 531, 3);
  }
  private ledgerArt(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x866343).fillRect(138, 514, 14, 65).fillRect(254, 514, 14, 65);
    g.fillStyle(0xb3895c).fillRoundedRect(128, 486, 151, 40, 5);
    g.fillStyle(0xcead7c).fillRoundedRect(118, 480, 172, 13, 4);
    g.fillStyle(0x536f5a).fillRoundedRect(149, 443, 103, 38, 3);
    g.fillStyle(0xfff3d6).fillRect(154, 450, 93, 24);
    g.fillStyle(0x657e62).fillRoundedRect(145, 438, 110, 10, 3);
    g.fillStyle(0xc18b64).fillRoundedRect(159, 425, 86, 14, 3);
    g.fillStyle(0xe4c68b).fillRect(176, 425, 5, 19);
  }
  private plant(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
  ): void {
    g.fillStyle(0xb78363).fillRoundedRect(
      x - 23 * s,
      y - 38 * s,
      46 * s,
      42 * s,
      5,
    );
    g.fillStyle(0xc79775).fillRoundedRect(
      x - 28 * s,
      y - 42 * s,
      56 * s,
      10 * s,
      3,
    );
    g.lineStyle(2, C.leaf).lineBetween(x, y - 42 * s, x, y - 139 * s);
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? 1 : -1;
      this.add
        .ellipse(
          x + dir * 17 * s,
          y - (62 + i * 12) * s,
          43 * s,
          15 * s,
          C.leaf,
          0.8,
        )
        .setAngle(dir * 30);
    }
  }
  private hit(x: number, y: number, w: number, h: number, place: Place): void {
    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.visit(place));
    zone.on('pointerover', () => {
      if (place === 'hatch') this.glow.setAlpha(0.45);
    });
    zone.on('pointerout', () => this.glow.setAlpha(0.15));
  }
  setArea(area: Area): void {
    this.area = area;
    for (const [id, container] of this.areas) container.setVisible(id === area);
  }
  celebrate(): void {
    if (this.ready && !this.reduced)
      this.cameras.main.flash(400, 249, 235, 198, false);
  }
  setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    if (this.ready) this.input.enabled = !open;
  }
  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
    if (!this.ready) return;
    this.tweens.killAll();
    this.dome
      .setY(this.phase === 'born' ? -55 : 0)
      .setAlpha(this.phase === 'born' ? 0.12 : 1);
    this.glow.setScale(1).setAlpha(0.15);
    this.seed.setY(396);
    this.seed.setAngle(0);
    if (reduced) return;
    this.tweens.add({
      targets: this.seed,
      y: 389,
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.fireflies.forEach((dot, i) =>
      this.tweens.add({
        targets: dot,
        y: dot.y - 20,
        alpha: 0.15,
        duration: 1700 + i * 180,
        yoyo: true,
        repeat: -1,
      }),
    );
  }
  present(phase: IncubationPhase, done: number, hasImage: boolean): void {
    if (!this.ready) return;
    this.seed.setVisible(!hasImage && phase !== 'born');
    this.lamps.forEach((lamp, i) =>
      lamp.setFillStyle(i < done ? 0xe9d693 : 0x9c8866),
    );
    if (phase !== this.phase) {
      this.tweens.killTweensOf(this.dome);
      const lifted = phase === 'born';
      if (this.reduced)
        this.dome.setY(lifted ? -55 : 0).setAlpha(lifted ? 0.12 : 1);
      else
        this.tweens.add({
          targets: this.dome,
          y: lifted ? -55 : 0,
          alpha: lifted ? 0.12 : 1,
          duration: 700,
          ease: 'Sine.easeInOut',
        });
    }
    if (phase === 'born' && this.phase !== 'born' && this.area === 'nursery') {
      if (!this.reduced) {
        this.cameras.main.flash(450, 249, 235, 198, false);
        this.tweens.add({
          targets: this.glow,
          scaleX: 1.6,
          scaleY: 1.6,
          alpha: 0.05,
          duration: 1100,
          yoyo: true,
        });
      }
    }
    this.phase = phase;
  }
}
