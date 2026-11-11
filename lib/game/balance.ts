import type { BreedId, MachineId, SellableKey } from './types'

/** Every tunable gameplay number lives in this file. */
export const BALANCE = {
  tickSeconds: 0.2,
  maxCatchUpSeconds: 3,

  start: {
    coins: 35,
    firstCowName: 'Daisy',
    firstCowReadyLitres: 2,
    barnCapacity: 3,
    feedStock: 12,
    waterStock: 12,
    feedTrough: 6,
    waterTrough: 6,
  },

  cow: {
    litresPerMinute: 3.6,
    holdingCapacity: 6,
    milkReadyIndicator: 1,
    feedPerMinute: 1,
    waterPerMinute: 1,
    basePrice: 60,
    priceGrowth: 1.22,
    careClampMin: 0.25,
    careClampMax: 1.25,
    nutritionRecoveryPerSec: 2,
    hydrationRecoveryPerSec: 2,
    starvationPerSec: 0.45,
    healthLossPerSec: 0.12,
    healthRecoveryPerSec: 0.08,
    lowCareThreshold: 30,
    calfGrowthSeconds: 180,
    calfFeedFactor: 0.5,
  },

  happiness: {
    base: 58,
    perBedding: 7,
    perShade: 5,
    spaceBonus: 12,
    fedBonus: 16,
    hungryPenalty: -26,
    riseRate: 0.6,
    riseRatePerShade: 0.3,
    fallRate: 0.6,
    beddingFallReduction: 0.5,
  },

  troughs: {
    capacity: 10,
    autoFillPerSec: 2,
  },

  resources: {
    baseFeedCapacity: 40,
    baseWaterCapacity: 40,
    lowWarningFraction: 0.2,
  },

  can: {
    baseCapacity: 5,
    baseCooldown: 1.0,
    cooldownReductionPerLevel: 0.25,
  },

  milking: {
    cowsPerMachineLevel: 3,
    cowsPerParallelLevel: 2,
    litresPerSecondPerSlot: 0.5,
    barnBufferCapacity: 20,
    pipelineLitresPerSecond: 2,
  },

  storage: {
    rawBase: 50,
    rawPerLevel: 50,
    chilledPerLevel: 100,
    pasteurizedBase: 60,
    pasteurizedPerLevel: 30,
    goodsBase: 20,
    goodsPerLevel: 20,
    creamTankBase: 30,
    creamTankPerLevel: 15,
  },

  freshness: {
    decayPerSecond: 0.05,
    minimum: 60,
    priceFloor: 0.85,
  },

  quality: {
    fresh: { multiplier: 1.15, careThreshold: 80, freshnessThreshold: 85 },
    premium: { multiplier: 1.3, careThreshold: 95 },
    thresholdPerQualityControl: 2,
    premiumThresholdPerLab: 3,
    labValueBonus: 0.05,
  },

  prices: {
    raw: 6,
    pasteurized: 7.5,
    packs: 54,
    crates: 125,
    cream: 24,
    skim: 4,
    cheese: 100,
    yogurt: 60,
  } satisfies Record<SellableKey, number>,

  autoSell: {
    litresPerSecond: 1,
    overflowFraction: 0.5,
  },

  truck: {
    baseInterval: 60,
    intervalReductionPerLevel: 15,
    loadPerLevel: 10,
    deliveryBonus: 0.1,
  },

  orders: {
    baseSlots: 2,
    slotsPerContract: 1,
    refreshSeconds: 30,
    rewardPerContract: 0.1,
    rewardPerNetwork: 0.03,
  },

  offline: {
    capSeconds: 2 * 60 * 60,
    efficiency: 0.5,
    minimumSeconds: 30,
  },

  wellFedTargetSeconds: 300,
  legacyRevenue: 100_000,
  milkRunTarget: 10_000,
  autosaveSeconds: 5,
} as const

export type BreedDef = {
  id: BreedId
  name: string
  milkMultiplier: number
  feedMultiplier: number
  creamBonus: number
  healthRecovery: number
  priceMultiplier: number
  unlockUpgrade?: string
  blurb: string
  coat: { base: string; patch: string; shade: string }
  horns?: boolean
  shaggy?: boolean
}

