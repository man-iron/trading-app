/**
 * servers/data/mockData.js
 *
 * Single source of truth for BOTH mock servers (rest-server.js on :4000 and
 * ws-server.js on :4001). Exports:
 *   - menuData            exact 3-level menu tree from the architecture contract
 *   - userData            retro trading-desk persona returned by /api/init
 *   - eodDates            last 10 business days ending 2026-08-05, newest first
 *   - reports             Record<reportId, { columns: ColumnDef[], rows: ReportRow[] }>
 *   - getReport(id)       lookup helper (null when unknown)
 *   - mutateRowsForDate   deterministic per-date variation of seed rows (EOD)
 *   - driftRow            realistic tick drift on price/change/pct fields (WS)
 *
 * Shapes follow src/types/index.ts (MenuNode, ColumnDef, ReportRow, ...).
 * Plain Node ESM — no build step, run with `node`.
 */

/* ------------------------------------------------------------------ */
/* Small deterministic utilities                                       */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a 32-bit string hash. Deterministic across runs/platforms.
 * @param {string} str
 * @returns {number} unsigned 32-bit hash
 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mulberry32 seeded PRNG. Returns a function producing floats in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Round to a fixed number of decimal places.
 * @param {number} value
 * @param {number} dp
 * @returns {number}
 */
export function round(value, dp) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/**
 * Sensible display precision for a numeric quote based on magnitude.
 * @param {number} value
 * @returns {number} decimal places
 */
function decimalsFor(value) {
  const abs = Math.abs(value);
  if (abs >= 100) return 2;
  if (abs >= 10) return 3;
  return 4;
}

/** URL-ish slug for building stable row ids. */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ------------------------------------------------------------------ */
/* Drift / mutation field classification                               */
/* ------------------------------------------------------------------ */

/** Numeric fields that behave like prices/levels and are allowed to move. */
const PRICE_FIELDS = new Set([
  'bid',
  'ask',
  'mid',
  'price',
  'last',
  'fwdRate',
  'rate',
  'yield',
  'spread',
  'points',
]);

/** Preference order for the "headline" quote field of a row. */
const PRIMARY_KEYS = ['mid', 'price', 'last', 'fwdRate', 'rate', 'yield', 'spread', 'points'];

/**
 * @param {Record<string, string|number>} row
 * @returns {string|null} the headline numeric quote key of the row
 */
