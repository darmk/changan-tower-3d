/**
 * Frontend-only WeChat follow prompt configuration.
 *
 * Display settings only: no WeChat credentials or follow verification are
 * involved. The shared key lets the visitor's choice carry across projects
 * deployed under the same origin.
 */
export const followGateConfig = {
  enabled: true,
  storageKey: 'darmk:follow-gate:main:v1',
  accountName: '程途漫记',
  eyebrow: '关注公众号 · 解锁完整体验',
  title: '先关注，再走进大雁塔',
  description: '创作不易，感谢支持。\n扫码关注公众号，继续发掘更多精彩内容和作品。',
  qrCodePath: 'images/qrcode_for_gh_10e8400b2bfb_860.jpg',
  confirmLabel: '我已关注，进入体验',
  helperText: '本页为前端引导，点击后将在此浏览器记住你的访问状态。',
} as const;