export const BREEDS: Record<BreedId, BreedDef> = {
  meadow: {
    id: 'meadow',
    name: 'Meadow Cow',
    milkMultiplier: 1,
    feedMultiplier: 1,
    creamBonus: 0,
    healthRecovery: 1,
    priceMultiplier: 1,
    blurb: 'Balanced all-rounder.',
    coat: { base: '#f4efe4', patch: '#2b2420', shade: '#cfc6b4' },
  },
  holstein: {
    id: 'holstein',
    name: 'Holstein',
    milkMultiplier: 1.15,
    feedMultiplier: 1,
    creamBonus: 0,
    healthRecovery: 1,
    priceMultiplier: 1.15,
    unlockUpgrade: 'breed-holstein',
    blurb: '+15% milk volume.',
    coat: { base: '#fbfaf5', patch: '#141210', shade: '#d6d2c6' },
  },
  jersey: {
    id: 'jersey',
    name: 'Jersey',
    milkMultiplier: 0.95,
    feedMultiplier: 1,
    creamBonus: 0.2,
    healthRecovery: 1,
    priceMultiplier: 1.2,
    unlockUpgrade: 'breed-jersey',
    blurb: '+20% cream yield, -5% milk.',
    coat: { base: '#c9965a', patch: '#9c6b39', shade: '#a77a45' },
  },
  brownswiss: {
    id: 'brownswiss',
    name: 'Brown Swiss',
    milkMultiplier: 1.1,
    feedMultiplier: 1,
    creamBonus: 0,
    healthRecovery: 1.1,
    priceMultiplier: 1.35,
    unlockUpgrade: 'breed-brownswiss',
    blurb: '+10% milk, faster health recovery.',
    coat: { base: '#8f8170', patch: '#6d6052', shade: '#76695b' },
  },
  highland: {
    id: 'highland',
    name: 'Highland',
    milkMultiplier: 0.9,
    feedMultiplier: 0.75,
    creamBonus: 0,
    healthRecovery: 1,
    priceMultiplier: 1.25,
    unlockUpgrade: 'breed-highland',
    blurb: '25% less feed, -10% milk.',
    coat: { base: '#c8642e', patch: '#a44d20', shade: '#9a4a22' },
    horns: true,
    shaggy: true,
  },
}

export type MachineDef = {
  id: MachineId
  name: string
  short: string
  upgradeId: string
  kind: 'transfer' | 'batch' | 'passive'
  cycleSeconds: number
  inputs: { key: 'raw' | 'chilled' | 'pasteurized' | 'packs' | 'fruit'; amount: number }[]
  outputs: { key: 'chilled' | 'pasteurized' | 'packs' | 'crates' | 'cream' | 'skim' | 'cheese' | 'yogurt'; amount: number }[]
  /** litres per second for transfer machines */
  transferRate?: number
  levelSpeedBonus: number
  conveyor?: boolean
  recipe: string
}