function primaryFieldOf(row) {
  for (const key of PRIMARY_KEYS) {
    if (typeof row[key] === 'number') return key;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Base timestamp + persona + menu tree                                */
/* ------------------------------------------------------------------ */

/** Seed "as of" instant for all static rows: 2026-08-06 13:30:00 UTC. */
export const BASE_TIMESTAMP = Date.UTC(2026, 7, 6, 13, 30, 0);

/** @type {import('../../src/types').UserData} */
export const userData = {
  id: 'trader-0042',
  name: 'Vinnie "Two Screens" Marchetti',
  role: 'Head of Flow Trading',
  email: 'vinnie.marchetti@bakelite-capital.example',
  desk: 'Global Macro - Desk 7 (a.k.a. The Pit)',
  preferences: { theme: 'dark', defaultReportId: 'fx-spot' },
};

/**
 * Exact 3-level menu tree from the architecture contract.
 * Level 1 = asset-class groups, level 2 = sub-groups OR reports,
 * level 3 = reports (leaves).
 * @type {import('../../src/types').MenuNode[]}
 */
export const menuData = [
  {
    id: 'markets',
    label: 'Markets',
    type: 'group',
    children: [
      {
        id: 'fx',
        label: 'FX',
        type: 'group',
        children: [
          { id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' },
          { id: 'fx-forwards', label: 'FX Forwards', type: 'report', transport: 'rest' },
        ],
      },
      {
        id: 'rates',
        label: 'Rates',
        type: 'group',
        children: [
          { id: 'rates-govt', label: 'Govt Bonds', type: 'report', transport: 'ws' },
          { id: 'rates-irs', label: 'IRS Curve', type: 'report', transport: 'rest' },
        ],
      },
      {
        id: 'credit',
        label: 'Credit',
        type: 'group',
        children: [
          { id: 'credit-cds', label: 'CDS Indices', type: 'report', transport: 'rest' },
        ],
      },
    ],
  },
  {
    id: 'derivatives',
    label: 'Derivatives',
    type: 'group',
    children: [
      { id: 'swaps', label: 'Swaps', type: 'report', transport: 'rest' },
      {
        id: 'commodities',
        label: 'Commodities',
        type: 'group',
        children: [
          { id: 'commod-energy', label: 'Energy', type: 'report', transport: 'ws' },
          { id: 'commod-metals', label: 'Metals', type: 'report', transport: 'rest' },
        ],
      },
    ],
  },
  {
    id: 'equities',
    label: 'Equities',
    type: 'group',
    children: [
      { id: 'stocks', label: 'Stocks', type: 'report', transport: 'ws' },
      { id: 'etfs', label: 'ETFs', type: 'report', transport: 'rest' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* EOD dates                                                           */
/* ------------------------------------------------------------------ */

/**
 * Walk backwards from an end date (assumed to be a business day) collecting
 * `count` business days (Mon-Fri), newest first. UTC-safe.
 * @param {string} endDate 'YYYY-MM-DD'
 * @param {number} count
 * @returns {string[]}
 */
export function lastBusinessDays(endDate, count) {
  const dates = [];
  const cursor = new Date(`${endDate}T00:00:00Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

/** Last 10 business days ending 2026-08-05, newest first. */
export const eodDates = lastBusinessDays('2026-08-05', 10);

/* ------------------------------------------------------------------ */
/* Row construction helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Finish a seed row: append deterministic change / pctChange derived from the
 * row's headline quote, plus the shared base timestamp.
 * @param {string} id
 * @param {Record<string, string|number>} fields
 * @returns {Record<string, string|number>}
 */
function finishRow(id, fields) {
  const rng = mulberry32(hashString(`seed|${id}`));
  const row = { id, ...fields };
  const primaryKey = primaryFieldOf(row);
  const primary = primaryKey ? /** @type {number} */ (row[primaryKey]) : 0;
  const pctChange = round((rng() - 0.5) * 1.8, 2);
  row.change = round((primary * pctChange) / 100, decimalsFor(primary || 1));
  row.pctChange = pctChange;
  row.updated = BASE_TIMESTAMP;
  return row;
}

const col = (key, label, type, align) =>
  align ? { key, label, type, align } : { key, label, type };

const CHANGE_COLS = [
  col('change', 'Chg', 'number', 'right'),
  col('pctChange', 'Chg %', 'pct', 'right'),
];
const UPDATED_COL = col('updated', 'Updated', 'timestamp', 'right');

/* ------------------------------------------------------------------ */
/* FX Spot (ws) - 16 rows                                              */
/* ------------------------------------------------------------------ */

const FX_SPOT_QUOTES = [
  ['EUR/USD', 1.0842, 0.8],
  ['GBP/USD', 1.2718, 1.0],
  ['USD/JPY', 148.32, 0.9],
  ['USD/CHF', 0.8791, 1.2],
  ['AUD/USD', 0.6573, 0.9],
  ['NZD/USD', 0.6021, 1.1],
  ['USD/CAD', 1.3624, 1.0],
  ['EUR/GBP', 0.8526, 0.9],
  ['EUR/JPY', 160.81, 1.3],
  ['GBP/JPY', 188.63, 1.6],
  ['EUR/CHF', 0.9532, 1.1],
  ['AUD/JPY', 97.49, 1.4],
  ['USD/SEK', 10.482, 8.0],
  ['USD/NOK', 10.6215, 9.0],
  ['USD/MXN', 17.083, 12.0],
  ['USD/CNH', 7.1968, 3.0],
];

const fxSpotColumns = [
  col('pair', 'Pair', 'string', 'left'),
  col('bid', 'Bid', 'price', 'right'),
  col('ask', 'Ask', 'price', 'right'),
  col('mid', 'Mid', 'price', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const fxSpotRows = FX_SPOT_QUOTES.map(([pair, mid, spreadPips]) => {
  const pip = pair.includes('JPY') ? 0.01 : 0.0001;
  const dp = pair.includes('JPY') ? 3 : 4;
  const half = (spreadPips * pip) / 2;
  return finishRow(`fx-spot-${slug(pair)}`, {
    pair,
    bid: round(mid - half, dp),
    ask: round(mid + half, dp),
    mid: round(mid, dp),
  });
});

/* ------------------------------------------------------------------ */
/* FX Forwards (rest) - 25 rows                                        */
/* ------------------------------------------------------------------ */

const FX_FWD_BASE = [
  ['EUR/USD', 1.0842, 118],
  ['GBP/USD', 1.2718, -64],
  ['USD/JPY', 148.32, -612],
  ['AUD/USD', 0.6573, -38],
  ['USD/CAD', 1.3624, -27],
];

const FX_FWD_TENORS = [
  ['1W', 7],
  ['1M', 30],
  ['3M', 91],
  ['6M', 182],
  ['1Y', 365],
];

const fxForwardsColumns = [
  col('pair', 'Pair', 'string', 'left'),
  col('tenor', 'Tenor', 'string', 'left'),
  col('points', 'Points', 'number', 'right'),
  col('fwdRate', 'Fwd Rate', 'price', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const fxForwardsRows = [];
for (const [pair, spot, annualPoints] of FX_FWD_BASE) {
  const isJpy = pair.includes('JPY');
  const pip = isJpy ? 0.01 : 0.0001;
  const dp = isJpy ? 3 : 5;
  for (const [tenor, days] of FX_FWD_TENORS) {
    const points = round((annualPoints * days) / 365, 1);
    fxForwardsRows.push(
      finishRow(`fx-forwards-${slug(pair)}-${tenor.toLowerCase()}`, {
        pair,
        tenor,
        points,
        fwdRate: round(spot + points * pip, dp),
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Govt Bonds (ws) - 16 rows                                           */
/* ------------------------------------------------------------------ */

const GOVT_BONDS = [
  ['UST 2Y', 4.25, 99.72, 4.38],
  ['UST 5Y', 4.0, 99.05, 4.21],
  ['UST 10Y', 4.25, 100.84, 4.15],
  ['UST 30Y', 4.5, 102.31, 4.36],
  ['DE Bund 2Y', 2.5, 100.1, 2.44],
  ['DE Bund 5Y', 2.4, 99.61, 2.49],
  ['DE Bund 10Y', 2.6, 100.92, 2.5],
  ['DE Bund 30Y', 2.7, 99.13, 2.74],
  ['UK Gilt 2Y', 4.0, 99.84, 4.09],
  ['UK Gilt 10Y', 4.25, 100.35, 4.21],
  ['UK Gilt 30Y', 4.5, 98.87, 4.57],
  ['JGB 2Y', 0.4, 99.95, 0.43],
  ['JGB 10Y', 1.0, 99.42, 1.06],
  ['JGB 30Y', 2.0, 98.6, 2.08],
  ['FR OAT 10Y', 3.0, 100.55, 2.94],
  ['IT BTP 10Y', 3.85, 100.2, 3.83],
];

const ratesGovtColumns = [
  col('instrument', 'Instrument', 'string', 'left'),
  col('coupon', 'Coupon', 'pct', 'right'),
  col('price', 'Price', 'price', 'right'),
  col('yield', 'Yield', 'pct', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const ratesGovtRows = GOVT_BONDS.map(([instrument, coupon, price, yld]) =>
  finishRow(`rates-govt-${slug(instrument)}`, {
    instrument,
    coupon,
    price,
    yield: yld,
  }),
);

/* ------------------------------------------------------------------ */
/* IRS Curve (rest) - 20 rows                                          */
/* ------------------------------------------------------------------ */

const IRS_CURVES = [
  ['USD', [['1Y', 4.05], ['2Y', 3.82], ['5Y', 3.6], ['10Y', 3.68], ['30Y', 3.55]]],
  ['EUR', [['1Y', 2.25], ['2Y', 2.28], ['5Y', 2.39], ['10Y', 2.58], ['30Y', 2.52]]],
  ['GBP', [['1Y', 4.01], ['2Y', 3.88], ['5Y', 3.74], ['10Y', 3.81], ['30Y', 3.66]]],
  ['JPY', [['1Y', 0.42], ['2Y', 0.52], ['5Y', 0.75], ['10Y', 0.99], ['30Y', 1.42]]],
];

const ratesIrsColumns = [
  col('instrument', 'Instrument', 'string', 'left'),
  col('currency', 'Ccy', 'string', 'left'),
  col('tenor', 'Tenor', 'string', 'left'),
  col('rate', 'Par Rate', 'pct', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const ratesIrsRows = [];
for (const [currency, points] of IRS_CURVES) {
  for (const [tenor, rate] of points) {
    ratesIrsRows.push(
      finishRow(`rates-irs-${currency.toLowerCase()}-${tenor.toLowerCase()}`, {
        instrument: `${currency} IRS ${tenor}`,
        currency,
        tenor,
        rate,
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/* CDS Indices (rest) - 15 rows                                        */
/* ------------------------------------------------------------------ */

const CDS_INDICES = [
  ['CDX.NA.IG', 'S46', 52.4],
  ['CDX.NA.IG HVOL', 'S46', 98.4],
  ['CDX.NA.IG 10Y', 'S46', 89.1],
  ['CDX.NA.HY', 'S46', 331.5],
  ['CDX.EM', 'S41', 168.2],
  ['iTraxx Europe Main', 'S45', 55.8],
  ['iTraxx Europe 10Y', 'S45', 92.6],
  ['iTraxx Crossover', 'S45', 301.7],
  ['iTraxx Senior Financials', 'S45', 62.3],
  ['iTraxx Sub Financials', 'S45', 118.9],
  ['iTraxx SovX WE', 'S45', 38.9],
  ['iTraxx Asia ex-Japan', 'S45', 84.6],
  ['iTraxx Japan', 'S45', 49.2],
  ['iTraxx Australia', 'S45', 66.4],
  ['iTraxx CEEMEA', 'S45', 131.0],
];

const creditCdsColumns = [
  col('instrument', 'Index', 'string', 'left'),
  col('series', 'Series', 'string', 'left'),
  col('spread', 'Spread (bp)', 'price', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const creditCdsRows = CDS_INDICES.map(([instrument, series, spread]) =>
  finishRow(`credit-cds-${slug(`${instrument} ${series}`)}`, {
    instrument,
    series,
    spread,
  }),
);

/* ------------------------------------------------------------------ */
/* Swaps (rest) - 18 rows                                              */
/* ------------------------------------------------------------------ */

const OIS_CURVES = [
  ['USD', 'SOFR OIS', [['1Y', 4.12], ['2Y', 3.86], ['5Y', 3.64], ['10Y', 3.71], ['30Y', 3.58]]],
  ['EUR', 'ESTR OIS', [['1Y', 2.28], ['2Y', 2.31], ['5Y', 2.42], ['10Y', 2.61], ['30Y', 2.55]]],
  ['GBP', 'SONIA OIS', [['2Y', 3.92], ['5Y', 3.78], ['10Y', 3.85], ['30Y', 3.7]]],
  ['JPY', 'TONA OIS', [['2Y', 0.55], ['5Y', 0.78], ['10Y', 1.02], ['30Y', 1.45]]],
];

const swapsColumns = [
  col('instrument', 'Instrument', 'string', 'left'),
  col('currency', 'Ccy', 'string', 'left'),
  col('tenor', 'Tenor', 'string', 'left'),
  col('bid', 'Bid', 'pct', 'right'),
  col('ask', 'Ask', 'pct', 'right'),
  col('mid', 'Mid', 'pct', 'right'),
  ...CHANGE_COLS,
  UPDATED_COL,
];

const swapsRows = [];
for (const [currency, index, points] of OIS_CURVES) {
  for (const [tenor, mid] of points) {
    swapsRows.push(
      finishRow(`swaps-${currency.toLowerCase()}-${slug(index)}-${tenor.toLowerCase()}`, {
        instrument: `${currency} ${index} ${tenor}`,
        currency,
        tenor,
        bid: round(mid - 0.02, 4),
        ask: round(mid + 0.02, 4),
        mid,
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Commodities (energy ws / metals rest) - 15 rows each                */
/* ------------------------------------------------------------------ */

const ENERGY_CONTRACTS = [
  ['WTI Crude Sep26', 'NYMEX', 78.42, 412350],
  ['WTI Crude Dec26', 'NYMEX', 77.1, 188420],
  ['Brent Crude Oct26', 'ICE', 82.15, 365810],
  ['Brent Crude Dec26', 'ICE', 80.98, 142230],
  ['NatGas HH Sep26', 'NYMEX', 2.847, 98410],
  ['NatGas HH Dec26', 'NYMEX', 3.412, 64180],
  ['RBOB Gasoline Sep26', 'NYMEX', 2.3915, 51260],
  ['Heating Oil Sep26', 'NYMEX', 2.4482, 43810],
  ['ICE Gasoil Sep26', 'ICE', 731.25, 76520],
  ['TTF NatGas Sep26', 'ICE-ENDEX', 34.82, 39840],
  ['JKM LNG Oct26', 'ICE', 11.94, 12480],
  ['EUA Carbon Dec26', 'ICE-ENDEX', 72.35, 28960],
  ['Newcastle Coal Sep26', 'ICE', 138.6, 8420],
  ['API2 Coal Rotterdam Sep26', 'ICE', 112.75, 6130],
  ['Ethanol Sep26', 'CME', 1.582, 2210],
];

const METALS_CONTRACTS = [
  ['Gold Spot', 'LOCO-LDN', 2412.3, 214520],
  ['Silver Spot', 'LOCO-LDN', 28.415, 88410],
  ['Platinum Spot', 'LOCO-LDN', 1024.6, 21360],
  ['Palladium Spot', 'LOCO-LDN', 962.4, 18240],
  ['Copper HG Sep26', 'COMEX', 4.5215, 96410],
  ['LME Copper 3M', 'LME', 9482.5, 45210],
  ['LME Aluminium 3M', 'LME', 2318.0, 38470],
  ['LME Zinc 3M', 'LME', 2764.5, 19830],
  ['LME Nickel 3M', 'LME', 16480.0, 11240],
  ['LME Lead 3M', 'LME', 2072.0, 9860],
  ['LME Tin 3M', 'LME', 31240.0, 4120],
  ['Iron Ore 62% Sep26', 'SGX', 108.45, 27650],
  ['Uranium U3O8', 'NYMEX', 86.25, 1830],
  ['Lithium Carbonate', 'GFEX', 13120.0, 5240],
  ['Cobalt Metal', 'LME', 33400.0, 940],
];

const commodityColumns = [
  col('instrument', 'Contract', 'string', 'left'),
  col('venue', 'Venue', 'string', 'left'),
  col('price', 'Last', 'price', 'right'),
  ...CHANGE_COLS,
  col('volume', 'Volume', 'number', 'right'),
  UPDATED_COL,
];

const buildCommodityRows = (reportId, contracts) =>
  contracts.map(([instrument, venue, price, volume]) =>
    finishRow(`${reportId}-${slug(instrument)}`, { instrument, venue, price, volume }),
  );

const commodEnergyRows = buildCommodityRows('commod-energy', ENERGY_CONTRACTS);
const commodMetalsRows = buildCommodityRows('commod-metals', METALS_CONTRACTS);

/* ------------------------------------------------------------------ */
/* Equities (stocks ws / etfs rest)                                    */
/* ------------------------------------------------------------------ */

const STOCK_QUOTES = [
  ['AAPL', 'Apple Inc.', 232.15, 48213500],
  ['MSFT', 'Microsoft Corp.', 468.32, 21148200],
  ['NVDA', 'NVIDIA Corp.', 142.87, 312458700],
  ['AMZN', 'Amazon.com Inc.', 218.44, 39215600],
  ['GOOGL', 'Alphabet Inc. A', 186.21, 25871300],
  ['META', 'Meta Platforms Inc.', 561.78, 14208900],
  ['TSLA', 'Tesla Inc.', 244.63, 98413200],
  ['BRK.B', 'Berkshire Hathaway B', 462.1, 3182400],
  ['JPM', 'JPMorgan Chase & Co.', 224.53, 8917200],
  ['V', 'Visa Inc.', 291.36, 5871300],
  ['XOM', 'Exxon Mobil Corp.', 118.24, 15841200],
  ['JNJ', 'Johnson & Johnson', 162.85, 6912800],
  ['WMT', 'Walmart Inc.', 79.42, 17284100],
  ['PG', 'Procter & Gamble Co.', 171.29, 6218400],
  ['MA', 'Mastercard Inc.', 486.75, 2841600],
  ['HD', 'Home Depot Inc.', 372.18, 3412500],
  ['KO', 'Coca-Cola Co.', 64.87, 12481700],
  ['PEP', 'PepsiCo Inc.', 168.34, 4821900],
  ['BAC', 'Bank of America Corp.', 42.16, 32148600],
  ['NFLX', 'Netflix Inc.', 671.29, 3218700],
  ['AMD', 'Advanced Micro Devices', 158.73, 41287300],
  ['CRM', 'Salesforce Inc.', 268.41, 4128600],
  ['DIS', 'Walt Disney Co.', 96.84, 9841200],
  ['INTC', 'Intel Corp.', 31.27, 45182400],
  ['GS', 'Goldman Sachs Group', 512.63, 1984200],
];

const stocksColumns = [
  col('symbol', 'Symbol', 'string', 'left'),
  col('name', 'Name', 'string', 'left'),
  col('price', 'Last', 'price', 'right'),
  ...CHANGE_COLS,
  col('volume', 'Volume', 'number', 'right'),
  UPDATED_COL,
];

const stocksRows = STOCK_QUOTES.map(([symbol, name, price, volume]) =>
  finishRow(`stocks-${slug(symbol)}`, { symbol, name, price, volume }),
);

const ETF_QUOTES = [
  ['SPY', 'SPDR S&P 500 ETF', 561.24, 512.4],
  ['QQQ', 'Invesco QQQ Trust', 484.16, 284.7],
  ['IWM', 'iShares Russell 2000', 218.35, 68.2],
  ['DIA', 'SPDR Dow Jones Industrial', 402.87, 34.1],
  ['VTI', 'Vanguard Total Stock Mkt', 276.48, 412.8],
  ['VOO', 'Vanguard S&P 500', 515.32, 468.5],
  ['EEM', 'iShares MSCI Emerging Mkts', 43.87, 18.4],
  ['EFA', 'iShares MSCI EAFE', 82.14, 52.6],
  ['GLD', 'SPDR Gold Shares', 224.36, 64.9],
  ['SLV', 'iShares Silver Trust', 26.12, 11.8],
  ['TLT', 'iShares 20+ Yr Treasury', 93.45, 48.3],
  ['HYG', 'iShares High Yield Corp', 79.68, 15.2],
  ['LQD', 'iShares IG Corporate', 108.92, 29.7],
  ['XLE', 'Energy Select Sector SPDR', 92.34, 36.4],
  ['XLF', 'Financial Select Sector SPDR', 44.87, 41.2],
  ['XLK', 'Technology Select Sector SPDR', 231.56, 58.9],
  ['ARKK', 'ARK Innovation ETF', 48.92, 6.7],
  ['VNQ', 'Vanguard Real Estate', 88.63, 32.5],
];

const etfsColumns = [
  col('symbol', 'Symbol', 'string', 'left'),
  col('name', 'Name', 'string', 'left'),
  col('price', 'Last', 'price', 'right'),
  ...CHANGE_COLS,
  col('aum', 'AUM ($B)', 'number', 'right'),
  UPDATED_COL,
];

const etfsRows = ETF_QUOTES.map(([symbol, name, price, aum]) =>
  finishRow(`etfs-${slug(symbol)}`, { symbol, name, price, aum }),
);

/* ------------------------------------------------------------------ */
/* Report registry                                                     */
/* ------------------------------------------------------------------ */

/**
 * Every report id in the menu tree maps to { columns, rows } here.
 * @type {Record<string, {columns: Array<object>, rows: Array<Record<string, string|number>>}>}
 */
export const reports = {
  'fx-spot': { columns: fxSpotColumns, rows: fxSpotRows },
  'fx-forwards': { columns: fxForwardsColumns, rows: fxForwardsRows },
  'rates-govt': { columns: ratesGovtColumns, rows: ratesGovtRows },
  'rates-irs': { columns: ratesIrsColumns, rows: ratesIrsRows },
  'credit-cds': { columns: creditCdsColumns, rows: creditCdsRows },
  swaps: { columns: swapsColumns, rows: swapsRows },
  'commod-energy': { columns: commodityColumns, rows: commodEnergyRows },
  'commod-metals': { columns: commodityColumns, rows: commodMetalsRows },
  stocks: { columns: stocksColumns, rows: stocksRows },
  etfs: { columns: etfsColumns, rows: etfsRows },
};

/**
 * Lookup a report definition.
 * @param {string} reportId
 * @returns {{columns: Array<object>, rows: Array<Record<string, string|number>>}|null}
 */
export function getReport(reportId) {
  return Object.prototype.hasOwnProperty.call(reports, reportId) ? reports[reportId] : null;
}

/* ------------------------------------------------------------------ */
/* EOD mutation + live tick drift                                      */
/* ------------------------------------------------------------------ */

/**
 * Deterministic per-date variation of seed rows for EOD reports.
 * Same (rows, date) input always yields the same output; the input array and
 * its rows are never mutated. Price-like fields shift up to +/-2 percent,
 * change / pctChange are re-derived, and `updated` is pinned to the given
 * date's 21:00 UTC close.
 *
 * @param {Array<Record<string, string|number>>} rows
 * @param {string} date 'YYYY-MM-DD'
 * @returns {Array<Record<string, string|number>>} new array of new rows
 */
export function mutateRowsForDate(rows, date) {
  const eodTs = Date.parse(`${date}T21:00:00.000Z`);
  return rows.map((row) => {
    const rng = mulberry32(hashString(`${date}|${row.id}`));
    const next = { ...row };
    const primaryKey = primaryFieldOf(row);
    const hasBook =
      typeof row.bid === 'number' && typeof row.ask === 'number' && typeof row.mid === 'number';

    for (const key of Object.keys(row)) {
      if (key === 'id') continue;
      const value = row[key];
      if (typeof value !== 'number' || !PRICE_FIELDS.has(key)) continue;
      if (hasBook && (key === 'bid' || key === 'ask')) continue; // derived from mid below
      next[key] = round(value * (1 + (rng() - 0.5) * 0.04), decimalsFor(value));
    }

    if (hasBook) {
      const dp = decimalsFor(/** @type {number} */ (row.mid));
      const newMid = /** @type {number} */ (next.mid);
      next.bid = round(newMid - (Number(row.mid) - Number(row.bid)), dp);
      next.ask = round(newMid + (Number(row.ask) - Number(row.mid)), dp);
    }

    if (typeof row.pctChange === 'number') {
      next.pctChange = round((rng() - 0.5) * 3, 2);
      if (typeof row.change === 'number' && primaryKey) {
        const primary = /** @type {number} */ (next[primaryKey]);
        next.change = round((primary * Number(next.pctChange)) / 100, decimalsFor(primary || 1));
      }
    }

    if (typeof row.updated === 'number' && Number.isFinite(eodTs)) {
      next.updated = eodTs;
    }
    return next;
  });
}

/**
 * Realistic tick drift for the WS server. Returns a NEW row where only
 * price-like, change and pct fields (plus the numeric `updated` timestamp)
 * move; every string field and every non-drift numeric field (volume, aum,
 * coupon, ...) is untouched. Bid/ask stay consistent around mid.
 *
 * @param {Record<string, string|number>} row
 * @param {() => number} [rng=Math.random] override for deterministic tests
 * @returns {Record<string, string|number>} new drifted row
 */
export function driftRow(row, rng = Math.random) {
  const next = { ...row };
  const primaryKey = primaryFieldOf(row);
  const hasBook =
    typeof row.bid === 'number' && typeof row.ask === 'number' && typeof row.mid === 'number';
  let delta = 0;

  for (const key of Object.keys(row)) {
    if (key === 'id') continue;
    const value = row[key];
    if (typeof value !== 'number' || !PRICE_FIELDS.has(key)) continue;
    if (hasBook && (key === 'bid' || key === 'ask')) continue; // derived from mid below
    const drifted = round(value * (1 + (rng() - 0.5) * 0.002), decimalsFor(value));
    next[key] = drifted;
    if (key === primaryKey) delta = drifted - value;
  }

  if (hasBook) {
    const dp = decimalsFor(/** @type {number} */ (row.mid));
    const newMid = /** @type {number} */ (next.mid);
    next.bid = round(newMid - (Number(row.mid) - Number(row.bid)), dp);
    next.ask = round(newMid + (Number(row.ask) - Number(row.mid)), dp);
  }

  if (primaryKey && typeof row.change === 'number') {
    next.change = round(Number(row.change) + delta, decimalsFor(Number(row[primaryKey]) || 1));
  }
  if (primaryKey && typeof row.pctChange === 'number' && Number(row[primaryKey]) !== 0) {
    next.pctChange = round(
      Number(row.pctChange) + (delta / Number(row[primaryKey])) * 100,
      2,
    );
  }
  if (typeof row.updated === 'number') {
    next.updated = Date.now();
  }
  return next;
}
