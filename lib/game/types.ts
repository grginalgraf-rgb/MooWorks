export type GameMode = 'country' | 'calf' | 'dash' | 'endless' | 'milkrun'

export type BreedId = 'meadow' | 'holstein' | 'jersey' | 'brownswiss' | 'highland'

export type Cow = {
  id: string
  name: string
  breed: BreedId
  milkReadyLitres: number
  happiness: number
  nutrition: number
  hydration: number
  health: number
  isAdult: boolean
  /** 0–100 growth progress for calves */
  growth: number
}

export type MachineId =
  | 'cooling'
  | 'pasteurizer'
  | 'homogenizer'
  | 'bottler'
  | 'crater'
  | 'separator'
  | 'cheese'
  | 'yogurt'

export type MachineStatus = 'locked' | 'idle' | 'running' | 'blocked' | 'paused'

export type MachineState = {
  enabled: boolean
  /** 0–1 progress through the current batch */
  progress: number
  /** true when a batch's input has already been consumed */
  loaded: boolean
  status: MachineStatus
  blockedReason?: string
}

export type InventoryKey =
  | 'can'
  | 'barnBuffer'
  | 'raw'
  | 'chilled'
  | 'pasteurized'
  | 'cream'
  | 'skim'
  | 'packs'
  | 'crates'
  | 'cheese'
  | 'yogurt'
  | 'fruit'

export type Inventory = Record<InventoryKey, number>

export type SellableKey = 'raw' | 'pasteurized' | 'cream' | 'skim' | 'packs' | 'crates' | 'cheese' | 'yogurt'

export type OrderStatus = 'available' | 'accepted'

export type MarketOrder = {
  id: string
  templateId: string
  customer: string
  product: SellableKey
  amount: number
  reward: number
  status: OrderStatus
}

export type UpgradeCategory = 'herd' | 'care' | 'milking' | 'processing' | 'logistics' | 'research'

export type GameEvent =
  | { type: 'coins'; amount: number; at: 'market' | 'truck' | 'order' | 'tank' }
  | { type: 'toast'; title: string; body?: string; tone?: 'info' | 'good' | 'warn' }
  | { type: 'achievement'; id: string }
  | { type: 'sound'; name: SoundName }
  | { type: 'collect'; cowId?: string; litres: number }
  | { type: 'unlock'; upgradeId: string }
  | { type: 'cowAdded'; cowId: string }
  | { type: 'pour'; target: 'market' | 'tank' }
  | { type: 'truck' }
  | { type: 'hint'; text: string }

export type SoundName = 'collect' | 'sell' | 'buy' | 'achievement' | 'error' | 'truck' | 'order'

export type GameState = {
  version: number
  mode: GameMode
  coins: number
  cows: Cow[]
  nextCowNumber: number
  inventory: Inventory
  freshness: { raw: number; chilled: number }
  resources: {
    feedStock: number
    waterStock: number
    feedTrough: number
    waterTrough: number
  }
  upgrades: Record<string, number>
  machines: Record<MachineId, MachineState>
  autoSellRaw: boolean
  truckTimer: number
  handCooldown: number
  lifetime: {
    revenue: number
    milkProducedLitres: number
    milkSoldLitres: number
    productsSold: number
    ordersCompleted: number
    playTimeSeconds: number
    truckDeliveries: number
  }
  flags: Record<string, boolean>
  wellFedSeconds: number
  achievements: string[]
  orders: MarketOrder[]
  orderTimer: number
  orderSerial: number
  dashIndex: number
  rng: number
  tutorial: { step: number; skipped: boolean; completed: boolean }
  legacy: { shown: boolean; retiredRuns: number }
  modeClock: number
  ended: null | { outcome: 'won' | 'lost' | 'retired'; seconds: number }
  autoSellBank: number
  runStartedAt: number
  lastSavedAt: number
  /** Transient events drained by the store after every dispatch; never persisted */
  pending: GameEvent[]
}
