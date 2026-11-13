/** 16×12 pixel pig (easter egg of improvement 59), facing right. */
const PIG = [
  '......DD..DD....',
  '.....DPPD.DPPD..',
  '....PPPPPPPPPP..',
  '..PPPPPPPPPPEPP.',
  '.PPPPPPPPPPPPPNN',
  'TPPPPPPPPPPPPPNn',
  '.PPPPPPPPPPPPPNN',
  '.PPPPPPPPPPPPPP.',
  '..PPPPPPPPPPPP..',
  '..DD.DD...DD.DD.',
  '..DD.DD...DD.DD.',
  '..kk.kk...kk.kk.',
]
const COLORS: Record<string, string> = { P: '#f6a9c4', D: '#e47ea4', E: '#2b1b2e', N: '#f28db4', n: '#a4466e', T: '#e47ea4', k: '#7a3a57' }

export function PixelPig({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 12" aria-hidden="true" shapeRendering="crispEdges" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {PIG.flatMap((row, y) =>
        [...row].map((c, x) => (COLORS[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[c]} /> : null)),
      )}
    </svg>
  )
}
