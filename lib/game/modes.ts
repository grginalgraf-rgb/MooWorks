import type { GameMode, SellableKey } from './types'

export type FixedOrder = { customer: string; product: SellableKey; amount: number; reward: number }

export type ModeDef = {
  id: GameMode
  name: string
  tagline: string
  rules: string[]
  startCoins: number
  startWithCalf: boolean
  cowPriceBase: number
  buyAsCalf: boolean
  calfPriceFactor: number
  upgradeCostMultiplier: number
  timeLimitSeconds?: number
  targetRevenue?: number
  legacyGoal: boolean
  offlineProgress: boolean
  orderBoard: boolean
  fixedOrders?: FixedOrder[]
}

export const MODES: Record<GameMode, ModeDef> = {
  country: {
    id: 'country',
    name: 'Country Life',
    tagline: 'The relaxed main game.',
    rules: ['No timer', 'Reach 100,000 lifetime revenue for the Dairy Legacy', 'Offline progress up to 2h'],
    startCoins: 35,
    startWithCalf: false,
    cowPriceBase: 60,
    buyAsCalf: false,
    calfPriceFactor: 1,
    upgradeCostMultiplier: 1,
    legacyGoal: true,
    offlineProgress: true,
    orderBoard: true,
  },
  calf: {
    id: 'calf',
    name: 'Calf Season',
    tagline: 'Raise your herd from calves.',
    rules: ['Start with Daisy and a calf', 'Less money, but new cows arrive as cheap calves', 'Calves grow when fed and watered'],
    startCoins: 20,
    startWithCalf: true,
    cowPriceBase: 60,
    buyAsCalf: true,
    calfPriceFactor: 0.55,
    upgradeCostMultiplier: 1,
    legacyGoal: true,
    offlineProgress: true,
    orderBoard: true,
  },
  dash: {
    id: 'dash',
    name: 'Dairy Dash',
    tagline: 'Fixed orders against the clock.',
    rules: ['10 minute timer', 'Fulfil 5 fixed market orders in sequence', 'Same orders every run for fair replay'],
    startCoins: 120,
    startWithCalf: false,
    cowPriceBase: 60,
    buyAsCalf: false,
    calfPriceFactor: 1,
    upgradeCostMultiplier: 1,
    timeLimitSeconds: 600,
    legacyGoal: false,
    offlineProgress: false,
    orderBoard: false,
    fixedOrders: [
      { customer: 'Corner Café', product: 'raw', amount: 10, reward: 90 },
      { customer: 'Village Diner', product: 'raw', amount: 20, reward: 180 },
      { customer: 'Sunday Bakery', product: 'raw', amount: 35, reward: 300 },
      { customer: 'School Kitchen', product: 'raw', amount: 50, reward: 450 },
      { customer: 'Harbor Hotel', product: 'raw', amount: 70, reward: 700 },
    ],
  },
  endless: {
    id: 'endless',
    name: 'Endless Ranch',
    tagline: 'No finish line. Build forever.',
    rules: ['No retirement goal', 'Upgrades cost 15% more', 'Offline progress up to 2h'],
    startCoins: 35,
    startWithCalf: false,
    cowPriceBase: 60,
    buyAsCalf: false,
    calfPriceFactor: 1,
    upgradeCostMultiplier: 1.15,
    legacyGoal: false,
    offlineProgress: true,
    orderBoard: true,
  },
  milkrun: {
    id: 'milkrun',
    name: 'Milk Run',
    tagline: 'Speedrun to 10,000 revenue.',
    rules: ['Timer counts up', 'Finish at 10,000 lifetime revenue', 'Best time saved locally'],
    startCoins: 35,
    startWithCalf: false,
    cowPriceBase: 60,
    buyAsCalf: false,
    calfPriceFactor: 1,
    upgradeCostMultiplier: 1,
    targetRevenue: 10_000,
    legacyGoal: false,
    offlineProgress: false,
    orderBoard: true,
  },
}

export const MODE_LIST: GameMode[] = ['country', 'calf', 'dash', 'milkrun', 'endless']
