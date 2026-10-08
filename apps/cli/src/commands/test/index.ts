import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'test',
    description: 'Trigger first blood and bong overlays',
  },
  subCommands: {
    'first-blood': () => import('./first-blood').then(m => m.default),
    bong: () => import('./bong').then(m => m.default),
  },
})
