// Read-only planning model. Does not load or change player data.
// Tutorial is an isolated, net-zero grant/craft; 600 coins start the regular economy.
const recipes = [
  { id: 'rare', minDay: 5, fiber: 80, essence: 18, shards: 10, coins: 600 },
  { id: 'epic', minDay: 12, fiber: 240, essence: 60, shards: 40, coins: 2400 },
  { id: 'legendary', minDay: 28, fiber: 600, essence: 180, shards: 100, coins: 6000 },
];
function simulate({ ratio = 1, monthly = false, pack = false, weekly = true, days = 180 }) {
  const wallet = { coins: 600, fiber: 0, essence: 0, shards: 0 };
  const reached = {};
  let next = 0;
  for (let day = 1; day <= days; day++) {
    wallet.coins += 228 * ratio;
    wallet.fiber += 36 * ratio;
    wallet.essence += 6 * ratio;
    wallet.shards += 2 * ratio;
    // Weekly payout is conservatively booked at the end of each seven-day cycle.
    if (weekly && day % 7 === 0) { wallet.coins += 300; wallet.shards += 10; }
    // One 30-day card, not automatic renewal; accrued benefits can be claimed later.
    if (monthly && day <= 30) {
      wallet.coins += 20; wallet.fiber += 6; wallet.essence += 1;
      if (day % 3 === 0) wallet.shards += 2;
    }
    if (pack && day === 8) {
      wallet.coins += 600; wallet.fiber += 180; wallet.essence += 30; wallet.shards += 20;
    }
    if (next < recipes.length) {
      const r = recipes[next];
      if (day >= r.minDay && ['coins', 'fiber', 'essence', 'shards'].every(k => wallet[k] >= r[k])) {
        for (const k of ['coins', 'fiber', 'essence', 'shards']) wallet[k] -= r[k];
        reached[r.id] = day;
        next++;
      }
    }
    if (next === recipes.length) return { reached, wallet, completionDay: day };
  }
  return { reached, wallet, completionDay: null };
}
const scenarios = {
  lightFree: { ratio: 0.5 },
  standardFree: {},
  standardMonthly18: { monthly: true },
  standardMonthlyAndPack48: { monthly: true, pack: true },
  freeNoWeekly: { weekly: false },
  supplyMinus20: { ratio: 0.8 },
  supplyPlus20: { ratio: 1.2 },
};
const output = Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, simulate(v)]));
const unitG = { coins: 1, fiber: 2, essence: 30, shards: 54 };
const valueG = items => Object.entries(unitG).reduce((s, [k, v]) => s + (items[k] || 0) * v, 0);
const audit = {
  dailyHarvestUnits: 72,
  allocatedHarvestUnits: 24 + 12 + 36,
  dailyCoins: 360 + 120 + 180 - 432,
  extractionOpportunityCost: 36 * 10,
  extractionMaterialG: valueG({ fiber: 36, essence: 6, shards: 2 }),
  weeklyG: valueG({ coins: 300, shards: 10 }),
  monthlyG: valueG({ coins: 600, fiber: 180, essence: 30, shards: 20 }),
  recipesG: Object.fromEntries(recipes.map(r => [r.id, valueG(r)])),
};
if (audit.dailyHarvestUnits !== audit.allocatedHarvestUnits) throw Error('Harvest allocation mismatch');
if (audit.extractionOpportunityCost !== audit.extractionMaterialG) throw Error('G basket mismatch');
if (output.standardFree.completionDay > 49) throw Error('Standard target exceeds seven weeks');
console.log(JSON.stringify({ assumptions: 'Deterministic steady-state; balanced essence colors; no rare bonuses, optional spending, or missed days. Not a retention forecast.', audit, scenarios: output }, null, 2));
