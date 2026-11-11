import type { GameState, UpgradeCategory } from './types'

export type StatKey =
  | 'barnCap'
  | 'feedCap'
  | 'waterCap'
  | 'canCap'
  | 'handSpeed'
  | 'rawCap'
  | 'goodsCap'
  | 'chilledCap'
  | 'herdProd'
  | 'hay'
  | 'bedding'
  | 'shade'
  | 'vet'
  | 'milkSlots'
  | 'milkSpeed'
  | 'machineSpeed'
  | 'cycleReduce'
  | 'feedUse'
  | 'waterUse'
  | 'careCap'
  | 'orderValue'
  | 'qualityLab'
  | 'qualityControl'
  | 'homog'
  | 'conveyor'
  | 'truckLevel'
  | 'contracts'

export type Effect = { stat: StatKey; perLevel: number }

export type Prereq = { kind: 'upgrade'; id: string; level?: number } | { kind: 'cows'; count: number }

export type UpgradeDef = {
  id: string
  category: UpgradeCategory
  name: string
  description: string
  kind: 'level' | 'consumable' | 'cow'
  maxLevel: number
  baseCost: number
  growth: number
  prereqs: Prereq[]
  effects: Effect[]
  /** Describes what the next purchase does, given the current level */
  next: (level: number) => string
  consumable?: { resource: 'feedStock' | 'waterStock' | 'fruit'; amount: number }
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export const UPGRADES: UpgradeDef[] = [
  // HERD
  {
    id: 'buy-cow',
    category: 'herd',
    name: 'Buy Cow',
    description: 'Add a new cow to the pasture. Limited by barn capacity.',
    kind: 'cow',
    maxLevel: Infinity,
    baseCost: 60,
    growth: 1.22,
    prereqs: [],
    effects: [],
    next: () => 'One more milk-producing cow.',
  },
  {
    id: 'pasture',
    category: 'herd',
    name: 'Pasture Expansion',
    description: 'Push the fence out for more grazing room.',
    kind: 'level',
    maxLevel: 4,
    baseCost: 180,
    growth: 1.8,
    prereqs: [],
    effects: [{ stat: 'barnCap', perLevel: 3 }],
    next: () => '+3 cow capacity and a bigger fenced field.',
  },
  {
    id: 'barn',
    category: 'herd',
    name: 'Barn Extension',
    description: 'Build extra stalls onto the barn.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 350,
    growth: 2.2,
    prereqs: [{ kind: 'upgrade', id: 'pasture' }],
    effects: [{ stat: 'barnCap', perLevel: 4 }],
    next: () => '+4 cow capacity and a new stall.',
  },
  {
    id: 'herd-management',
    category: 'herd',
    name: 'Herd Management',
    description: 'Rotations, records and routines for the whole herd.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 500,
    growth: 1.7,
    prereqs: [{ kind: 'cows', count: 3 }],
    effects: [{ stat: 'herdProd', perLevel: 0.03 }],
    next: () => '+3% milk production across the herd.',
  },
  {
    id: 'breed-holstein',
    category: 'herd',
    name: 'Holstein Breed',
    description: 'Unlock Holstein cows: +15% milk volume.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 250,
    growth: 1,
    prereqs: [{ kind: 'cows', count: 2 }],
    effects: [],
    next: () => 'Holsteins become available in Buy Cow.',
  },
  {
    id: 'breed-jersey',
    category: 'herd',
    name: 'Jersey Breed',
    description: 'Unlock Jersey cows: +20% cream yield, -5% milk.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 400,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'breed-holstein' }],
    effects: [],
    next: () => 'Jerseys become available in Buy Cow.',
  },
  {
    id: 'breed-brownswiss',
    category: 'herd',
    name: 'Brown Swiss Breed',
    description: 'Unlock Brown Swiss: +10% milk, faster health recovery.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 650,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'breed-holstein' }],
    effects: [],
    next: () => 'Brown Swiss become available in Buy Cow.',
  },
  {
    id: 'breed-highland',
    category: 'herd',
    name: 'Highland Breed',
    description: 'Unlock Highland cows: 25% less feed, -10% milk.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 900,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'breed-brownswiss' }],
    effects: [],
    next: () => 'Highlands become available in Buy Cow.',
  },

  // CARE
  {
    id: 'feed-refill',
    category: 'care',
    name: 'Feed Refill',
    description: 'A delivery of hay and grain into the silo.',
    kind: 'consumable',
    maxLevel: Infinity,
    baseCost: 10,
    growth: 1,
    prereqs: [],
    effects: [],
    consumable: { resource: 'feedStock', amount: 20 },
    next: () => '+20 feed units (up to silo capacity).',
  },
  {
    id: 'water-refill',
    category: 'care',
    name: 'Water Refill',
    description: 'Top up the water tower.',
    kind: 'consumable',
    maxLevel: Infinity,
    baseCost: 8,
    growth: 1,
    prereqs: [],
    effects: [],
    consumable: { resource: 'waterStock', amount: 20 },
    next: () => '+20 water units (up to tower capacity).',
  },
  {
    id: 'silo',
    category: 'care',
    name: 'Feed Silo',
    description: 'A taller silo holds more feed.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 25,
    growth: 1.7,
    prereqs: [],
    effects: [{ stat: 'feedCap', perLevel: 30 }],
    next: () => '+30 feed storage.',
  },
  {
    id: 'water-tower',
    category: 'care',
    name: 'Water Tower',
    description: 'A bigger tank on stilts.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 30,
    growth: 1.7,
    prereqs: [],
    effects: [{ stat: 'waterCap', perLevel: 30 }],
    next: () => '+30 water storage.',
  },
  {
    id: 'quality-hay',
    category: 'care',
    name: 'Quality Hay',
    description: 'Sweeter hay means more milk while cows are fed.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 80,
    growth: 1.9,
    prereqs: [],
    effects: [{ stat: 'hay', perLevel: 0.08 }],
    next: () => '+8% milk output and nutrition recovery while fed.',
  },
  {
    id: 'auto-feeder',
    category: 'care',
    name: 'Automatic Feeder',
    description: 'Moves feed from the silo into the trough for you.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 220,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'silo' }],
    effects: [],
    next: () => 'No more clicking the feed trough.',
  },
  {
    id: 'auto-water',
    category: 'care',
    name: 'Automatic Water Pump',
    description: 'Keeps the water trough full from the tower.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 260,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'water-tower' }],
    effects: [],
    next: () => 'No more clicking the water trough.',
  },
  {
    id: 'bedding',
    category: 'care',
    name: 'Clean Bedding',
    description: 'Fresh straw keeps spirits up.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 100,
    growth: 1.8,
    prereqs: [],
    effects: [{ stat: 'bedding', perLevel: 1 }],
    next: () => 'Higher happiness target, slower happiness decline.',
  },
  {
    id: 'shade',
    category: 'care',
    name: 'Shade & Comfort',
    description: 'Shade trees and a scratching post.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 140,
    growth: 1.8,
    prereqs: [],
    effects: [{ stat: 'shade', perLevel: 1 }],
    next: () => '+5 happiness and faster happiness recovery.',
  },
  {
    id: 'vet',
    category: 'care',
    name: 'Veterinary Care',
    description: 'Regular check-ups for the herd.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 300,
    growth: 1.8,
    prereqs: [{ kind: 'cows', count: 3 }],
    effects: [{ stat: 'vet', perLevel: 1 }],
    next: () => '+50% health recovery; low health hurts less.',
  },

  // MILKING
  {
    id: 'large-can',
    category: 'milking',
    name: 'Large Milk Can',
    description: 'A roomier portable can.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 45,
    growth: 2,
    prereqs: [],
    effects: [{ stat: 'canCap', perLevel: 5 }],
    next: () => '+5 L can capacity.',
  },
  {
    id: 'fast-hands',
    category: 'milking',
    name: 'Fast Hand Milking',
    description: 'Practice makes perfect.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 75,
    growth: 1.8,
    prereqs: [],
    effects: [{ stat: 'handSpeed', perLevel: 1 }],
    next: () => '-0.25s cooldown between hand collections.',
  },
  {
    id: 'milking-machine',
    category: 'milking',
    name: 'Milking Machine',
    description: 'Milks cows automatically into the barn milk station.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 180,
    growth: 2,
    prereqs: [{ kind: 'cows', count: 2 }],
    effects: [{ stat: 'milkSlots', perLevel: 3 }],
    next: () => 'Automatically milks +3 cows.',
  },
  {
    id: 'parallel-stall',
    category: 'milking',
    name: 'Parallel Milking Stall',
    description: 'Extra clusters on the milking line.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 280,
    growth: 1.9,
    prereqs: [{ kind: 'upgrade', id: 'milking-machine' }],
    effects: [{ stat: 'milkSlots', perLevel: 2 }],
    next: () => '+2 cows milked at the same time.',
  },
  {
    id: 'pipeline',
    category: 'milking',
    name: 'Milk Pipeline',
    description: 'Pipes the barn station down to the basement Raw Milk Tank.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 250,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'milking-machine' }],
    effects: [],
    next: () => 'Opens the factory basement and raw tank.',
  },
  {
    id: 'auto-collector',
    category: 'milking',
    name: 'Auto Collector',
    description: 'A market buyer collects from the tank so you never drag a can again.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 320,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'pipeline' }],
    effects: [],
    next: () => 'Auto-sells raw milk from the tank (toggle in Factory).',
  },
  {
    id: 'milking-efficiency',
    category: 'milking',
    name: 'Milking Efficiency',
    description: 'Tuned pulsators and softer liners.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 350,
    growth: 1.6,
    prereqs: [{ kind: 'upgrade', id: 'milking-machine' }],
    effects: [{ stat: 'milkSpeed', perLevel: 0.06 }],
    next: () => '+6% milking throughput.',
  },

  // PROCESSING
  {
    id: 'cooling',
    category: 'processing',
    name: 'Cooling Tank',
    description: 'Chilled storage that stops freshness loss.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 400,
    growth: 1.9,
    prereqs: [{ kind: 'upgrade', id: 'pipeline' }],
    effects: [{ stat: 'chilledCap', perLevel: 100 }],
    next: (l) => (l === 0 ? 'Unlock chilled storage (100 L).' : '+100 L chilled capacity, faster transfer.'),
  },
  {
    id: 'pasteurizer',
    category: 'processing',
    name: 'Pasteurizer',
    description: 'Heat-treats chilled milk. Worth +25% over raw.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 650,
    growth: 1.9,
    prereqs: [{ kind: 'upgrade', id: 'cooling' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock pasteurized milk.' : '+40% pasteurizer speed, +30 L tank.'),
  },
  {
    id: 'homogenizer',
    category: 'processing',
    name: 'Homogenizer',
    description: 'Smooth, even milk sells for more once bottled.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 900,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [{ stat: 'homog', perLevel: 0.1 }],
    next: () => '+10% bottled & crated milk value.',
  },
  {
    id: 'bottler',
    category: 'processing',
    name: 'Bottle Filler',
    description: 'Fills glass bottles into 6-packs.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 1_200,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock 6-packs (54 coins each).' : '+10% pack value and faster filling.'),
  },
  {
    id: 'crater',
    category: 'processing',
    name: 'Crate Packer',
    description: 'Packs two 6-packs into a crate.',
    kind: 'level',
    maxLevel: 2,
    baseCost: 1_800,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'bottler' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock crates (125 coins each).' : '+15% crate value and faster packing.'),
  },
  {
    id: 'separator',
    category: 'processing',
    name: 'Cream Separator',
    description: 'Splits milk into cream and skim.',
    kind: 'level',
    maxLevel: 2,
    baseCost: 2_500,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock cream and skim milk.' : 'Faster separation, bigger cream tank.'),
  },
  {
    id: 'cheese',
    category: 'processing',
    name: 'Cheese Vat',
    description: 'Slowly turns milk into cheese wheels.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 4_000,
    growth: 1.7,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock cheese wheels (100 coins each).' : '+40% vat speed, +10% wheel value.'),
  },
  {
    id: 'yogurt',
    category: 'processing',
    name: 'Yogurt Line',
    description: 'Cultured cups with fruit on the bottom.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 5_000,
    growth: 1.7,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [],
    next: (l) => (l === 0 ? 'Unlock yogurt 4-packs (60 coins).' : '+40% yogurt line speed.'),
  },
  {
    id: 'fruit',
    category: 'processing',
    name: 'Fruit Supply',
    description: 'A crate of berries for the yogurt line.',
    kind: 'consumable',
    maxLevel: Infinity,
    baseCost: 12,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'yogurt' }],
    effects: [],
    consumable: { resource: 'fruit', amount: 5 },
    next: () => '+5 fruit supplies.',
  },
  {
    id: 'quality-lab',
    category: 'processing',
    name: 'Quality Lab',
    description: 'Testing that earns Premium grades.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 3_000,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [{ stat: 'qualityLab', perLevel: 1 }],
    next: () => 'Easier Premium grade, +5% product value.',
  },
  {
    id: 'machine-tuning',
    category: 'processing',
    name: 'Machine Tuning',
    description: 'Grease, belts and better gaskets.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 1_000,
    growth: 1.6,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [{ stat: 'machineSpeed', perLevel: 0.08 }],
    next: () => '+8% processing speed on every machine.',
  },

  // LOGISTICS
  {
    id: 'raw-storage',
    category: 'logistics',
    name: 'Raw Milk Storage',
    description: 'A bigger raw milk tank in the basement.',
    kind: 'level',
    maxLevel: 4,
    baseCost: 120,
    growth: 1.7,
    prereqs: [{ kind: 'upgrade', id: 'pipeline' }],
    effects: [{ stat: 'rawCap', perLevel: 50 }],
    next: () => '+50 L raw tank capacity.',
  },
  {
    id: 'goods-storage',
    category: 'logistics',
    name: 'Finished Goods Storage',
    description: 'Shelving for packs, crates, cheese and yogurt.',
    kind: 'level',
    maxLevel: 4,
    baseCost: 350,
    growth: 1.7,
    prereqs: [{ kind: 'upgrade', id: 'bottler' }],
    effects: [{ stat: 'goodsCap', perLevel: 20 }],
    next: () => '+20 product units of storage.',
  },
  {
    id: 'conveyor',
    category: 'logistics',
    name: 'Short Conveyor',
    description: 'Belts between the bottling stations.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 180,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'bottler' }],
    effects: [{ stat: 'conveyor', perLevel: 0.15 }],
    next: () => '+15% bottle filler and crate packer speed.',
  },
  {
    id: 'cart',
    category: 'logistics',
    name: 'Delivery Cart',
    description: 'Haul everything to market in one trip.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 500,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [],
    next: () => 'Unlocks "Sell all" buttons in the Market.',
  },
  {
    id: 'truck',
    category: 'logistics',
    name: 'Delivery Truck',
    description: 'Scheduled runs that pay +10% per load.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 850,
    growth: 1.8,
    prereqs: [{ kind: 'upgrade', id: 'bottler' }],
    effects: [{ stat: 'truckLevel', perLevel: 1 }],
    next: (l) => (l === 0 ? 'A truck in the dispatch bay (10 units / 60s).' : '+10 load size, -15s interval.'),
  },
  {
    id: 'auto-dispatch',
    category: 'logistics',
    name: 'Auto Dispatch',
    description: 'The truck leaves by itself the moment it is ready.',
    kind: 'level',
    maxLevel: 1,
    baseCost: 2_000,
    growth: 1,
    prereqs: [{ kind: 'upgrade', id: 'truck' }],
    effects: [],
    next: () => 'Truck dispatches automatically.',
  },
  {
    id: 'contracts',
    category: 'logistics',
    name: 'Market Contracts',
    description: 'Regular customers on the market board.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 1_200,
    growth: 1.8,
    prereqs: [],
    effects: [{ stat: 'contracts', perLevel: 1 }],
    next: () => '+1 order slot and +10% order rewards.',
  },

  // RESEARCH
  {
    id: 'efficient-feeding',
    category: 'research',
    name: 'Efficient Feeding',
    description: 'Ration planning research.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 300,
    growth: 1.6,
    prereqs: [],
    effects: [{ stat: 'feedUse', perLevel: 0.04 }],
    next: () => '-4% feed consumption.',
  },
  {
    id: 'water-conservation',
    category: 'research',
    name: 'Water Conservation',
    description: 'Fewer spills, smarter valves.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 300,
    growth: 1.6,
    prereqs: [],
    effects: [{ stat: 'waterUse', perLevel: 0.04 }],
    next: () => '-4% water consumption.',
  },
  {
    id: 'dairy-practices',
    category: 'research',
    name: 'Better Dairy Practices',
    description: 'Raises the ceiling on what great care can do.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 550,
    growth: 1.6,
    prereqs: [{ kind: 'cows', count: 3 }],
    effects: [{ stat: 'careCap', perLevel: 0.02 }],
    next: () => '+2% maximum care multiplier.',
  },
  {
    id: 'quality-control',
    category: 'research',
    name: 'Quality Control',
    description: 'Tighter process, better grades.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 800,
    growth: 1.6,
    prereqs: [{ kind: 'upgrade', id: 'cooling' }],
    effects: [{ stat: 'qualityControl', perLevel: 1 }],
    next: () => 'Lowers Fresh / Premium care thresholds by 2.',
  },
  {
    id: 'factory-optimization',
    category: 'research',
    name: 'Factory Optimization',
    description: 'Shorter cycles everywhere.',
    kind: 'level',
    maxLevel: 5,
    baseCost: 1_000,
    growth: 1.6,
    prereqs: [{ kind: 'upgrade', id: 'pasteurizer' }],
    effects: [{ stat: 'cycleReduce', perLevel: 0.05 }],
    next: () => '-5% machine cycle time.',
  },
  {
    id: 'market-network',
    category: 'research',
    name: 'Strong Market Network',
    description: 'Better buyers for every delivery.',
    kind: 'level',
    maxLevel: 3,
    baseCost: 1_500,
    growth: 1.7,
    prereqs: [],
    effects: [{ stat: 'orderValue', perLevel: 0.03 }],
    next: () => '+3% truck delivery and order value.',
  },
]

