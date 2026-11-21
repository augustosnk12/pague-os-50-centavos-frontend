import { useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'
import { Icon } from '../../components/ui/Icon'
import { pixBlock, reminderText } from '../../lib/reminder'
import { brCode } from '../../lib/pix'
import { useTheme } from '../../contexts/ThemeContext'
import { ContactForm } from './ContactForm'
import { CountUp } from './CountUp'
import { useLandingMotion, useSeen } from './useLandingMotion'
import './landing.css'

/*
 * Landing (prototype/landing.html), adjusted to the app as it is today:
 * code or link by e-mail, the app's row tags and date format, the real
 * WhatsApp message (same functions as the app, with a valid Pix BR Code),
 * the newer features, real links to Criar conta / Entrar, the app's tokens
 * and self-hosted font (no Google Fonts).
 */

const av = (hue: number): CSSProperties => ({ ['--ah' as string]: hue })
/** Stagger for [data-reveal] items (CSS reads --d). */
const d = (i: number): CSSProperties => ({ ['--d' as string]: `${i * 90}ms` })

// The reminder exactly as the app writes it (lib/reminder.ts), with a valid Pix code.
const REMINDER =
  reminderText('Marcos', [{ id: 'm3', label: 'Moto (3/10)', dueDate: '2026-11-04', cents: 25_000, overdue: true }]) +
  pixBlock(brCode({ key: '+5511987654321', name: 'Maria Souza', city: 'Sao Paulo', amount: 250 }), 25_000)
const [REMINDER_TEXT, REMINDER_PIX] = (() => {
  const i = REMINDER.lastIndexOf('\n')
  return [REMINDER.slice(0, i), REMINDER.slice(i + 1)]
})()

/** The WhatsApp example: "digitando…" first, then the message pops in (once, when seen). */
function WaChat({ motion }: { motion: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useSeen(ref, motion)
  return (
    <div ref={ref} className="lp-wa" role="img" aria-label="Exemplo de lembrete no WhatsApp para Marcos, de R$ 250,00, com Pix copia e cola">
      <div className="lp-wa-top" aria-hidden="true"><span className="lp-av" style={av(25)}>MA</span><span>Marcos<small>{seen ? 'WhatsApp' : 'digitando…'}</small></span></div>
      {seen ? (
        <div className="lp-bubble num" data-pop={motion || undefined} aria-hidden="true">
          {REMINDER_TEXT}
          <code>{REMINDER_PIX}</code>
          <span className="time">09:41 ✓✓</span>
        </div>
      ) : (
        <div className="lp-typing" aria-hidden="true"><i /><i /><i /></div>
      )}
    </div>
  )
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li>
      <span aria-hidden="true"><Icon name="check" size={12} strokeWidth={3} /></span>
      <span>{children}</span>
    </li>
  )
}

/** The 50 centavos coin floating next to the phone (decoration). */
function Coin() {
  return (
    <svg className="lp-coin" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="lp-coinface" x1="160" y1="120" x2="352" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3ECFA" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="250" fill="#8B45E8" />
      <circle cx="256" cy="256" r="228" fill="url(#lp-coinface)" />
      <circle cx="256" cy="256" r="196" fill="none" stroke="#7A33DB" strokeOpacity="0.35" strokeWidth="9" strokeDasharray="2 16" strokeLinecap="round" />
      <text x="258" y="250" textAnchor="middle" dominantBaseline="central" fontFamily="Manrope, system-ui, sans-serif" fontWeight="800" fontSize="200" letterSpacing="-8" fill="#6A22CC">50</text>
      <text x="256" y="375" textAnchor="middle" fontFamily="Manrope, system-ui, sans-serif" fontWeight="800" fontSize="44" letterSpacing="6" fill="#7A33DB">CENTAVOS</text>
    </svg>
  )
}

const MORE: { icon: string; title: string; text: string }[] = [
  { icon: 'refresh', title: 'Mensalidades', text: 'Aluguel, academia, assinatura dividida: a cobrança de cada mês aparece sozinha, até a data que você escolher.' },
  { icon: 'layers', title: 'Pagou várias de uma vez?', text: 'Um valor só, e o app distribui da parcela mais antiga para a mais nova.' },
  { icon: 'receipt', title: 'Comprovante', text: 'Cada pagamento vira um recibo para mandar no WhatsApp ou como imagem.' },
  { icon: 'send', title: 'Extrato do devedor', text: 'Tudo o que a pessoa deve, numa mensagem ou imagem, com o Pix do que está atrasado.' },
  { icon: 'trend', title: 'Recebimentos', text: 'Quanto entrou em cada mês e a planilha do período para abrir no Excel.' },
  { icon: 'calc', title: 'Do seu jeito', text: 'Tema claro ou escuro, texto maior e um modo enxuto que mostra só o essencial.' },
]

export function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const root = useRef<HTMLDivElement>(null)
  const motion = useLandingMotion(root)
  return (
    <div className="lp" ref={root} data-motion={motion || undefined}>
      <header className="lp-wrap lp-top">
        <Link to="/" className="lp-brand" aria-label="Pague os 50 centavos, início">
          <Logo size={34} />
        </Link>
        <nav aria-label="Landing">
          <a className="lp-btn lp-hide-sm" data-v="ghost" href="#como-funciona">Como funciona</a>
          <a className="lp-btn lp-hide-sm" data-v="ghost" href="#duvidas">Dúvidas</a>
          {/* Same theme as the app (ThemeContext): the choice carries over after signing in. */}
          <button
            type="button"
            className="lp-btn lp-theme"
            data-v="ghost"
            aria-pressed={theme === 'dark'}
            aria-label="Tema escuro"
            title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>
          <Link className="lp-btn" data-v="outline" to="/login">Entrar</Link>
        </nav>
      </header>

      <main id="conteudo">
        <div className="lp-wrap lp-hero">
          <div>
            <span className="lp-eyebrow" data-reveal style={d(0)}>Controle de quem te deve</span>
            <h1 data-reveal style={d(1)}>
              <span className="q">Emprestou?</span> Anota.<br />
              <span className="q">Venceu?</span> Cobra.<br />
              Até os <span className="coin">50 centavos.</span>
            </h1>
            <p className="lp-lede" data-reveal style={d(2)}>
              Registre o que você emprestou, divida em parcelas e veja num só lugar quem pagou, quem está atrasado e quanto ainda falta receber no mês.
            </p>
            <div className="lp-cta" data-reveal style={d(3)}>
              <Link className="lp-btn" data-v="primary" data-size="lg" to="/register">Criar minha conta</Link>
              <a className="lp-btn" data-v="outline" data-size="lg" href="#como-funciona">Ver como funciona</a>
            </div>
            <p className="lp-fine" data-reveal style={d(4)}>Grátis e sem anúncios.</p>
          </div>

          <div className="lp-stage" role="img" aria-label="Exemplo da tela Painel do app: R$ 1.380,00 a receber em novembro, R$ 450,00 em atraso">
            <div className="lp-phone" aria-hidden="true">
              <div className="lp-screen">
                <div className="lp-s-head"><b>Olá, Maria 👋</b><span>ter, 10 nov</span></div>
                <div className="lp-s-hero">
                  <small>A receber em novembro</small>
                  <div className="big num"><CountUp value={1380} motion={motion} /></div>
                  <div className="lp-bar"><i /></div>
                  <div className="row num"><span><b>R$ 1.900,00</b> recebido de R$ 3.280,00</span><span>58%</span></div>
                  <span className="lp-late num"><Icon name="alert" size={12} /> R$ 450,00 em atraso</span>
                </div>
                <div className="lp-s-label">Em atraso · 2</div>
                <div className="lp-list">
                  <div className="lp-item">
                    <span className="lp-av" style={av(25)}>MA</span>
                    <span className="who"><b>Marcos</b><span>Moto · 3/10</span></span>
                    <span className="amt num">R$ 250,00<span className="lp-tag" data-t="late">6d atraso</span></span>
                  </div>
                  <div className="lp-item">
                    <span className="lp-av" style={av(200)}>JU</span>
                    <span className="who"><b>Juliana</b><span>Aluguel · ↻ mensal</span></span>
                    <span className="amt num">R$ 200,00<span className="lp-tag" data-t="late">2d atraso</span></span>
                  </div>
                </div>
                <div className="lp-s-label">Hoje · 1</div>
                <div className="lp-list">
                  <div className="lp-item">
                    <span className="lp-av" style={av(330)}>AN</span>
                    <span className="who"><b>Ana</b><span>Celular · 4/6</span></span>
                    <span className="amt num">R$ 200,00<span className="lp-tag" data-t="today">Vence hoje</span></span>
                  </div>
                </div>
                <div className="lp-tabs">
                  <span className="on">Painel</span><span>Devedores</span><span className="plus">+</span><span>Parcelas</span><span>Conta</span>
                </div>
              </div>
            </div>
            <Coin />
          </div>
        </div>

        <section className="lp-block lp-band" id="como-funciona" aria-labelledby="lp-cf">
          <div className="lp-wrap">
            <div className="lp-sec-head" data-reveal>
              <h2 id="lp-cf">Três passos, e o app faz as contas</h2>
              <p>Nada de planilha nem caderninho. Você informa o valor e o número de parcelas; as datas e os valores ficam prontos.</p>
            </div>
            <ol className="lp-steps">
              <li data-reveal style={d(0)}>
                <h3>Cadastre quem te deve</h3>
                <p>Só o nome já basta. Com o WhatsApp, você cobra com um toque.</p>
              </li>
              <li data-reveal style={d(1)}>
                <h3>Crie a dívida</h3>
                <p>R$ 1.200,00 em 6 vezes, todo dia 10. As parcelas aparecem sozinhas.</p>
                <div className="lp-split num" aria-hidden="true">
                  <span data-done style={d(0)}>10/08</span><span data-done style={d(1)}>10/09</span><span data-done style={d(2)}>10/10</span><span>10/11</span><span>10/12</span><span>10/01</span>
                </div>
                <p className="lp-split-cap num">6 × R$ 200,00 · 3 pagas</p>
              </li>
              <li data-reveal style={d(2)}>
                <h3>Registre o que recebeu</h3>
                <p>Recebeu tudo ou só uma parte? Registre com a data certa e o saldo se ajusta.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="lp-block" aria-labelledby="lp-rc">
          <div className="lp-wrap">
            <div className="lp-sec-head" data-reveal>
              <h2 id="lp-rc">Cobrar sem constrangimento</h2>
              <p>O app deixa a mensagem pronta. Você confere e aperta enviar.</p>
            </div>

            <div className="lp-feature">
              <div className="lp-copy" data-reveal>
                <h3>Lembrete no WhatsApp, com Pix copia e cola</h3>
                <p>Um toque monta uma mensagem educada com as parcelas em aberto, o total e, se você quiser, o código Pix com o valor exato.</p>
                <ul className="lp-checks">
                  <Check>Você revisa e edita o texto antes de enviar</Check>
                  <Check>O Pix já vem com o valor certo, sem ninguém digitar nada</Check>
                  <Check>Abre direto a conversa com a pessoa</Check>
                </ul>
              </div>
              <div data-reveal style={d(1)}><WaChat motion={motion} /></div>
            </div>

            <div className="lp-feature" data-flip>
              <div className="lp-copy" data-reveal>
                <h3>Atraso aparece sozinho</h3>
                <p>Passou da data e não foi pago, a parcela fica vermelha. Sem precisar lembrar de conferir nada.</p>
                <ul className="lp-checks">
                  <Check>Em atraso, hoje, próximos 7 dias e pagas</Check>
                  <Check>Pagamento parcial mostra quanto ainda falta</Check>
                  <Check>No topo do Painel, o total atrasado de todo mundo</Check>
                </ul>
              </div>
              <div className="lp-panel" data-reveal style={d(1)} role="img" aria-label="Exemplo de parcelas: uma em atraso, uma vencendo hoje e uma paga">
                <div className="lp-status" aria-hidden="true">
                  <div><span><b>Marcos · Moto 3/10</b><span className="meta num">venceu 04 nov</span></span><span className="r num">R$ 250,00<span className="lp-tag" data-t="late">6d atraso</span></span></div>
                  <div><span><b>Ana · Celular 4/6</b><span className="meta num">vence 10 nov</span></span><span className="r num">R$ 200,00<span className="lp-tag" data-t="today">Vence hoje</span></span></div>
                  <div><span><b>Pedro · Notebook 1/5</b><span className="meta num">pago 02 nov</span></span><span className="r num">R$ 640,00<span className="lp-tag" data-t="paid">✓ Paga</span></span></div>
                </div>
              </div>
            </div>

            <div className="lp-feature">
              <div className="lp-copy" data-reveal>
                <h3>O mês inteiro numa olhada</h3>
                <p>Veja o que entra em cada dia, quanto já caiu na conta e quanto falta. Troque de semana ou de mês e compare.</p>
                <ul className="lp-checks">
                  <Check>Parcelas agrupadas por dia de vencimento</Check>
                  <Check>Filtre por devedor</Check>
                  <Check>Funciona no celular e no computador</Check>
                </ul>
              </div>
              <div className="lp-panel" data-reveal style={d(1)} role="img" aria-label="Exemplo da tela Parcelas de novembro">
                <div aria-hidden="true">
                  <div className="lp-period-top"><b>Novembro de 2026</b><span className="num">R$ 1.900,00 de R$ 3.280,00</span></div>
                  <div className="lp-chips"><span data-on>Todas</span><span>Em aberto</span><span>Atrasadas</span><span>Pagas</span></div>
                  <div className="lp-day">
                    <h4 className="num"><span>ter, 10 nov</span><span>R$ 450,00</span></h4>
                    <div className="lp-list">
                      <div className="lp-item"><span className="lp-av" style={av(330)}>AN</span><span className="who"><b>Ana</b><span>Celular · 4/6</span></span><span className="amt num">R$ 200,00</span></div>
                      <div className="lp-item"><span className="lp-av" style={av(140)}>CA</span><span className="who"><b>Carla</b><span>Viagem · 2/3</span></span><span className="amt num">R$ 250,00</span></div>
                    </div>
                  </div>
                  <div className="lp-day">
                    <h4 className="num"><span>seg, 16 nov</span><span>R$ 180,00</span></h4>
                    <div className="lp-list">
                      <div className="lp-item"><span className="lp-av" style={av(60)}>TZ</span><span className="who"><b>Tio Zé</b><span>Geladeira · 5/8</span></span><span className="amt num">R$ 180,00</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-block lp-band" aria-labelledby="lp-mais">
          <div className="lp-wrap">
            <div className="lp-sec-head" data-reveal><h2 id="lp-mais">E mais um pouco</h2></div>
            <div className="lp-more">
              {MORE.map((m, i) => (
                <div key={m.title} data-reveal style={d(i % 3)}>
                  <span className="lp-ic" aria-hidden="true"><Icon name={m.icon} size={20} /></span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-block" aria-labelledby="lp-tr">
          <div className="lp-wrap">
            <div className="lp-sec-head" data-reveal><h2 id="lp-tr">Seus números ficam com você</h2></div>
            <div className="lp-trust">
              <div data-reveal style={d(0)}>
                <span className="lp-ic" aria-hidden="true"><Icon name="mail" size={20} /></span>
                <h3>Sem senha para vazar</h3>
                <p>Você entra com um código ou link do seu e-mail. Não há senha guardada em lugar nenhum.</p>
              </div>
              <div data-reveal style={d(1)}>
                <span className="lp-ic" aria-hidden="true"><Icon name="user" size={20} /></span>
                <h3>Devedor não precisa de conta</h3>
                <p>Só você usa o app. Quem te deve recebe apenas a mensagem que você decidir mandar.</p>
              </div>
              <div data-reveal style={d(2)}>
                <span className="lp-ic" aria-hidden="true"><Icon name="download" size={20} /></span>
                <h3>Sem anúncios, e os dados são seus</h3>
                <p>Nada de propaganda. Baixe tudo em planilha quando quiser, ou exclua a conta com os dados.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-block lp-band" id="duvidas" aria-labelledby="lp-fq">
          <div className="lp-wrap">
            <div className="lp-sec-head" data-reveal><h2 id="lp-fq">Dúvidas</h2></div>
            <div className="lp-faq">
              <details open data-reveal style={d(0)}>
                <summary>A pessoa que me deve precisa instalar algo?</summary>
                <p>Não. Só você usa o app. O devedor recebe, se você quiser, uma mensagem normal de WhatsApp com o valor e o Pix.</p>
              </details>
              <details data-reveal style={d(1)}>
                <summary>O app faz cobrança automática ou mexe no meu banco?</summary>
                <p>Não. Ele não se conecta a banco nenhum e não envia nada sozinho. É um controle: você registra o que recebeu e decide quando lembrar alguém.</p>
              </details>
              <details data-reveal style={d(2)}>
                <summary>E se a pessoa pagar só uma parte?</summary>
                <p>Registre o valor recebido. A parcela fica como parcial e o app mostra quanto ainda falta. Se pagou várias de uma vez, registre tudo junto.</p>
              </details>
              <details data-reveal style={d(3)}>
                <summary>Quanto custa?</summary>
                <p>Nada. O app é gratuito e sem anúncios. Se ele te ajudar, dá para apoiar o projeto com um café, pelo próprio app.</p>
              </details>
              <details data-reveal style={d(4)}>
                <summary>Funciona no celular?</summary>
                <p>Sim. O app foi pensado primeiro para o celular, e no computador ganha uma navegação no topo e atalhos de teclado.</p>
              </details>
            </div>

          </div>
        </section>

        <section className="lp-block" id="contato" aria-labelledby="lp-ct">
          <div className="lp-wrap lp-contact">
            <div className="lp-sec-head" data-reveal>
              <h2 id="lp-ct">Fale comigo</h2>
              <p>Ficou com outra dúvida, achou um problema ou tem uma sugestão? Escreva aqui: a mensagem chega direto para quem faz o app.</p>
            </div>
            <div data-reveal style={d(1)}><ContactForm /></div>
          </div>
        </section>

        <section className="lp-wrap" aria-labelledby="lp-fn" style={{ paddingBlock: '24px 24px' }}>
          <div className="lp-final" data-reveal="pop">
            <div>
              <h2 id="lp-fn">Quem te deve, quanto e quando.</h2>
              <p>Comece agora. O primeiro devedor leva menos de um minuto.</p>
            </div>
            <Link className="lp-btn" data-size="lg" to="/register">Criar minha conta</Link>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>Pague os 50 centavos · 2026</span>
          <a className="lp-foot-link" href="#contato">Contato</a>
          <span>Feito no Brasil, em reais.</span>
        </div>
      </footer>
    </div>
  )
}
