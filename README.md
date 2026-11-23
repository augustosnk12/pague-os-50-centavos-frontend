# 💸 Pague os 50 centavos — Web

Front-end do **Pague os 50 centavos**: um app para controlar quem te deve. Você cadastra a pessoa, registra a dívida (que vira parcelas sozinha), vê quem está atrasado e recebe com um toque — com cobrança pelo WhatsApp e Pix copia e cola.

**React 19 + Vite + TypeScript**, em português do Brasil, pensado primeiro para o celular. A API fica em outro repositório (`pague-os-50-centavos`).

---

## Sumário

- [Telas](#telas)
- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e verificações](#testes-e-verificações)
- [Estrutura](#estrutura)
- [Decisões de design](#decisões-de-design)
- [Deploy (Vercel)](#deploy-vercel)

---

## Telas

| Tela | O que tem |
|---|---|
| **Página inicial** (`/`, para quem não entrou) | Apresentação com exemplos reais do app, animações (respeitam "reduzir movimento"), tema claro/escuro, dúvidas e o formulário **"Fale comigo"** (o e-mail do desenvolvedor fica só no servidor; anti-spam na API) |
| **Entrar / Criar conta** | Só o e-mail; depois **código de 6 dígitos** (ou o link do e-mail). Tela própria para link expirado; sessão expirada abre uma folha para entrar de novo sem sair da tela |
| **Painel** | "A receber em novembro", barra de recebido, atrasos de qualquer mês, agenda (em atraso, hoje, próximos 7 dias) e "Comece em 2 passos" na conta nova |
| **Devedores** | Lista com busca (sem acento), filtro por confiabilidade, salto por letra, arquivados no fim |
| **Perfil do devedor** | O que deve e o que está atrasado, dívidas em cartões com as próximas parcelas, quitadas, pagamentos; cobrar no WhatsApp, receber várias de uma vez, quitar, encerrar/retomar mensalidade, **enviar extrato** |
| **Nova dívida** | Para quem, tipo, valor, parcelas com prévia, mensalidade recorrente (sem fim / após N meses / em uma data) |
| **Parcelas** | Período (Dia · Semana · Mês) no chip, quadro com "A receber" sempre visível, abas A receber · Atrasadas · Pagas, linhas enxutas; deslizar para receber ou cobrar; estado na URL |
| **Recebimentos** | Quanto entrou por período, uma barra por mês, últimos pagamentos e **exportar CSV** |
| **Configurações** | Vencimento padrão, chave Pix (com máscara e validação), nível de detalhe (Detalhada/Enxuta), tema, tamanho do texto, calculadora, apoie o projeto, **baixar meus dados** e **excluir conta** |

Folhas compartilhadas: **registrar pagamento** (inteiro, metade ou outro valor; hoje, ontem ou outra data; desfazer), **comprovante** (texto ou imagem PNG), **lembrete no WhatsApp** (com Pix copia e cola do valor exato) e **extrato do devedor**.

## Tecnologias

| | |
|---|---|
| UI | React 19, React Router 7 |
| Dados | TanStack Query 5 + Axios |
| Linguagem | TypeScript (estrito) |
| Build | Vite |
| Estilo | CSS próprio com *tokens* (cores OKLCH, raios `--r-sm/md/lg/pill`, movimento), sem framework de CSS |
| Fonte | Manrope variável servida pelo próprio site (sem Google Fonts) |
| Ícones | Sprite SVG (`<IconSprite>` + `<use>`) |
| Métricas | `web-vitals` (enviadas para a API em produção) |
| Testes | Vitest + Testing Library + axe-core; Playwright (E2E com axe); Lighthouse CI |

## Como rodar

Precisa da API rodando (veja o repositório da API).

```bash
npm install
cp .env.example .env         # aponte VITE_API_URL para a API (ex.: http://localhost:3000)
npm run dev                  # http://localhost:5173
```

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `VITE_API_URL` | Endereço da API |
| `VITE_SITE_URL` | Endereço público do site (ex.: `https://seu-dominio.com.br`), para `canonical`, prévia do link (`og:image`) e `sitemap.xml`. Sem ele o build avisa e deixa essas tags de fora |
| `VITE_SUPPORT_PIX` | Chave Pix do "Apoie o projeto" (opcional; vazia = o item não aparece). Na Vercel, cadastrar como tipo **"Config"** (a Vercel não aceita `VITE_` como segredo) |

## Testes e verificações

```bash
npm run typecheck            # app + código dos testes E2E
npm run lint                 # ESLint (com jsx-a11y)
npm test                     # Vitest: lógica, componentes e telas (API simulada), com axe
npm run build && npm run check:bundle   # JS inicial abaixo de 170 KB gzip
npm run e2e                  # Playwright contra a API REAL (../pague-os-50-centavos ou API_DIR) e banco vazio <db>_e2e_test
npm run lhci                 # Lighthouse no build de produção (precisa de Node ≥ 22)
```

- **E2E**: celular (Pixel 7) e desktop; cada tela passa pelo axe (contraste nos temas claro e escuro). As sessões são criadas direto no banco; só os testes do link mágico chamam a rota de acesso.
- **Lighthouse CI** mede a página inicial e a tela de entrada: LCP < 2 s, CLS < 0,05, acessibilidade 100 e desempenho ≥ 0,9.
- **CI** (`.github/workflows/ci.yml`): checagens + build + orçamento do bundle, Lighthouse e E2E (usa a branch de mesmo nome da API quando existe, senão a `main`; precisa do segredo `API_REPO_TOKEN`).

## Estrutura

```
src/
├── api/            chamadas à API (uma por área)
├── components/
│   ├── ui/         biblioteca: Button, IconButton, Icon (12/16/20/24/28), Avatar (24/36/48), Modal, Segmented,
│   │               ListGroup/ListRow/LinkRow/NavRow, SectionHeader, PageHeader, StatusBadge, DateInput, Tabs…
│   ├── layout/     cabeçalho, abas do celular, logo, folha de sessão
│   └── shared/     folhas e linhas compartilhadas (pagamento, comprovante, lembrete, extrato, lote…)
├── contexts/       autenticação, tema, preferências (detalhe, tamanho do texto), avisos
├── hooks/          React Query por área e utilitários (voltar, atalhos, conexão…)
├── lib/            regras puras: datas, dinheiro, Pix (BR Code), parcelas, CSV, extrato, comprovante…
├── pages/          uma pasta por tela (carregadas sob demanda)
├── router/         rotas e pré-carregamento na intenção
├── styles/         index.css (tokens e componentes)
└── test/           helpers dos testes (API simulada, axe)
e2e/                testes Playwright
prototype/          protótipo HTML original e a landing (referência visual; veja prototype/README.md)
```

Convenções para quem for mexer no código: [`CLAUDE.md`](./CLAUDE.md).

## Decisões de design

- **Datas sempre no formato brasileiro** (DD/MM/AAAA nos campos, "seg, 09 nov" nos textos) e nunca o seletor de data nativo do navegador.
- **Status da parcela derivado** das datas e valores, nunca do campo `status` da API.
- **Dinheiro em centavos inteiros** nos formulários.
- **Acessibilidade**: um `h1` por tela, foco e título atualizados ao trocar de tela, botões com nome, seletores como `radiogroup`, folhas com foco preso, alvos de 44 px no toque, axe em todos os testes.
- **Movimento**: só deslocamento/escala, nunca a partir de opacidade 0 (congela em abas em segundo plano); tudo parado com "reduzir movimento".
- **Tamanhos travados pelo tipo**: ícones e avatares só aceitam os tamanhos da escala.
- **Desempenho**: telas carregadas sob demanda e pré-carregadas ao apontar no link; perfil pré-buscado ao apontar numa pessoa; grupos de dia fora da tela não são desenhados (`content-visibility`).

## Deploy (Vercel)

- **Páginas públicas prontas (SEO)**: o build escreve a landing (`index.html`), a calculadora (`calculadora-de-parcelas.html`) e o `404.html` já com o conteúdo, título, descrição, Open Graph e JSON-LD (`vite-prerender.ts`, a partir de `src/prerender.tsx`), além de `robots.txt` e `sitemap.xml`.
- `vercel.json` manda as telas do app para o `app.html` (sem conteúdo pronto, com `X-Robots-Tag: noindex`). Endereço que não existe responde **404** (não há mais rewrite para tudo). Rota nova no app → incluir em `src/seo/site.ts` (`APP_ROUTES`) e no `vercel.json` (o teste `src/seo/seo.test.ts` confere).
- `npm run preview` responde igual à Vercel.
- Imagem da prévia do link: `public/og-image.jpg` (`node scripts/og-image.mjs` para refazer).
- Depois do primeiro deploy com o domínio: cadastrar no **Google Search Console** e no **Bing Webmaster Tools** e enviar o `sitemap.xml`.
- Publique **a API antes** quando o front depender de uma rota nova.
