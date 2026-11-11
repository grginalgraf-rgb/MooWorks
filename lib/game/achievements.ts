import { BALANCE } from './balance'
import { averageHappiness, barnCapacity, runningMachineCount } from './economy'
import type { GameState } from './types'
import { has } from './upgrades'

export type AchievementDef = { id: string; name: string; description: string; check: (s: GameState) => boolean }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-drop', name: 'First Drop', description: 'Collect milk for the first time.', check: (s) => !!s.flags.collected },
  { id: 'first-sale', name: 'First Sale', description: 'Sell your first litre.', check: (s) => s.lifetime.milkSoldLitres > 0 },
  { id: 'growing-herd', name: 'Growing Herd', description: 'Own 3 cows.', check: (s) => s.cows.length >= 3 },
  { id: 'full-pasture', name: 'Full Pasture', description: 'Fill the current barn capacity.', check: (s) => s.cows.length >= barnCapacity(s) },
  { id: 'happy-herd', name: 'Happy Herd', description: 'Average happiness above 90.', check: (s) => averageHappiness(s) > 90 },
  { id: 'well-fed', name: 'Well Fed', description: 'Keep feed above 80% for 5 minutes.', check: (s) => s.wellFedSeconds >= BALANCE.wellFedTargetSeconds },
  { id: 'first-machine', name: 'First Machine', description: 'Buy a Milking Machine.', check: (s) => has(s, 'milking-machine') },
  { id: 'no-more-buckets', name: 'No More Buckets', description: 'Unlock the Auto Collector.', check: (s) => has(s, 'auto-collector') },
  { id: 'cold-chain', name: 'Cold Chain', description: 'Unlock the Cooling Tank.', check: (s) => has(s, 'cooling') },
  { id: 'pasteurized', name: 'Pasteurized', description: 'Produce pasteurized milk.', check: (s) => !!s.flags.producedPasteurized },
  { id: 'bottled-up', name: 'Bottled Up', description: 'Produce your first 6-pack.', check: (s) => !!s.flags.producedPack },
  { id: 'truck-driver', name: 'Truck Driver', description: 'Complete the first automatic delivery.', check: (s) => !!s.flags.autoDelivery },
  { id: 'cream-of-the-crop', name: 'Cream of the Crop', description: 'Sell cream.', check: (s) => !!s.flags.soldCream },
  { id: 'say-cheese', name: 'Say Cheese', description: 'Sell your first cheese wheel.', check: (s) => !!s.flags.soldCheese },
  { id: 'yogurt-maker', name: 'Yogurt Maker', description: 'Sell your first yogurt pack.', check: (s) => !!s.flags.soldYogurt },
  { id: 'local-favorite', name: 'Local Favorite', description: 'Complete 10 market orders.', check: (s) => s.lifetime.ordersCompleted >= 10 },
  { id: 'moo-nopoly', name: 'Moo-nopoly', description: 'Hold 10,000 coins at once.', check: (s) => s.coins >= 10_000 },
  { id: 'dairy-legacy', name: 'Dairy Legacy', description: 'Reach 100,000 lifetime revenue.', check: (s) => s.lifetime.revenue >= BALANCE.legacyRevenue },
  { id: 'big-herd', name: 'Big Herd', description: 'Own 20 cows.', check: (s) => s.cows.length >= 20 },
  { id: 'factory-floor', name: 'Factory Floor', description: 'Have 5 machines running at once.', check: (s) => runningMachineCount(s) >= 5 },
]

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))

export function checkAchievements(s: GameState): GameState {
  const newly = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.check(s))
  if (newly.length === 0) return s
  return {
    ...s,
    achievements: [...s.achievements, ...newly.map((a) => a.id)],
    pending: [
      ...s.pending,
      ...newly.flatMap((a) => [{ type: 'achievement' as const, id: a.id }, { type: 'sound' as const, name: 'achievement' as const }]),
    ],
  }
}
