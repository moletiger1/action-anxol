import { DEMO_SIGNERS } from './common.ts';
import type { CatalogAction, CatalogState } from './catalog.ts';
export type CatalogRelation = Extract<CatalogAction, { type: 'reconcile' }>['relation'];
// Shared by the actual UI handler and its command-integration regression tests.
export function catalogReconciliation(state: CatalogState, proposalId: keyof CatalogState['proposals'], relation: CatalogRelation) {
  return { type: 'reconcile' as const, proposalId, relation,
    signers: relation === 'unknown' ? [] : DEMO_SIGNERS, now: state.now + 1 };
}
