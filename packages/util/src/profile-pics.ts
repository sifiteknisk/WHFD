// apps/web/static/profilepics — 1.png through 129.png, with two gaps
const PROFILE_PIC_MAX = 129
const MISSING_PROFILE_PICS = new Set([50, 103])

const PROFILE_PIC_IDS = Array.from(
  { length: PROFILE_PIC_MAX },
  (_, index) => index + 1
).filter(id => !MISSING_PROFILE_PICS.has(id))

export const randomProfilePicUrl = (): string => {
  const id =
    PROFILE_PIC_IDS[Math.floor(Math.random() * PROFILE_PIC_IDS.length)]!
  return `/profilepics/${id}.png`
}