export const MACHINES: Record<MachineId, MachineDef> = {
  cooling: {
    id: 'cooling',
    name: 'Cooling Tank',
    short: 'COOL',
    upgradeId: 'cooling',
    kind: 'transfer',
    cycleSeconds: 0,
    transferRate: 1.5,
    inputs: [{ key: 'raw', amount: 1 }],
    outputs: [{ key: 'chilled', amount: 1 }],
    levelSpeedBonus: 0.3,
    recipe: 'Raw milk → chilled milk. Freshness stops dropping.',
  },
  pasteurizer: {
    id: 'pasteurizer',
    name: 'Pasteurizer',
    short: 'PAST',
    upgradeId: 'pasteurizer',
    kind: 'batch',
    cycleSeconds: 3,
    inputs: [{ key: 'chilled', amount: 2 }],
    outputs: [{ key: 'pasteurized', amount: 2 }],
    levelSpeedBonus: 0.4,
    recipe: '2 L chilled → 2 L pasteurized (+25% value).',
  },
  homogenizer: {
    id: 'homogenizer',
    name: 'Homogenizer',
    short: 'HOMO',
    upgradeId: 'homogenizer',
    kind: 'passive',
    cycleSeconds: 0,
    inputs: [],
    outputs: [],
    levelSpeedBonus: 0,
    recipe: 'Inline with the bottle filler: +10% bottled value per level.',
  },
  bottler: {
    id: 'bottler',
    name: 'Bottle Filler',
    short: 'BOTTLE',
    upgradeId: 'bottler',
    kind: 'batch',
    cycleSeconds: 6,
    inputs: [{ key: 'pasteurized', amount: 6 }],
    outputs: [{ key: 'packs', amount: 1 }],
    levelSpeedBonus: 0.35,
    conveyor: true,
    recipe: '6 L pasteurized → one 6-pack of bottles.',
  },
  crater: {
    id: 'crater',
    name: 'Crate Packer',
    short: 'CRATE',
    upgradeId: 'crater',
    kind: 'batch',
    cycleSeconds: 8,
    inputs: [{ key: 'packs', amount: 2 }],
    outputs: [{ key: 'crates', amount: 1 }],
    levelSpeedBonus: 0.4,
    conveyor: true,
    recipe: 'Two 6-packs → one crate (+15% value).',
  },
  separator: {
    id: 'separator',
    name: 'Cream Separator',
    short: 'CREAM',
    upgradeId: 'separator',
    kind: 'batch',
    cycleSeconds: 8,
    inputs: [{ key: 'pasteurized', amount: 4 }],
    outputs: [
      { key: 'cream', amount: 1 },
      { key: 'skim', amount: 3 },
    ],
    levelSpeedBonus: 0.5,
    recipe: '4 L pasteurized → 1 L cream + 3 L skim.',
  },
  cheese: {
    id: 'cheese',
    name: 'Cheese Vat',
    short: 'CHEESE',
    upgradeId: 'cheese',
    kind: 'batch',
    cycleSeconds: 30,
    inputs: [{ key: 'pasteurized', amount: 10 }],
    outputs: [{ key: 'cheese', amount: 1 }],
    levelSpeedBonus: 0.4,
    recipe: '10 L pasteurized → 1 cheese wheel.',
  },
  yogurt: {
    id: 'yogurt',
    name: 'Yogurt Line',
    short: 'YOGURT',
    upgradeId: 'yogurt',
    kind: 'batch',
    cycleSeconds: 20,
    inputs: [
      { key: 'pasteurized', amount: 5 },
      { key: 'fruit', amount: 1 },
    ],
    outputs: [{ key: 'yogurt', amount: 1 }],
    levelSpeedBonus: 0.4,
    recipe: '5 L pasteurized + 1 fruit → yogurt 4-pack.',
  },
}

/** Processing priority for shared pasteurized milk (players toggle machines to steer it). */
export const MACHINE_ORDER: MachineId[] = [
  'cooling',
  'pasteurizer',
  'bottler',
  'separator',
  'cheese',
  'yogurt',
  'crater',
  'homogenizer',
]

export const FARM_LEVELS = [
  { level: 1, name: 'Tiny Pasture', revenue: 0 },
  { level: 2, name: 'Family Dairy', revenue: 250 },
  { level: 3, name: 'Local Supplier', revenue: 1_000 },
  { level: 4, name: 'Dairy Workshop', revenue: 3_000 },
  { level: 5, name: 'Milk Processor', revenue: 7_500 },
  { level: 6, name: 'Regional Dairy', revenue: 15_000 },
  { level: 7, name: 'Dairy Brand', revenue: 30_000 },
  { level: 8, name: 'MooWorks Estate', revenue: 60_000 },
  { level: 9, name: 'Dairy Legacy', revenue: 100_000 },
] as const

export const COW_NAMES = [
  'Daisy', 'Clover', 'Buttercup', 'Mabel', 'Hazel', 'Pippa', 'Rosie', 'Bluebell', 'Marigold', 'Juniper',
  'Willow', 'Poppy', 'Maple', 'Ginger', 'Honey', 'Olive', 'Tilly', 'Bramble', 'Fern', 'Dotty',
  'Moxie', 'Nutmeg', 'Peaches', 'Biscuit', 'Lulu', 'Pearl', 'Sage', 'Wren', 'Toffee', 'Clementine',
  'Ivy', 'Bonnie', 'Primrose', 'Truffle', 'Nell',
]
