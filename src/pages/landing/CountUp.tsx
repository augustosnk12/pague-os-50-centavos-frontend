import { useEffect, useState } from 'react'
import { fmtMoney } from '../../lib/format'

/** An amount that counts up to its value once (the hero of the phone). */
export function CountUp({ value, motion, ms = 1400 }: { value: number; motion: boolean; ms?: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (!motion) return setShown(value)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(k < 1 ? Math.round(value * eased) : value)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    setShown(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [motion, value, ms])
  return <>{fmtMoney(shown)}</>
}
