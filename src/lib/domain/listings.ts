/** Realtor listings: every investor sees all active listings; ones in their area come first. */
export interface ListingArea {
  state: string;
  county: string | null;
}

/** "county" = in one of the investor's counties, "state" = in one of their states, null = elsewhere. */
export function listingAreaMatch(l: ListingArea, markets: string[], counties: string[] = []): "county" | "state" | null {
  if (l.county && counties.includes(`${l.state}:${l.county}`)) return "county";
  if (markets.includes(l.state)) return "state";
  return null;
}

const RANK = { county: 0, state: 1 } as const;

/** Area-matched listings first (county before state); original order kept within each group. */
export function sortListingsForInvestor<T extends ListingArea>(rows: T[], markets: string[], counties: string[] = []): T[] {
  const rank = (l: T) => {
    const m = listingAreaMatch(l, markets, counties);
    return m ? RANK[m] : 2;
  };
  return rows.map((l, i) => ({ l, i })).sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i).map((x) => x.l);
}
