/**
 * Static menu tree for the sidebar navigator.
 *
 * Level 1 = asset-class groups, level 2 = sub-groups OR reports,
 * level 3 = reports (leaves).
 *
 * @type {import('../types').MenuNode[]}
 */
export const MENU_DATA = [
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

export default MENU_DATA;
