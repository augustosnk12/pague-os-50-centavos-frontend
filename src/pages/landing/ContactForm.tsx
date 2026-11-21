import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { contactApi } from '../../api/contact.api'
import { getApiError } from '../../lib/api'

const MIN = 10
const MAX = 2000
/** The server drops messages sent less than 3 s after the form token (bots); keep a margin. */
const TOKEN_MIN_AGE_MS = 3_500
const RELOAD = 'Recarregue a página e tente de novo.'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * "Fale comigo": a contact form instead of showing the developer's e-mail.
 * The API e-mails the message (address only on the server) with Reply-To set
 * to the sender. Errors stay next to their field; nothing is lost on failure.
 */
export function ContactForm() {
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  // Honeypot: hidden from people and screen readers; bots tend to fill it.
  const [website, setWebsite] = useState('')
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [failure, setFailure] = useState('')
  // Form token from the API (anti-bot timing), fetched when the form shows up.
  const tokenRef = useRef<{ value: string; at: number } | null>(null)
  const getToken = async () => {
    const { data } = await contactApi.token()
    tokenRef.current = { value: data.token, at: Date.now() }
    return tokenRef.current
  }
  useEffect(() => {
    getToken().catch(() => {}) // retried on submit
  }, [])

  const emailErr = !email.trim() ? 'Informe seu e-mail para eu poder responder.' : !EMAIL_RE.test(email.trim()) ? 'Confira o e-mail: parece incompleto.' : ''
  const msgLen = message.trim().length
  const messageErr = msgLen < MIN ? `Escreva pelo menos ${MIN} caracteres.` : msgLen > MAX ? `Máximo de ${MAX} caracteres.` : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (emailErr || messageErr || status === 'sending') {
      document.getElementById(emailErr ? `${id}-email` : `${id}-msg`)?.focus()
      return
    }
    setStatus('sending')
    setFailure('')
    const body = { name: name.trim() || undefined, email: email.trim(), message: message.trim(), website }
    // A person never loses a message to the anti-bot timing: wait what is left of the 3 s.
    const send = async () => {
      const t = tokenRef.current ?? (await getToken())
      await wait(Math.max(0, TOKEN_MIN_AGE_MS - (Date.now() - t.at)))
      await contactApi.send({ ...body, token: t.value })
    }
    try {
      try {
        await send()
      } catch (err) {
        // Expired token (page open for hours): get a fresh one and try once more.
        if (getApiError(err) !== RELOAD) throw err
        tokenRef.current = null
        await send()
      }
      setStatus('sent')
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      setFailure(
        status === 429
          ? 'Muitas mensagens em pouco tempo. Tente de novo mais tarde.'
          : status === 400
            ? getApiError(err) || 'Confira os campos e tente de novo.'
            : 'Não foi possível enviar agora. Sua mensagem continua aqui; tente de novo em instantes.',
      )
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="lp-form lp-form-done" role="status">
        <span className="lp-ic" aria-hidden="true"><Icon name="check" size={20} /></span>
        <div>
          <h3>Mensagem enviada!</h3>
          <p>Obrigado por escrever. Vou responder assim que puder.</p>
          <button
            type="button"
            className="lp-link-btn"
            onClick={() => {
              setMessage('')
              setTried(false)
              setStatus('idle')
            }}
          >
            Enviar outra mensagem
          </button>
        </div>
      </div>
    )
  }

  const show = (err: string) => (tried ? err : '')
  return (
    <form className="lp-form" onSubmit={submit} noValidate aria-describedby={`${id}-note`}>
      <div className="lp-form-row">
        <label className="lp-field">
          <span>Nome <span className="lp-opt">(opcional)</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        </label>
        <div className="lp-field">
          <label htmlFor={`${id}-email`}>Seu e-mail</label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            aria-invalid={!!show(emailErr) || undefined}
            aria-describedby={show(emailErr) ? `${id}-email-err` : undefined}
          />
          {show(emailErr) && <span className="lp-err" id={`${id}-email-err`}>{emailErr}</span>}
        </div>
      </div>
      <div className="lp-field">
        <label htmlFor={`${id}-msg`}>Mensagem</label>
        <textarea
          id={`${id}-msg`}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX + 200}
          aria-invalid={!!show(messageErr) || undefined}
          aria-describedby={`${id}-count${show(messageErr) ? ` ${id}-msg-err` : ''}`}
        />
        <div className="lp-field-foot">
          {show(messageErr) ? <span className="lp-err" id={`${id}-msg-err`}>{messageErr}</span> : <span />}
          <span className="lp-count" id={`${id}-count`} data-over={msgLen > MAX || undefined}>{msgLen}/{MAX}</span>
        </div>
      </div>
      {/* Honeypot (bots only): off screen, out of the tab order and of the accessibility tree. */}
      <div className="lp-hp" aria-hidden="true">
        <label>
          Site
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
        </label>
      </div>
      {status === 'error' && (
        <p className="lp-err lp-form-err" role="alert"><Icon name="alert" size={16} /> {failure}</p>
      )}
      <div className="lp-form-foot">
        <p className="lp-fine" id={`${id}-note`} style={{ margin: 0 }}>Seu e-mail só é usado para eu te responder.</p>
        <button type="submit" className="lp-btn" data-v="primary" disabled={status === 'sending'}>
          <Icon name="send" size={16} /> {status === 'sending' ? 'Enviando…' : 'Enviar mensagem'}
        </button>
      </div>
    </form>
  )
}
