export interface PlumbingFixtureData {
  id: string;
  name: string;
  wsfu: number; // Water Supply Fixture Unit (IPC)
  dfu: number;  // Drainage Fixture Unit (IPC)
  lu: number;   // Loading Unit (BS 8558 / BS EN 806)
  du: number;   // Discharge Unit (BS EN 12056)
  isFlushometer?: boolean;
}

export const IPC_FIXTURES: PlumbingFixtureData[] = [
  { id: 'wc_pub_fv', name: 'Water Closet (Public) - Flushometer (1.6 GPF)', wsfu: 10, dfu: 4, lu: 2.0, du: 2.0, isFlushometer: true },
  { id: 'wc_pub_ft', name: 'Water Closet (Public) - Flush Tank', wsfu: 5, dfu: 4, lu: 2.0, du: 2.0 },
  { id: 'wc_priv_fv', name: 'Water Closet (Private) - Flushometer', wsfu: 6, dfu: 4, lu: 2.0, du: 2.0, isFlushometer: true },
  { id: 'wc_priv_ft', name: 'Water Closet (Private) - Flush Tank', wsfu: 2.2, dfu: 3, lu: 2.0, du: 2.0 },
  { id: 'lav_pub', name: 'Lavatory (Public) - Faucet', wsfu: 2.0, dfu: 1, lu: 1.0, du: 0.5 },
  { id: 'lav_priv', name: 'Lavatory (Private) - Faucet', wsfu: 0.7, dfu: 1, lu: 1.0, du: 0.5 },
  { id: 'shower_pub', name: 'Shower (Public) - Mixing Valve', wsfu: 4.0, dfu: 2, lu: 2.0, du: 0.6 },
  { id: 'shower_priv', name: 'Shower (Private) - Mixing Valve', wsfu: 1.4, dfu: 2, lu: 2.0, du: 0.6 },
  { id: 'sink_pub', name: 'Service Sink (Public) - Faucet', wsfu: 3.0, dfu: 2, lu: 3.0, du: 0.8 },
  { id: 'sink_priv', name: 'Kitchen Sink (Private) - Faucet', wsfu: 1.4, dfu: 2, lu: 3.0, du: 0.8 },
  { id: 'urinal_pub_fv', name: 'Urinal (Public) - 1" Flushometer', wsfu: 10, dfu: 4, lu: 1.5, du: 0.5, isFlushometer: true },
  { id: 'drink_fount', name: 'Drinking Fountain (Public/Private)', wsfu: 0.25, dfu: 0.5, lu: 0.1, du: 0.1 },
  { id: 'bathtub', name: 'Bathtub', wsfu: 1.4, dfu: 2, lu: 1.0, du: 0.8 },
  { id: 'bidet', name: 'Bidet', wsfu: 2.0, dfu: 1, lu: 1.0, du: 0.5 },
  { id: 'dishwasher_dom', name: 'Dishwasher (Domestic)', wsfu: 1.4, dfu: 2, lu: 1.5, du: 0.8 },
  { id: 'washing_mach', name: 'Washing Machine (8 lb)', wsfu: 1.4, dfu: 2, lu: 1.5, du: 0.8 }
];

export const getFixtureById = (id: string): PlumbingFixtureData | undefined => IPC_FIXTURES.find(f => f.id === id);
