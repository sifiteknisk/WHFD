import {
  podiumMinColumns,
  resolvePodiumSlots,
  type PodiumEntry,
  type PodiumSlot,
} from '$routes/challenges/details/podium-slots'
import { describe, expect, test } from 'bun:test'

const entry = (id: string, isSelf = false, detail = ''): PodiumEntry => ({
  userId: id,
  name: id,
  avatarUrl: null,
  detail,
  isSelf,
})

describe('resolvePodiumSlots — rank slots', () => {
  test('logged out returns four slots', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a')],
      isAuthenticated: false,
    })
    expect(slots).toHaveLength(4)
  })

  test('top three take gold/silver/bronze; self overrides the medal', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a', true), entry('b'), entry('c'), entry('d')],
      isAuthenticated: true,
    })
    expect(slots[0]).toMatchObject({
      kind: 'entry',
      variant: 'self',
      isSelf: true,
    })
    expect(slots[1]).toMatchObject({
      kind: 'entry',
      variant: 'silver',
      isSelf: false,
    })
    expect(slots[2]).toMatchObject({
      kind: 'entry',
      variant: 'bronze',
      isSelf: false,
    })
  })

  test('ordinals label positions 1st/2nd/3rd', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      isAuthenticated: false,
    })
    expect(slots[0]?.ordinal).toBe('1st')
    expect(slots[1]?.ordinal).toBe('2nd')
    expect(slots[2]?.ordinal).toBe('3rd')
  })
})

describe('resolvePodiumSlots — fourth place stays a rank', () => {
  test('user in top 3 shows the 4th solver as a plain entry', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a', true), entry('b'), entry('c'), entry('d')],
      isAuthenticated: true,
    })
    expect(slots[3]).toMatchObject({
      kind: 'entry',
      name: 'd',
      ordinal: '4th',
      variant: 'nth',
      isSelf: false,
    })
  })

  test('logged out shows the 4th solver as a plain entry', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('d')],
      isAuthenticated: false,
    })
    expect(slots[0]?.variant).toBe('gold')
    expect(slots[3]).toMatchObject({ kind: 'entry', name: 'd', isSelf: false })
  })

  test('logged out with only three solvers leaves slot 4 empty', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      isAuthenticated: false,
    })
    expect(slots[3]).toMatchObject({ kind: 'empty', name: '', ordinal: '' })
  })
})

describe('resolvePodiumSlots — hides the you place', () => {
  test('solved outside the top 3 omits the self slot', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('me', true)],
      isAuthenticated: true,
    })
    expect(slots).toHaveLength(3)
    expect(slots.some(slot => slot.isSelf)).toBe(false)
    expect(slots.some(slot => slot.name === 'me')).toBe(false)
  })

  test('unsolved authenticated user does not get a You placeholder', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      isAuthenticated: true,
    })
    expect(slots).toHaveLength(3)
    expect(slots.some(slot => slot.ordinal === 'You')).toBe(false)
    expect(slots.some(slot => slot.isSelf)).toBe(false)
  })

  test('authenticated non-solver never sees the literal 4th solver', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('d')],
      isAuthenticated: true,
    })
    expect(slots).toHaveLength(3)
    expect(slots.some(slot => slot.name === 'd')).toBe(false)
  })
})

describe('resolvePodiumSlots — fewer solvers leave empty dashed slots', () => {
  test('two solvers leave slots 3 and 4 empty when logged out', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b')],
      isAuthenticated: false,
    })
    expect(slots[0]?.kind).toBe('entry')
    expect(slots[1]?.kind).toBe('entry')
    expect(slots[2]).toMatchObject({ kind: 'empty', name: '' })
    expect(slots[3]).toMatchObject({ kind: 'empty', name: '' })
  })

  test('one solver leaves later slots empty when logged out', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a')],
      isAuthenticated: false,
    })
    expect(slots[0]?.kind).toBe('entry')
    expect(slots[1]?.kind).toBe('empty')
    expect(slots[2]?.kind).toBe('empty')
    expect(slots[3]?.kind).toBe('empty')
  })

  test('no solvers leaves every logged-out slot empty', () => {
    const slots = resolvePodiumSlots({
      top: [],
      isAuthenticated: false,
    })
    expect(slots.every(slot => slot.kind === 'empty')).toBe(true)
  })
})

describe('podiumMinColumns — first and second stay, later slots hide', () => {
  const slots = (count: number): PodiumSlot[] =>
    Array.from({ length: count }, () => ({
      kind: 'entry',
      variant: 'nth',
      ordinal: '',
      name: '',
      avatarUrl: null,
      detail: '',
      isSelf: false,
    }))

  test('ranks stay in order so the last slot hides first', () => {
    expect(podiumMinColumns(slots(4))).toEqual([1, 2, 3, 4])
    expect(podiumMinColumns(slots(3))).toEqual([1, 2, 3])
  })
})
