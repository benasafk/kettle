/** In-memory accounting for one bounded evaluation run, not a durable production ledger.
 * All provider instances in that run must share this object. Ambiguous/failed attempts
 * remain reserved. The amount must come from a verified conservative pricing bound;
 * this ledger cannot discover prices, enforce an account-wide cap, or stop other clients. */
export class EvaluationBudget {
  private reservedUsd = 0;
  constructor(readonly capUsd: number) {
    if (!Number.isFinite(capUsd) || capUsd < 0) throw new Error('Invalid evaluation budget');
  }
  reserve(upperBoundUsd: number): boolean {
    if (!Number.isFinite(upperBoundUsd) || upperBoundUsd <= 0) return false;
    // Conservatively round reservations up to millionths of a dollar.
    const amount = Math.ceil(upperBoundUsd * 1e6) / 1e6;
    if (Math.round((this.reservedUsd + amount) * 1e6) > Math.floor(this.capUsd * 1e6)) return false;
    this.reservedUsd = Math.round((this.reservedUsd + amount) * 1e6) / 1e6;
    return true;
  }
  snapshot() { return { cap_usd: this.capUsd, reserved_usd: this.reservedUsd, remaining_usd: this.capUsd - this.reservedUsd }; }
}