export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))

export const CATEGORIES: { id: UpgradeCategory; label: string }[] = [
  { id: 'herd', label: 'Herd' },
  { id: 'care', label: 'Care' },
  { id: 'milking', label: 'Milking' },
  { id: 'processing', label: 'Processing' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'research', label: 'Research' },
]

export function level(state: GameState, id: string): number {
  return state.upgrades[id] ?? 0
}

export function has(state: GameState, id: string): boolean {
  return level(state, id) > 0
}

// Upgrade maps are replaced (never mutated) on purchase, so the object identity is a safe cache key.
const statCache = new WeakMap<Record<string, number>, Map<StatKey, number>>()

export function stat(state: GameState, key: StatKey): number {
  let cache = statCache.get(state.upgrades)
  if (!cache) {
    cache = new Map()
    statCache.set(state.upgrades, cache)
  }
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  let total = 0
  for (const u of UPGRADES) {
    const l = state.upgrades[u.id]
    if (!l) continue
    for (const e of u.effects) if (e.stat === key) total += e.perLevel * l
  }
  cache.set(key, total)
  return total
}

export function upgradeCost(baseCost: number, growth: number, currentLevel: number) {
  return Math.ceil(baseCost * Math.pow(growth, currentLevel))
}

export function describePrereq(p: Prereq): string {
  if (p.kind === 'cows') return `Own ${p.count} cows`
  const def = UPGRADE_MAP[p.id]
  return `Requires ${def?.name ?? p.id}${p.level && p.level > 1 ? ` Lv ${p.level}` : ''}`
}

export function prereqMet(state: GameState, p: Prereq): boolean {
  if (p.kind === 'cows') return state.cows.length >= p.count
  return level(state, p.id) >= (p.level ?? 1)
}

export { pct }
