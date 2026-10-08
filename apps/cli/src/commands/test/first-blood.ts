import { BONG_POINTS } from '@rctf/api/src/services/bongs'
import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'
import { awardTestSolve, findTeam } from './award'

const FIRST_BLOOD_POINTS = 500

export default defineCommand({
  meta: {
    name: 'first-blood',
    description:
      'Give a team the first flag solve on a new challenge so the scores overlay can play',
  },
  args: {
    team: {
      type: 'positional',
      description: 'Team name or email that takes the blood',
      required: true,
    },
    force: {
      type: 'boolean',
      default: false,
      description: 'Run even when NODE_ENV=production',
    },
  },
  run: async ({ args }) => {
    if (Bun.env.NODE_ENV === 'production' && !args.force) {
      console.error('Refusing to run: NODE_ENV=production.')
      console.error(
        'Re-run with --force to award a test solve on this instance.'
      )
      process.exit(1)
    }

    const awarded = await withDbAndRedis(async ({ db, redis }) => {
      const team = await findTeam(db, args.team)
      if (!team) {
        return { error: `No team found for '${args.team}'` } as const
      }
      if (team.banned) {
        return { error: `${team.name} is banned` } as const
      }

      const result = await awardTestSolve(
        db,
        redis,
        team,
        FIRST_BLOOD_POINTS,
        'blood'
      )
      return { team, result }
    })

    if ('error' in awarded) {
      console.error(awarded.error)
      process.exit(1)
    }

    const { team, result } = awarded
    console.log(
      `${team.name} took first blood on ${result.challengeName} (${result.challengeId}) for ${result.points} pts.`
    )
    console.log(
      `Score is ${result.score.toLocaleString()}. Bongs ${result.bongsAvailable}/${result.bongsTotal} (one bong per ${BONG_POINTS} pts).`
    )
    console.log(
      'Have /scores open with First bloods on before the next leaderboard poll. Bloods that already existed when the page loaded will not replay.'
    )
  },
})
