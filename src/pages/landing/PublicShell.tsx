import { Link } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'
import { Icon } from '../../components/ui/Icon'
import { useTheme } from '../../contexts/ThemeContext'
import { PUBLIC_PAGES } from '../../seo/site'
import './landing.css'

/**
 * Top bar and footer of the public pages (landing, calculadora, 404).
 * `home`: on the landing itself the section links are plain anchors; on the
 * other pages they open the landing at that section.
 */
export function PublicHeader({ home = false }: { home?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const at = (hash: string) => (home ? hash : `/${hash}`)
  return (
    <header className="lp-wrap lp-top">
      <Link to="/" className="lp-brand" aria-label="Pague os 50 centavos, início">
        <Logo size={34} />
      </Link>
      <nav aria-label="Site">
        <a className="lp-btn lp-hide-sm" data-v="ghost" href={at('#como-funciona')}>Como funciona</a>
        <Link className="lp-btn lp-hide-sm" data-v="ghost" to={PUBLIC_PAGES.calculator.path}>Calculadora</Link>
        <a className="lp-btn lp-hide-sm" data-v="ghost" href={at('#duvidas')}>Dúvidas</a>
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
  )
}

export function PublicFooter({ home = false }: { home?: boolean }) {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap">
        <span>Pague os 50 centavos · 2026</span>
        <Link className="lp-foot-link" to={PUBLIC_PAGES.calculator.path}>Calculadora de parcelas</Link>
        <a className="lp-foot-link" href={home ? '#contato' : '/#contato'}>Contato</a>
        <span>Feito no Brasil, em reais.</span>
      </div>
    </footer>
  )
}
