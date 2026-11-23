import { Link } from 'react-router-dom'
import { getToken } from '../../lib/cookies'
import { PUBLIC_PAGES, SITE_NAME } from '../../seo/site'
import { usePageMeta } from '../../seo/usePageMeta'
import { PublicFooter, PublicHeader } from './PublicShell'

const META = { title: `Página não encontrada | ${SITE_NAME}`, description: 'Este endereço não existe.' }

/**
 * Unknown addresses (issue #7). The server answers them with 404 (404.html,
 * not a "soft 404" index.html with 200); this is what the page shows.
 */
export function NotFoundPage() {
  usePageMeta(META)
  const signedIn = !!getToken()
  return (
    <div className="lp">
      <PublicHeader />
      <main id="conteudo" className="lp-wrap lp-404">
        <span className="lp-eyebrow">Erro 404</span>
        <h1>Página não encontrada</h1>
        <p className="lp-lede">O endereço pode ter mudado ou foi digitado errado.</p>
        <div className="lp-cta">
          {signedIn ? (
            <Link className="lp-btn" data-v="primary" data-size="lg" to="/dashboard">Ir para o Painel</Link>
          ) : (
            <Link className="lp-btn" data-v="primary" data-size="lg" to="/">Ir para o início</Link>
          )}
          <Link className="lp-btn" data-v="outline" data-size="lg" to={PUBLIC_PAGES.calculator.path}>Calculadora de parcelas</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
