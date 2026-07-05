// Regenerate every app icon + iOS splash from the volt logo mark.
//
// The source mark (public/logo-mark.png) is a transparent volt silhouette.
// Home-screen / PWA icons get a solid BLACK background so the silhouette
// stands out; the Android push badge stays transparent (it is masked by
// alpha); the splash screens center the mark on the app's dark ink.
//
// Run from the repo root:  node scripts/gen-icons.mjs
import sharp from "sharp";
import path from "node:path";

const pub = path.join(process.cwd(), "public");
const app = path.join(process.cwd(), "app");
const SRC = path.join(pub, "logo-mark.png");

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const INK = { r: 10, g: 10, b: 12, alpha: 1 }; // #0a0a0c app background
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// A square icon: the mark centered on `bg`, sized to `logoRatio` of the canvas.
async function squareIcon(size, file, { bg = BLACK, logoRatio = 0.72 } = {}) {
  const inner = Math.round(size * logoRatio);
  const mark = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(file);
}

// A launch screen: the mark centered on the dark ink at ~24% of the width.
async function splash(w, h, file) {
  const inner = Math.round(Math.min(w, h) * 0.26);
  const mark = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: INK } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(file);
}

const SPLASH_SIZES = [
  [1290, 2796], [1179, 2556], [1170, 2532], [1125, 2436],
  [1242, 2688], [828, 1792], [750, 1334], [1242, 2208],
];

await Promise.all([
  // PWA + home-screen icons — black background.
  squareIcon(192, path.join(pub, "icon-192.png")),
  squareIcon(512, path.join(pub, "icon-512.png")),
  squareIcon(180, path.join(pub, "apple-touch-icon.png")),
  squareIcon(180, path.join(pub, "apple-icon.png")),
  // App Router icon conventions — black background.
  squareIcon(512, path.join(app, "icon.png"), { logoRatio: 0.78 }),
  squareIcon(180, path.join(app, "apple-icon.png")),
  // Android push badge — transparent silhouette (masked by alpha).
  squareIcon(96, path.join(pub, "badge-96.png"), { bg: CLEAR, logoRatio: 0.9 }),
  // iOS launch screens — dark ink + centered mark.
  ...SPLASH_SIZES.map(([w, h]) =>
    splash(w, h, path.join(pub, "splash", `apple-splash-${w}x${h}.png`)),
  ),
]);

console.log("icons + splash generated from logo-mark.png");
