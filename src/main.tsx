import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { prerenderedPage } from './router/routes'
import { UpdatePrompt } from './components/layout/UpdatePrompt'
import './styles/index.css'
import { startVitals } from './lib/vitals'

// Real-use performance (improvement 43): production builds only.
if (import.meta.env.PROD) startVitals(import.meta.env.VITE_API_URL, __APP_VERSION__)

const root = document.getElementById('root')!

const app = <App router={(tree) => <BrowserRouter>{tree}</BrowserRouter>} browserOnly={<UpdatePrompt />} />

// Public pages come as ready HTML (issue #7, vite-prerender.ts). Fetch that
// page's code first, then hydrate: React keeps the HTML on screen instead of
// drawing it again. Without the code (e.g. offline), draw from scratch.
const ready = prerenderedPage(root.dataset.page)
if (ready) ready().then(() => hydrateRoot(root, app), () => createRoot(root).render(app))
else createRoot(root).render(app)

// Opening screen of the installed app (index.html): leaves once the app has
// painted, fading out (never fading in, see CLAUDE.md "Animations").
const splash = document.getElementById('lt-splash')
if (splash) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      splash.setAttribute('data-leaving', '')
      setTimeout(() => splash.remove(), 250)
    }),
  )
}
