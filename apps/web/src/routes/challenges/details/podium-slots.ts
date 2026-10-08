import { getTimeOrdinal } from '@rctf/util'
import type { RankVariant } from '../model/solve-times'

const MEDAL_VARIANTS: RankVariant[] = ['gold', 'silver', 'bronze', 'nth']

export interface PodiumEntry {
  userId: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

export type PodiumSlotKind = 'entry' | 'self' | 'placeholder' | 'empty'

export interface PodiumSlot {
  kind: PodiumSlotKind
  variant: RankVariant
  ordinal: string
  name: string
  avatarUrl: string | null
  detail: string
  isSelf: boolean
}

export interface ResolvePodiumInput {
  top: PodiumEntry[]
  isAuthenticated: boolean
}

function entrySlot(index: number, entry: PodiumEntry): PodiumSlot {
  return {
    kind: 'entry',
    variant: entry.isSelf ? 'self' : (MEDAL_VARIANTS[index] ?? 'nth'),
    ordinal: getTimeOrdinal(index + 1),
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    detail: entry.detail,
    isSelf: entry.isSelf,
  }
}

function emptySlot(index: number): PodiumSlot {
  return {
    kind: 'empty',
    variant: MEDAL_VARIANTS[index] ?? 'nth',
    ordinal: '',
    name: '',
    avatarUrl: null,
    detail: '',
    isSelf: false,
  }
}

export function resolvePodiumSlots(input: ResolvePodiumInput): PodiumSlot[] {
  const { top, isAuthenticated } = input

  const slots: PodiumSlot[] = []
  for (let index = 0; index < 3; index++) {
    const entry = top[index]
    slots.push(entry ? entrySlot(index, entry) : emptySlot(index))
  }

  const userInTopThree = top.slice(0, 3).some(entry => entry.isSelf)
  if (!userInTopThree && isAuthenticated) return slots

  const fourthEntry = top[3]
  slots.push(fourthEntry ? entrySlot(3, fourthEntry) : emptySlot(3))
  return slots
}

export function podiumMinColumns(slots: PodiumSlot[]): number[] {
  return slots.map((_, index) => index + 1)
}
