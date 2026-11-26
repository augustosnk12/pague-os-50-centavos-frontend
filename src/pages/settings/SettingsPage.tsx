import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { ErrorState } from '../../components/ui/ErrorState'
import { Calculator } from '../../components/shared/Calculator'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { usePreferences, type DetailLevel, type TextSize } from '../../contexts/PreferencesContext'
import { useToast } from '../../contexts/ToastContext'
import { useSettings } from '../../hooks/settings/useSettings'
import { useUpdateSettings } from '../../hooks/settings/useUpdateSettings'
import type { LenderSettings, PixKeyType } from '../../api/settings.api'
import { localToday } from '../../lib/date'
import { fmtTitle } from '../../lib/format'
import { nextDayOf } from '../../lib/newDebt'
import { checkPixKey, maskPixKey, PIX_CHECK_TEXT, PIX_TYPES } from '../../lib/pixKey'
import { failedSave } from '../../lib/saveError'
import { DataSheet, DeleteAccountSheet } from './DataSheets'
import { SupportSheet } from '../../components/shared/SupportSheet'
import { supportPix } from '../../lib/support'
import { preloadRoute } from '../../router/routes'
import { PageHeader } from '../../components/ui/PageHeader'
import { ListGroup, SectionHeader } from '../../components/ui/ListGroup'
import { NavRow } from '../../components/ui/ListRow'
import { Segmented } from '../../components/ui/Segmented'
import { PlanSection } from './PlanSection'
import { ChargeMessageSection } from './ChargeMessageSection'
import { usePlan } from '../../hooks/plan/usePlan'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const SIZES: { id: TextSize; label: string; px: number }[] = [
  { id: 'm', label: 'Normal', px: 13 },
  { id: 'l', label: 'Grande', px: 15 },
  { id: 'xl', label: 'Gigante', px: 17 },
]

/** One "Vencimento padrão" row: the day (or none) and the next date it gives. */
function DueDayRow({ icon, label, value, today, onChange }: { icon: string; label: string; value: number | null; today: string; onChange: (d: number | null) => void }) {
  const next = value ? nextDayOf(value, today) : null
  return (
    <div className="lt-set-row">
      <span className="lt-set-ic" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div className="lt-set-main">
        <div className="lt-set-t">{label}</div>
        <div className="lt-set-s">{next ? `Próximo: ${fmtTitle(next)}` : 'Sem padrão · usa o dia 1 do mês seguinte'}</div>
      </div>
      <label className="lt-day-select">
        <span className="lt-sr-only">Dia padrão para {label}</span>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Sem padrão</option>
          {DAYS.map((d) => <option key={d} value={d}>Dia {d}</option>)}
        </select>
        <Icon name="chevronDown" size={16} />
      </label>
    </div>
  )
}

