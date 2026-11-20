import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segmented } from './Segmented'
import { ListGroup, SectionHeader } from './ListGroup'
import { ListRow, NavRow, RowText } from './ListRow'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'
import { PreferencesProvider } from '../../contexts/PreferencesContext'
import { axeViolations } from '../../test/axe'

/** Component library (improvement 31): each piece by its role, as a screen reader sees it. */

function Seg() {
  const [v, setV] = useState<'a' | 'b' | 'c'>('a')
  return <Segmented label="Período" value={v} onChange={setV} options={[{ value: 'a', label: 'Dia' }, { value: 'b', label: 'Semana' }, { value: 'c', label: 'Mês' }]} />
}

describe('Segmented', () => {
  it('is a radio group: one checked, only it in the Tab order; arrows, Home and End choose', async () => {
    const user = userEvent.setup()
    render(<Seg />)
    const group = screen.getByRole('radiogroup', { name: 'Período' })
    expect(group).toBeInTheDocument()
    const [dia, semana, mes] = screen.getAllByRole('radio')
    expect(dia).toHaveAttribute('aria-checked', 'true')
    expect([dia.tabIndex, semana.tabIndex, mes.tabIndex]).toEqual([0, -1, -1])

    await user.tab()
    expect(dia).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(semana).toHaveAttribute('aria-checked', 'true')
    expect(semana).toHaveFocus()
    await user.keyboard('{End}')
    expect(mes).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(dia).toHaveAttribute('aria-checked', 'true')
    await user.click(semana)
    expect(semana).toHaveAttribute('aria-checked', 'true')
  })
})

describe('ListGroup / ListRow / NavRow', () => {
  it('a list of rows, each one button named by its label', async () => {
    const user = userEvent.setup()
    const open = vi.fn()
    render(
      <ListGroup label="Pagamentos">
        <ListRow label="Comprovante: Maria, R$ 10,00" onClick={open}>
          <RowText title="Maria" sub="Notebook" />
        </ListRow>
        <ListRow label="2 pagas. Mostrar" onClick={() => {}} expanded={false}>x</ListRow>
        <NavRow icon="calc" title="Calculadora" onClick={() => {}} />
      </ListGroup>,
    )
    const list = screen.getByRole('list', { name: 'Pagamentos' })
    expect(list.querySelectorAll('li')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Comprovante: Maria, R$ 10,00' }))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '2 pagas. Mostrar' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Calculadora' })).toBeInTheDocument()
    // The visible texts are not read twice.
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })
})

describe('SectionHeader', () => {
  it('a real heading, with the count', () => {
    render(
      <>
        <SectionHeader count={3} color="red">Em atraso</SectionHeader>
        <SectionHeader variant="plain" as="h3">Mais</SectionHeader>
      </>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Em atraso · 3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Mais' })).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  beforeEach(() => localStorage.clear())

  it('one h1, "‹ Origem" named for where it goes, the action beside it', async () => {
    const user = userEvent.setup()
    const back = vi.fn()
    render(
      <PreferencesProvider>
        <PageHeader title="Recebimentos" sub="Últimos 6 meses" back={{ label: 'Configurações', onClick: back }} action={<button type="button">Exportar</button>} />
      </PreferencesProvider>,
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Últimos 6 meses')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar para Configurações' }))
    expect(back).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })

  it('"Enxuta" hides the subtitle unless it is essential (keepSub)', () => {
    localStorage.setItem('pague50_prefs', JSON.stringify({ detail: 'lean', textSize: 'm' }))
    render(
      <PreferencesProvider>
        <PageHeader title="Devedores" sub="3 pessoas" />
        <PageHeader title="Recebimentos" sub="Últimos 6 meses" keepSub />
      </PreferencesProvider>,
    )
    expect(screen.queryByText('3 pessoas')).not.toBeInTheDocument()
    expect(screen.getByText('Últimos 6 meses')).toBeInTheDocument()
  })
})

describe('axe on the library (improvement 43)', () => {
  it('the components together have no violations', async () => {
    render(
      <PreferencesProvider>
        <main>
          <PageHeader title="Recebimentos" sub="Últimos 6 meses" back={{ label: 'Configurações', onClick: () => {} }} action={<button type="button">Exportar</button>} />
          <Seg />
          <SectionHeader count={2}>Pagamentos</SectionHeader>
          <ListGroup label="Pagamentos">
            <ListRow label="Comprovante: Maria, R$ 10,00" onClick={() => {}}><RowText title="Maria" sub="Notebook" /></ListRow>
            <NavRow icon="calc" title="Calculadora" onClick={() => {}} />
          </ListGroup>
          <StatusBadge tone="paid" icon="check">Recebido</StatusBadge>
        </main>
      </PreferencesProvider>,
    )
    expect(await axeViolations()).toEqual([])
  })
})

describe('StatusBadge', () => {
  it('says the status in words (colour is only a hint)', () => {
    render(<StatusBadge tone="overdue" icon="alert">R$ 60,00 em atraso</StatusBadge>)
    const badge = screen.getByText('R$ 60,00 em atraso')
    expect(badge).toHaveAttribute('data-tone', 'overdue')
  })
})
