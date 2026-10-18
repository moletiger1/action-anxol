import 'server-only';

/** Local status only, not provider evidence, a gate approval, or a configuration switch. */
export const UNCONFIGURED_CAPABILITIES = Object.freeze({
  finality: 'UNCONFIGURED',
  eligibility: 'UNCONFIGURED',
  jointCustodyBankCommit: 'UNCONFIGURED',
  notificationCommit: 'UNCONFIGURED',
} as const);

export type ClosedPortResult = Readonly<{ ok: false; code: 'PRODUCTION_PORT_UNAVAILABLE'; admission: 'REJECTED'; effects: 0 }>;

export function createClosedOperationalPorts() {
  const deny = (input: unknown): ClosedPortResult => {
    void input;
    return Object.freeze({ ok: false, code: 'PRODUCTION_PORT_UNAVAILABLE', admission: 'REJECTED', effects: 0 });
  };
  return Object.freeze({
    finality: Object.freeze({ commit: deny }),
    eligibility: Object.freeze({ verify: deny }),
    custodian: Object.freeze({ execute: deny }),
    notification: Object.freeze({ commitSend: deny }),
  });
}
