// Small client-side event bus for portfolio state changes.
//
// Fires when a portfolio balance or log is mutated (daily variation saved,
// rescue, deposit via savings transfer, portfolio created/deleted). Client
// widgets that fetch portfolio data on their own (investment streak, the
// navbar widget itself) listen for this and refetch. `router.refresh()` is
// still the source of truth for server-rendered props — this event is for
// the pieces `refresh()` can't touch (client-only fetches with no deps).

export const PORTFOLIO_UPDATED_EVENT = 'mfi:portfolio-updated'

export function emitPortfolioUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT))
}
