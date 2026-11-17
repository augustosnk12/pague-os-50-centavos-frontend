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
      <span className="lt-set-ic" aria-hidden="true"><Icon name={icon} size={18} /></span>
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
        <Icon name="chevronDown" size={14} />
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
      <h1 className="lt-h1">Configurações</h1>
      <p className="lt-sub">As alterações são salvas automaticamente.</p>

      {lender && (
        <div className="lt-set-card lt-set-me">
          <Avatar name={lender.name ?? lender.email} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="lt-set-t lt-ellipsis">{lender.name ?? '—'}</div>
            <div className="lt-set-s lt-ellipsis">{lender.email}</div>
          </div>
        </div>
      )}

      <h2 className="lt-set-h">Vencimento padrão</h2>
      {settings.isError && !s ? (
        <ErrorState onRetry={() => void settings.refetch()} retrying={settings.isFetching} />
      ) : !s ? (
        <div className="lt-skel" style={{ height: 130, borderRadius: 16 }} aria-busy="true" />
      ) : (
        <>
          <div className="lt-set-card">
            <DueDayRow icon="card" label="Cartão de crédito" value={s.defaultCardDueDay} today={today} onChange={(d) => save({ defaultCardDueDay: d }, 'o dia do cartão')} />
            <DueDayRow icon="layers" label="Pix parcelado" value={s.defaultPixInstallmentDueDay} today={today} onChange={(d) => save({ defaultPixInstallmentDueDay: d }, 'o dia do Pix parcelado')} />
          </div>
          <p className="lt-set-note">Preenche o primeiro vencimento ao criar uma dívida desse tipo. Dá para mudar a data em cada dívida. Dias 29 a 31 usam o último dia nos meses mais curtos.</p>

          <h2 className="lt-set-h">Receber por Pix</h2>
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
        </>
      )}

      <h2 className="lt-set-h">Nível de detalhe</h2>
      <div className="lt-set-card lt-set-pad">
        <div className="lt-seg" role="group" aria-label="Nível de detalhe">
          {([['full', 'Detalhada'], ['lean', 'Enxuta']] as [DetailLevel, string][]).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={detail === id} onClick={() => detail !== id && (setDetail(id), saved())}>{label}</button>
          ))}
        </div>
        <p className="lt-set-note" style={{ margin: '10px 2px 0' }}>
          {detail === 'lean' ? 'Enxuta: esconde subtítulos, barras, subtotais, contadores e descrições nas listas.' : 'Detalhada: mostra todas as informações de apoio.'} Valores devidos, atrasos, datas e ações aparecem sempre.
        </p>
      </div>

      <h2 className="lt-set-h">Aparência</h2>
      <div className="lt-set-card">
        <div className="lt-set-row">
          <div className="lt-set-main"><div className="lt-set-t" id="theme-l">Tema</div></div>
          <div className="lt-seg lt-seg-mini" role="group" aria-labelledby="theme-l">
            {([['light', 'Claro'], ['dark', 'Escuro']] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={theme === id} onClick={() => theme !== id && (toggleTheme(), saved())}>{label}</button>
            ))}
          </div>
        </div>
        <div className="lt-set-row">
          <div className="lt-set-main">
            <div className="lt-set-t" id="fz-l">Tamanho do texto</div>
            <div className="lt-set-s">{SIZES.find((x) => x.id === textSize)?.label}</div>
          </div>
          <div className="lt-seg lt-seg-mini" role="radiogroup" aria-labelledby="fz-l">
            {SIZES.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={textSize === x.id} aria-label={x.label} onClick={() => textSize !== x.id && (setTextSize(x.id), saved())}>
                <span aria-hidden="true" style={{ fontSize: x.px, fontWeight: 800 }}>Aa</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="lt-set-h">Mais</h2>
      <ul className="lt-lgroup">
        {supportPix() && (
          <li className="lt-lrow">
            <div className="lt-lrow-in">
              <button type="button" className="lt-lrow-hit" onClick={() => setSupportOpen(true)} aria-label="Apoie o projeto: pague um café para quem desenvolve" />
              <span className="lt-set-ic lt-coffee-row-ic" aria-hidden="true"><Icon name="coffee" size={17} /></span>
              <div className="lt-lrow-main" aria-hidden="true">
                <div className="lt-lrow-name">Apoie o projeto</div>
                <div className="lt-lrow-sub">Pague um café para quem desenvolve</div>
              </div>
              <Icon name="chevronRight" size={16} />
            </div>
          </li>
        )}
        <li className="lt-lrow">
          <div className="lt-lrow-in">
            <button type="button" className="lt-lrow-hit" onClick={() => setCalcOpen(true)} aria-label="Calculadora" />
            <span className="lt-set-ic" aria-hidden="true"><Icon name="calc" size={17} /></span>
            <div className="lt-lrow-main" aria-hidden="true"><div className="lt-lrow-name">Calculadora</div></div>
            <Icon name="chevronRight" size={16} />
          </div>
        </li>
      </ul>

      <h2 className="lt-set-h">Seus dados</h2>
      <ul className="lt-lgroup">
        <li className="lt-lrow">
          <div className="lt-lrow-in">
            <button type="button" className="lt-lrow-hit" onClick={() => setDataOpen(true)} aria-label="Baixar meus dados" />
            <span className="lt-set-ic" aria-hidden="true"><Icon name="download" size={17} /></span>
            <div className="lt-lrow-main" aria-hidden="true">
              <div className="lt-lrow-name">Baixar meus dados</div>
              <div className="lt-lrow-sub">Cópia de devedores, dívidas e pagamentos</div>
            </div>
            <Icon name="chevronRight" size={16} />
          </div>
        </li>
        <li className="lt-lrow">
          <div className="lt-lrow-in">
            <button type="button" className="lt-lrow-hit" onClick={() => setDeleteOpen(true)} aria-label="Excluir conta" />
            <span className="lt-set-ic" data-danger aria-hidden="true"><Icon name="trash" size={17} /></span>
            <div className="lt-lrow-main" aria-hidden="true">
              <div className="lt-lrow-name" style={{ color: 'var(--overdue)' }}>Excluir conta</div>
              <div className="lt-lrow-sub">Apaga a conta e todos os dados</div>
            </div>
            <Icon name="chevronRight" size={16} />
          </div>
        </li>
      </ul>

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
