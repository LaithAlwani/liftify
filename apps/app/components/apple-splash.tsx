// iOS PWA launch screens. iOS picks the matching image by device CSS size +
// pixel ratio. Generated into /public/splash (dark bg + centered logo).
const SPLASH = [
  { w: 1290, h: 2796, cw: 430, ch: 932, dpr: 3 },
  { w: 1179, h: 2556, cw: 393, ch: 852, dpr: 3 },
  { w: 1170, h: 2532, cw: 390, ch: 844, dpr: 3 },
  { w: 1125, h: 2436, cw: 375, ch: 812, dpr: 3 },
  { w: 1242, h: 2688, cw: 414, ch: 896, dpr: 3 },
  { w: 828, h: 1792, cw: 414, ch: 896, dpr: 2 },
  { w: 750, h: 1334, cw: 375, ch: 667, dpr: 2 },
  { w: 1242, h: 2208, cw: 414, ch: 736, dpr: 3 },
] as const;

export function AppleSplash() {
  return (
    <>
      {SPLASH.map((s) => (
        <link
          key={`${s.w}x${s.h}`}
          rel="apple-touch-startup-image"
          media={`(device-width: ${s.cw}px) and (device-height: ${s.ch}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`}
          href={`/splash/apple-splash-${s.w}x${s.h}.png`}
        />
      ))}
    </>
  );
}
