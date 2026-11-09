import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /**
   * Replaces the default title row. Receives the id that labels the dialog:
   * put it on the element holding the visible name (and include a close button).
   */
  head?: (titleId: string, close: () => void) => ReactNode
}

import { MODAL_EXIT_MS } from '../../lib/timing'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Open dialogs, top last. Everything else in <body> is made `inert` (no
 * clicks, focus or screen-reader access) while a dialog is open; nested
 * dialogs make the ones below them inert too.
 */
const stack: HTMLElement[] = []
const INERT_MARK = 'data-lt-inert'

function syncInert() {
  const top = stack[stack.length - 1]
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement)) continue
    // Live regions (toasts) must stay audible above dialogs.
    if (el.hasAttribute('data-modal-keep')) continue
    if (top && el !== top) {
      if (!el.hasAttribute('inert')) {
        el.setAttribute('inert', '')
        el.setAttribute(INERT_MARK, '')
      }
    } else if (el.hasAttribute(INERT_MARK)) {
      el.removeAttribute('inert')
      el.removeAttribute(INERT_MARK)
    }
  }
}

const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert]'))

/**
 * Accessible dialog / bottom sheet (improvements 20 and 43):
 * role="dialog" + aria-modal, labelled by its title; focus moves inside,
 * Tab/Shift+Tab stay inside, Esc and a click outside close it, and focus
 * returns to the element that opened it. Background is inert. Enters by
 * translating (never from opacity 0) and leaves with a short animation.
 */
export function Modal({ open, onClose, title, children, footer, head }: ModalProps) {
  const titleId = useId()
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [host] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')))
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const pressedOnScrim = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Mount on open; on close keep it for the exit animation, then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    const t = setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, MODAL_EXIT_MS)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Portal host, inert background, scroll lock and focus handling.
  useEffect(() => {
    if (!mounted || !host) return
    document.body.appendChild(host)
    stack.push(host)
    syncInert()
    returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow

    // Esc closes the TOP dialog wherever the focus is (it moves inside one frame
    // after opening; an early Esc used to be lost on slow devices).
    const onEsc = (e: globalThis.KeyboardEvent) => {
      // defaultPrevented: an inner popover (calendar) already used this Esc.
      if (e.key !== 'Escape' || e.defaultPrevented || stack[stack.length - 1] !== host) return
      e.preventDefault()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'

    // Initial focus: keep an element that already took it (e.g. an autofocused
    // field), otherwise the first field/control of the content, otherwise the dialog.
    requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog || dialog.contains(document.activeElement)) return
      const content = dialog.querySelector<HTMLElement>('[data-modal-content]')
      const first = (content && focusables(content)[0]) ?? focusables(dialog)[0]
      ;(first ?? dialog).focus()
    })

    return () => {
      document.removeEventListener('keydown', onEsc)
      stack.splice(stack.indexOf(host), 1)
      syncInert()
      host.remove()
      document.body.style.overflow = stack.length ? 'hidden' : previousOverflow
      const target = returnFocusTo.current
      if (target && document.contains(target)) target.focus()
    }
  }, [mounted, host])

  if (!mounted || !host) return null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = focusables(dialogRef.current)
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    // Backdrop click = mouse shortcut for closing; the keyboard equivalent is Esc (handled on the dialog).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="lt-sheet-wrap"
      data-closing={closing || undefined}
      onMouseDown={(e) => {
        pressedOnScrim.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // Only a press that started AND ended on the backdrop closes (not a text selection drag).
        if (e.target === e.currentTarget && pressedOnScrim.current) onCloseRef.current()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'oklch(0.2 0.03 var(--accent-h) / 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Esc and the Tab trap belong to the dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="lt-sheet"
        style={{
          background: 'var(--surface)',
          width: '100%',
          maxWidth: 460,
          borderRadius: 'calc(var(--radius) * 1.2) calc(var(--radius) * 1.2) 0 0',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        {head ? (
          head(titleId, () => onCloseRef.current())
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 12px' }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h2>
            <IconButton name="x" onClick={() => onCloseRef.current()} label="Fechar" />
          </div>
        )}
        <div data-modal-content style={{ padding: '0 18px 18px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    host,
  )
}
