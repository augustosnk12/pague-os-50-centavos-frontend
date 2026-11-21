import axe from 'axe-core'

/**
 * axe in the unit tests (improvement 20/43): the same engine as the E2E suite,
 * on what a component or screen renders in jsdom. Rules that need a real
 * layout engine are left to the E2E (color-contrast) and page-level landmarks
 * are not required of isolated components (region).
 */
export async function axeViolations(root: Element = document.body): Promise<string[]> {
  const result = await axe.run(root, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)
}
