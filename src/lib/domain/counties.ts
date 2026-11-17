/** Counties are stored as "ST:County Name", e.g. "NC:Wake County". */
export const countyKey = (state: string, county: string) => `${state}:${county}`;

export function parseCounty(key: string): { state: string; county: string } {
  const i = key.indexOf(":");
  return { state: key.slice(0, i), county: key.slice(i + 1) };
}

/** Drop counties whose state is no longer selected. */
export function keepCountiesInStates(counties: string[], states: string[]): string[] {
  const set = new Set(states);
  return counties.filter((c) => set.has(parseCounty(c).state));
}

/** Counties two members both cover — used to highlight local matches. */
export function sharedCounties(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((c) => set.has(c));
}

/** "Wake County, NC" */
export const countyLabel = (key: string) => {
  const { state, county } = parseCounty(key);
  return `${county}, ${state}`;
};
