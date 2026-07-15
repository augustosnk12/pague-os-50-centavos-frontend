import { useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

// Preset avatar options (placeholder until real photo upload ships), mirroring the prototype.
const AVATAR_HUES = [235, 185, 150, 128, 75, 45, 20, 300]
const AVATAR_EMOJIS = ['😀', '😎', '🤝', '🦊', '🐱', '🐶', '🐼', '🦁', '🐧', '🌟', '🍀', '🌸', '🔥', '⚽', '🎸', '🚗', '💼', '🍕', '☕', '🏠']

interface AvatarPickerProps {
  name: string
  hue: number | null
  emoji: string | null
  onChange: (value: { hue: number; emoji: string | null }) => void
}

export function AvatarPicker({ name, hue, emoji, onChange }: AvatarPickerProps) {
  const [expanded, setExpanded] = useState(false)
  const effectiveHue = hue ?? AVATAR_HUES[0]

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 9 }}>Avatar</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <Avatar name={name} size={58} hue={effectiveHue} emoji={emoji} />
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600, lineHeight: 1.4 }}>
          {emoji ? 'Toque no emoji de novo para voltar às iniciais.' : 'Escolha uma cor e, se quiser, um emoji.'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px',
          borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, color: 'var(--text-muted)',
        }}
      >
        Personalizar cor e emoji
        <Icon name="chevronDown" size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
      </button>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {AVATAR_HUES.map((h) => {
              const active = h === effectiveHue
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange({ hue: h, emoji })}
                  aria-label={`Cor ${h}`}
                  style={{
                    width: 30, height: 30, borderRadius: '30%', cursor: 'pointer', flexShrink: 0,
                    background: `oklch(0.62 0.13 ${h})`,
                    border: active ? '2.5px solid var(--text)' : '2.5px solid transparent',
                    boxShadow: active ? '0 0 0 2px var(--surface) inset' : 'var(--shadow-sm)',
                    transition: 'border-color .15s, transform .15s',
                    transform: active ? 'scale(1.06)' : 'none',
                  }}
                />
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: 6 }}>
            {AVATAR_EMOJIS.map((e) => {
              const active = e === emoji
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onChange({ hue: effectiveHue, emoji: active ? null : e })}
                  style={{
                    aspectRatio: '1', display: 'grid', placeItems: 'center', fontSize: 19, cursor: 'pointer',
                    borderRadius: 10, minWidth: 0,
                    background: active ? 'var(--primary-weak)' : 'var(--surface-2)',
                    border: active ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                    transition: 'background .12s, border-color .12s', lineHeight: 1,
                  }}
                >
                  {e}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