/** "Receber por Pix": type → mask and keyboard; live check; saves on leaving the field, only when valid. */
function PixKeyField({ settings, onSave, onClear }: { settings: LenderSettings; onSave: (type: PixKeyType, key: string) => void; onClear: () => void }) {
  const [type, setType] = useState<PixKeyType>(settings.pixKeyType ?? 'CPF')
  const [value, setValue] = useState(settings.pixKey ? maskPixKey(settings.pixKeyType ?? 'CPF', settings.pixKey) : '')
  // The API answered with another key (saved, cleared, undone): show it.
  const [seen, setSeen] = useState(settings.pixKey)
  if (settings.pixKey !== seen) {
    setSeen(settings.pixKey)
    if (settings.pixKeyType) setType(settings.pixKeyType)
    setValue(settings.pixKey ? maskPixKey(settings.pixKeyType ?? type, settings.pixKey) : '')
  }
  const t = PIX_TYPES.find((x) => x.id === type)!
  const check = checkPixKey(type, value)
  const tone = check === 'valid' ? 'ok' : check === 'empty' ? undefined : 'warn'

  return (
    <div className="lt-set-card lt-set-pad">
      <div className="lt-set-t" id="pix-type-l" style={{ marginBottom: 8 }}>Tipo de chave</div>
      <div className="lt-set-chips" role="group" aria-labelledby="pix-type-l">
        {PIX_TYPES.map((x) => (
          <button
            key={x.id}
            type="button"
            className="lt-chip"
            aria-pressed={type === x.id}
            onClick={() => {
              if (x.id === type) return
              setType(x.id)
              setValue('')
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      <label className="lt-set-t" htmlFor="set-pix" style={{ display: 'block', margin: '12px 0 6px' }}>Chave {t.label}</label>
      <div className="lt-pix-field" data-tone={tone}>
        <input
          id="set-pix"
          value={value}
          onChange={(e) => setValue(maskPixKey(type, e.target.value))}
          onBlur={() => {
            if (check !== 'valid') return
            if (settings.pixKey && settings.pixKeyType === type && maskPixKey(type, settings.pixKey) === value) return
            onSave(type, value)
          }}
          placeholder={t.placeholder}
          inputMode={t.inputMode}
          maxLength={t.max}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="pix-check pix-help"
        />
        {value && (
          <button
            type="button"
            className="lt-field-clear"
            // Keep the focus in the field (no blur-save) when clearing.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setValue('')
              if (settings.pixKey) onClear()
            }}
            aria-label="Limpar chave Pix"
          >
            Limpar
          </button>
        )}
      </div>
      <div id="pix-check" className="lt-pix-check" data-tone={tone} aria-live="polite">{PIX_CHECK_TEXT[check]}</div>
      <p id="pix-help" className="lt-set-note">Usada para incluir o “Pix copia e cola” com o valor exato nas cobranças pelo WhatsApp. Salva ao sair do campo.</p>
    </div>
  )
}

/**
 * Configurações (S11, improvements 26, 23, 33, 32 and 50): the "Conta" tab.
 * Everything saves as you choose ("Salvo"); text fields when you leave them.
 */
export function SettingsPage() {
  const today = localToday()
  const navigate = useNavigate()
  const { lender, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { detail, setDetail, textSize, setTextSize } = usePreferences()
  const { showToast } = useToast()
  const settings = useSettings()
  const { data: plan } = usePlan()
  const update = useUpdateSettings()
  const [calcOpen, setCalcOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  const saved = () => showToast('Salvo', { icon: 'check' })
  const save = (data: Partial<LenderSettings>, what: string, after?: () => void) =>
    update.mutate(data, {
      onSuccess: () => (after ? after() : saved()),
      onError: failedSave(showToast, `salvar ${what}`, () => save(data, what, after)),
    })

  const s = settings.data

  return (
    <main className="lt-page lt-set">
      <PageHeader title="Configurações" sub="As alterações são salvas automaticamente." keepSub />

      {lender && (
        <div className="lt-set-card lt-set-me">
          <Avatar name={lender.name ?? lender.email} size={48} />
          <div style={{ minWidth: 0 }}>
            <div className="lt-set-t lt-ellipsis">{lender.name ?? '—'}</div>
            <div className="lt-set-s lt-ellipsis">{lender.email}</div>
          </div>
        </div>
      )}

      <PlanSection plan={plan} />

      {/* Recebimentos (S12, improvement 38): right under the account, as in the mock. */}
      <ListGroup style={{ marginTop: 10 }}>
        <NavRow
          icon="trend"
          title="Recebimentos"
          sub="Quanto entrou nos últimos meses"
          label="Recebimentos: relatório e exportação"
          onClick={() => navigate('/payments')}
          onPointerEnter={() => preloadRoute('/payments')}
        />
      </ListGroup>

      <SectionHeader variant="plain">Vencimento padrão</SectionHeader>
      {settings.isError && !s ? (
        <ErrorState onRetry={() => void settings.refetch()} retrying={settings.isFetching} />
      ) : !s ? (
        <div className="lt-skel" style={{ height: 130, borderRadius: 'var(--r-lg)' }} aria-busy="true" />
      ) : (
        <>
          <div className="lt-set-card">
            <DueDayRow icon="card" label="Cartão de crédito" value={s.defaultCardDueDay} today={today} onChange={(d) => save({ defaultCardDueDay: d }, 'o dia do cartão')} />
            <DueDayRow icon="layers" label="Pix parcelado" value={s.defaultPixInstallmentDueDay} today={today} onChange={(d) => save({ defaultPixInstallmentDueDay: d }, 'o dia do Pix parcelado')} />
          </div>
          <p className="lt-set-note">Preenche o primeiro vencimento ao criar uma dívida desse tipo. Dá para mudar a data em cada dívida. Dias 29 a 31 usam o último dia nos meses mais curtos.</p>

          <SectionHeader variant="plain">Receber por Pix</SectionHeader>
          <PixKeyField
            settings={s}
            onSave={(type, key) => save({ pixKeyType: type, pixKey: key }, 'a chave Pix', () => showToast('Chave Pix salva', { icon: 'check' }))}
            onClear={() => {
              const before = { pixKeyType: s.pixKeyType, pixKey: s.pixKey }
              save({ pixKeyType: null, pixKey: null }, 'a chave Pix', () =>
                showToast('Chave Pix removida', { icon: 'trash', action: { label: 'Desfazer', onClick: () => save(before, 'a chave Pix') } }),
              )
            }}
          />

          {/* Item 68 (API R7): hidden on an older API, which has no chargeTone. */}
          {'chargeTone' in s && <ChargeMessageSection settings={s} save={(data, what) => save(data, what)} />}
        </>
      )}

      <SectionHeader variant="plain">Nível de detalhe</SectionHeader>
      <div className="lt-set-card lt-set-pad">
        <Segmented<DetailLevel>
          label="Nível de detalhe"
          value={detail}
          options={[{ value: 'full', label: 'Detalhada' }, { value: 'lean', label: 'Enxuta' }]}
          onChange={(id) => {
            setDetail(id)
            saved()
          }}
        />
        <p className="lt-set-note" style={{ margin: '10px 2px 0' }}>
          {detail === 'lean' ? 'Enxuta: esconde subtítulos, barras, subtotais, contadores e descrições nas listas.' : 'Detalhada: mostra todas as informações de apoio.'} Valores devidos, atrasos, datas e ações aparecem sempre.
        </p>
      </div>

      <SectionHeader variant="plain">Aparência</SectionHeader>
      <div className="lt-set-card">
        <div className="lt-set-row">
          <div className="lt-set-main"><div className="lt-set-t" id="theme-l">Tema</div></div>
          <Segmented
            mini
            labelledBy="theme-l"
            value={theme}
            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
            onChange={() => {
              toggleTheme()
              saved()
            }}
          />
        </div>
        <div className="lt-set-row">
          <div className="lt-set-main">
            <div className="lt-set-t" id="fz-l">Tamanho do texto</div>
            <div className="lt-set-s">{SIZES.find((x) => x.id === textSize)?.label}</div>
          </div>
          <Segmented<TextSize>
            mini
            labelledBy="fz-l"
            value={textSize}
            options={SIZES.map((x) => ({ value: x.id, ariaLabel: x.label, label: <span aria-hidden="true" style={{ fontSize: x.px, fontWeight: 800 }}>Aa</span> }))}
            onChange={(id) => {
              setTextSize(id)
              saved()
            }}
          />
        </div>
      </div>

      <SectionHeader variant="plain">Mais</SectionHeader>
      <ListGroup>
        {supportPix() && (
          <NavRow
            icon="coffee"
            iconClassName="lt-coffee-row-ic"
            title="Apoie o projeto"
            sub="Pague um café para quem desenvolve"
            label="Apoie o projeto: pague um café para quem desenvolve"
            onClick={() => setSupportOpen(true)}
          />
        )}
        <NavRow icon="calc" title="Calculadora" onClick={() => setCalcOpen(true)} />
        {/* Melhoria 63: só para o e-mail de ADMIN_EMAIL (a API barra os outros com 404). */}
        {plan?.isAdmin && (
          <NavRow icon="shield" title="Administração" sub="Planos e limites das contas · só para você" onClick={() => navigate('/admin')} onPointerEnter={() => preloadRoute('/admin')} />
        )}
      </ListGroup>

      <SectionHeader variant="plain">Seus dados</SectionHeader>
      <ListGroup>
        <NavRow icon="download" title="Baixar meus dados" sub="Cópia de devedores, dívidas e pagamentos" onClick={() => setDataOpen(true)} />
        <NavRow icon="trash" title="Excluir conta" sub="Apaga a conta e todos os dados" danger onClick={() => setDeleteOpen(true)} />
      </ListGroup>

      <button type="button" className="lt-set-logout" onClick={logout}>Sair da conta</button>
      <p className="lt-set-ver">Pague os 50 centavos · versão {__APP_VERSION__}</p>

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Calculadora">
        <Calculator />
      </Modal>
      <DataSheet open={dataOpen} onClose={() => setDataOpen(false)} />
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      <DeleteAccountSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDownloadFirst={() => {
          setDeleteOpen(false)
          setDataOpen(true)
        }}
        onDeleted={() => {
          logout()
          navigate('/login?excluida=1', { replace: true })
        }}
      />
    </main>
  )
}
