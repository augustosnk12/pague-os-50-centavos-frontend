import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { DateInput } from '../../components/ui/DateInput'
import { formatCents, parseCurrencyDigits } from '../../lib/currency'
import { localToday } from '../../lib/date'
import { useClientValue } from '../../hooks/useClientValue'
import { fmtBR, fmtMoney } from '../../lib/format'
import { addMonths } from '../../lib/newDebt'
import { calcInstallments, MAX_INSTALLMENTS, MAX_RATE, parseRate } from '../../lib/installmentCalc'
import { PUBLIC_PAGES } from '../../seo/site'
import { usePageMeta } from '../../seo/usePageMeta'
import { PublicFooter, PublicHeader } from './PublicShell'

const money = (cents: number) => fmtMoney(cents / 100)

/**
 * /calculadora-de-parcelas (issue #7): public, no sign-in. Same split as the
 * app's "Nova dívida" preview (lib/installmentCalc.ts), plus optional monthly
 * interest, and an invitation to create an account at the end.
 */
export function CalculatorPage() {
  usePageMeta(PUBLIC_PAGES.calculator)
  const id = useId()
  const [cents, setCents] = useState('120000')
  const [count, setCount] = useState('6')
  const [rate, setRate] = useState('')
  // Until the person picks a date: a month from today (the build's day in the
  // ready HTML, today's once React takes over).
  const [picked, setFirst] = useState<string | null>(null)
  const today = useClientValue(localToday, __BUILD_DAY__)
  const first = picked ?? addMonths(today, 1)

  const n = Number(count)
  const ratePct = parseRate(rate)
  const countErr = count && (!Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) ? `De 1 a ${MAX_INSTALLMENTS} parcelas.` : ''
  const rateErr = Number.isNaN(ratePct) || ratePct > MAX_RATE ? `Use um número de 0 a ${MAX_RATE}, como 2,5.` : ''
  const result = useMemo(
    () => (countErr || rateErr ? null : calcInstallments(Number(cents || 0), n, first, ratePct)),
    [cents, n, first, ratePct, countErr, rateErr],
  )
  const amounts = result ? [...new Set(result.rows.map((r) => r.cents))] : []

  return (
    <div className="lp">
      <PublicHeader />
      <main id="conteudo">
        <div className="lp-wrap lp-calc">
          <div className="lp-calc-intro">
            <span className="lp-eyebrow">Grátis e sem cadastro</span>
            <h1>Calculadora de parcelas</h1>
            <p className="lp-lede">
              Informe o valor, em quantas vezes e a data da primeira parcela. Veja na hora quanto fica cada parcela e quando cada uma vence. Tem juros? Coloque a taxa ao mês.
            </p>
          </div>

          <div className="lp-calc-grid">
            <form className="lp-form" aria-label="Dados do parcelamento" onSubmit={(e) => e.preventDefault()}>
              <div className="lp-field">
                <label htmlFor={`${id}-amount`}>Valor total</label>
                <div className="lp-money">
                  <span aria-hidden="true">R$</span>
                  <input
                    id={`${id}-amount`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatCents(cents)}
                    placeholder="0,00"
                    onChange={(e) => setCents(parseCurrencyDigits(e.target.value))}
                  />
                </div>
              </div>
              <div className="lp-form-row">
                <div className="lp-field">
                  <label htmlFor={`${id}-count`}>Número de parcelas</label>
                  <input
                    id={`${id}-count`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={count}
                    aria-invalid={!!countErr || undefined}
                    aria-describedby={countErr ? `${id}-count-err` : undefined}
                    onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  />
                  {countErr && <span id={`${id}-count-err`} className="lp-err">{countErr}</span>}
                </div>
                <div className="lp-field">
                  <label htmlFor={`${id}-rate`}>
                    Juros ao mês (%) <span className="lp-opt">· opcional</span>
                  </label>
                  <input
                    id={`${id}-rate`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={rate}
                    aria-invalid={!!rateErr || undefined}
                    aria-describedby={rateErr ? `${id}-rate-err` : undefined}
                    onChange={(e) => setRate(e.target.value.slice(0, 6))}
                  />
                  {rateErr && <span id={`${id}-rate-err`} className="lp-err">{rateErr}</span>}
                </div>
              </div>
              <DateInput label="Primeira parcela" value={first} onChange={setFirst} />
            </form>

            <section className="lp-calc-out" aria-labelledby={`${id}-res`} aria-live="polite">
              <h2 id={`${id}-res`} className="lp-sr">Resultado</h2>
              {result ? (
                <>
                  <div className="lp-calc-sum">
                    <small>{result.rows.length === 1 ? 'Parcela única' : `${result.rows.length} parcelas de`}</small>
                    <div className="big num">
                      {amounts.length === 1 ? money(amounts[0]) : `${money(Math.max(...amounts))}*`}
                    </div>
                    <div className="row num">
                      <span>Total <b>{money(result.totalCents)}</b></span>
                      {result.interestCents > 0 && <span>Juros <b>{money(result.interestCents)}</b></span>}
                    </div>
                  </div>
                  {amounts.length > 1 && (
                    <p className="lp-calc-note">* A primeira parcela fica com o centavo que sobra da divisão: {money(result.rows[0].cents)}.</p>
                  )}
                  <ol className="lp-calc-rows" aria-label="Parcelas e vencimentos">
                    {result.rows.map((r) => (
                      <li key={r.number} className="num">
                        <span className="n" aria-hidden="true">{r.number}</span>
                        <span className="d"><span className="lp-sr">Parcela {r.number}, vence em </span>{fmtBR(r.dueDate)}</span>
                        <b>{money(r.cents)}</b>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="lp-calc-empty"><Icon name="info" size={16} /> Preencha o valor, o número de parcelas e a data da primeira.</p>
              )}
            </section>
          </div>
        </div>

        <section className="lp-block lp-band" aria-labelledby="lp-cc">
          <div className="lp-wrap lp-calc-help">
            <h2 id="lp-cc">Como a conta é feita</h2>
            <div className="lp-trust">
              <div>
                <h3>Sem juros</h3>
                <p>O valor é dividido igualmente. Se a divisão não for exata, o centavo que sobra vai para a primeira parcela, e o total bate sempre.</p>
              </div>
              <div>
                <h3>Com juros</h3>
                <p>Usamos a tabela Price, a mesma das lojas e bancos: todas as parcelas têm o mesmo valor, já com os juros do mês.</p>
              </div>
              <div>
                <h3>Datas</h3>
                <p>Uma parcela por mês, no mesmo dia. Se a primeira cai no dia 31, nos meses mais curtos ela vence no último dia.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-wrap" aria-labelledby="lp-cfn" style={{ paddingBlock: '48px 24px' }}>
          <div className="lp-final">
            <div>
              <h2 id="lp-cfn">Emprestou? Acompanhe cada parcela.</h2>
              <p>Crie uma conta grátis: o app guarda essas parcelas, avisa quem atrasou e manda a cobrança pelo WhatsApp com Pix copia e cola.</p>
            </div>
            <Link className="lp-btn" data-size="lg" to="/register">Criar conta grátis</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
