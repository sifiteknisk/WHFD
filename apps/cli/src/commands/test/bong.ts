import { BONG_POINTS } from '@rctf/api/src/services/bongs'
import { defineCommand } from 'citty'
import { withDbAndRedis } from '../../lib/context'
import { awardTestSolve, findTeam } from './award'

export default defineCommand({
  meta: {
    name: 'bong',
    description:
      'Award enough points for one more bong so the bong overlay can play',
  },
  args: {
    team: {
      type: 'positional',
      description: 'Team name or email that should earn the bong',
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

      const result = await awardTestSolve(db, redis, team, BONG_POINTS, 'bong')
      return { team, result }
    })

    if ('error' in awarded) {
      console.error(awarded.error)
      process.exit(1)
    }

    const { team, result } = awarded
    console.log(
      `${team.name} solved ${result.challengeName} (${result.challengeId}) for ${result.points} pts.`
    )
    console.log(
      `Score is ${result.score.toLocaleString()}. Bongs ${result.bongsAvailable}/${result.bongsTotal}.`
    )
    console.log(
      'Stay logged in as this team. The overlay plays on the next poll if their bong total went up while the page was open.'
    )
  },
})
