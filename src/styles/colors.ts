// Design tokens extracted from prototype/app/theme.css
// All colors use OKLCH with --accent-h: 295, --accent-c: 0.20 (Roxo)
// Use CSS custom properties via inline styles; these constants are for JS references.

export const cssVar = {
  // backgrounds
  bg: 'var(--bg)',
  bgPattern: 'var(--bg-pattern)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  surfaceHover: 'var(--surface-hover)',

  // borders
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',

  // text
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textFaint: 'var(--text-faint)',

  // primary (accent)
  primary: 'var(--primary)',
  primaryHover: 'var(--primary-hover)',
  primaryWeak: 'var(--primary-weak)',
  primaryWeak2: 'var(--primary-weak-2)',
  onPrimary: 'var(--on-primary)',

  // status
  paid: 'var(--paid)',
  paidWeak: 'var(--paid-weak)',
  pending: 'var(--pending)',
  pendingWeak: 'var(--pending-weak)',
  overdue: 'var(--overdue)',
  overdueWeak: 'var(--overdue-weak)',

  // shadows
  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  shadowLg: 'var(--shadow-lg)',
  shadowPrimary: 'var(--shadow-primary)',

  // radius
  radius: 'var(--radius)',
} as const
