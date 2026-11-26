// Scroll timeline. `len` is the scroll length of each stage in viewport heights (vh).
export const STAGES = [
  { id: 'hero', len: 100, label: '' },
  { id: 'rack', len: 240, label: 'Intelligence' },
  { id: 'orbit', len: 330, label: 'Orbit' },
  { id: 'earth', len: 240, label: 'Earth' },
  { id: 'mind', len: 240, label: 'Mind' },
  { id: 'network', len: 240, label: 'Network' },
  { id: 'close', len: 120, label: '' },
];

// `sector` is the id of one of SECTORS below; it groups the portfolio list on the closing screen.
// `stage` is the index into STAGES. `anchor` says which part of the 3D object the label is pinned to.
// `side` (1 = right of the anchor, -1 = left) and `dy` place the label; it flips sides by itself if it would
// run off the screen. A blade anchor with `edge: 'left'` pins to the left edge of the rack instead of the right.
// A panel anchor with `wing: 'left'` pins to the satellite's left solar panel instead of the right.
// A jet anchor pins to the aircraft that flies over the Earth stage.
// A landmark anchor pins to that company's building in the town of the Network stage.
// On phones the model sits at the left of the screen, so rack and satellite labels go on the right there.
// Optional fields:
//   `at: [in0, in1, out0, out1]`  show the label only for part of its stage (stage positions, e.g. 2.14)
//   `exited: true`                adds a small "Exited" badge
//   `mdy: -24`                    a different `dy` on phones
//   `stack: true`                 keep the preferred side even where the label then sits above its anchor
//   `reach: 0.6`                  shorten (or lengthen) the leader line on desktop, as a multiple of the default
//   `chipBg`, `pad`               logo tile background colour, and inset the logo inside the tile
//   `display: 'name'`             name only: no logo and no link
export const COMPANIES = [
  {
    id: 'deepseek', name: 'DeepSeek', stage: 1, sector: 'ai', tag: 'AI lab',
    desc: 'DeepSeek is an AI lab based in Hangzhou, founded in 2023. Its R1 reasoning model drew worldwide attention in January 2025 for performing close to the leading US models at far lower cost. It publishes its model weights under an open licence, so anyone can download and run them.',
    url: 'https://www.deepseek.com', logo: 'assets/logos/deepseek.png', pad: true,
    anchor: { type: 'blade', i: 11 }, side: 1, dy: -34,
  },
  {
    id: 'moonshot', name: 'Moonshot AI', stage: 1, sector: 'ai', tag: 'AI lab',
    desc: 'Moonshot AI is a Beijing lab founded in 2023 by Yang Zhilin, Zhou Xinyu and Wu Yuxin. It builds the Kimi family of open-weight language models, which are strongest at coding and at agents that carry out multi-step tasks. Its Kimi K3 release in July 2026 was widely compared with the leading US models.',
    url: 'https://www.moonshot.ai', logo: 'assets/logos/moonshot.svg', pad: true, chipBg: '#000',
    anchor: { type: 'blade', i: 7, edge: 'left' }, side: -1, dy: 0,
  },
  {
    id: 'coreauto', name: 'Core Automation', stage: 1, sector: 'ai', tag: 'AI lab',
    desc: 'Core Automation is a San Francisco AI research lab founded in 2026 by former OpenAI researcher Jerry Tworek and colleagues. It is developing new learning algorithms and model architectures as an alternative to scaling up today\'s transformers. The lab uses AI agents to automate much of its own research.',
    url: 'https://www.coreauto.com', logo: 'assets/logos/coreauto.png',
    anchor: { type: 'blade', i: 3 }, side: 1, dy: 34,
  },
  {
    id: 'spacex', name: 'SpaceX', stage: 2, sector: 'space', tag: 'Launch', exited: true,
    desc: 'SpaceX builds and flies reusable rockets, including Falcon 9 and Starship, and operates the Starlink satellite internet network. It carries more mass to orbit each year than any other launch provider. SpaceX listed on Nasdaq in June 2026 under the ticker SPCX.',
    url: 'https://www.spacex.com', logo: 'assets/logos/spacex.svg', chipBg: '#000',
    anchor: { type: 'hull' }, side: 1, dy: -30, at: [2.13, 2.21, 2.4, 2.5],
  },
  {
    id: 'starcloud', name: 'Starcloud', stage: 2, sector: 'space', tag: 'Space compute',
    desc: 'Starcloud builds data centres for orbit, where satellites can run on near-constant solar power and shed their heat into space. Its first satellite, Starcloud-1, launched in November 2025 carrying an Nvidia H100, the first data-centre GPU to fly. Larger commercial satellites are planned to follow.',
    url: 'https://www.starcloud.com', logo: 'assets/logos/starcloud.png',
    anchor: { type: 'panel', wing: 'left' }, side: -1, dy: 48, at: [2.58, 2.66, 3.4, 3.5],
  },
  {
    id: 'higgsfield', name: 'Higgsfield AI', stage: 3, sector: 'ai', tag: 'Generative media',
    desc: 'Higgsfield is an AI studio for making video and images, founded in 2023 by former Snap executive Alex Mashrabov. It brings the leading generation models into one workspace, with camera direction, consistent characters and tools that turn a product into finished ads. It is used by individual creators, agencies and film-makers.',
    url: 'https://higgsfield.ai', logo: 'assets/logos/higgsfield.png',
    anchor: { type: 'city', name: 'San Francisco' }, side: -1, dy: -46,
  },
  {
    id: 'instinct', name: 'Instinct', stage: 3, sector: 'ai', tag: 'Personal AI agent',
    desc: 'Instinct is a personal AI agent built by a San Francisco company that Noah Shinn founded in 2026. There is no app to open: you text or call it, and it uses a phone and a computer the way a person would. It can book travel, order groceries, make reservations and handle email on your behalf.',
    url: 'https://instinct.com', logo: 'assets/logos/instinct.png',
    anchor: { type: 'city', name: 'San Francisco' }, side: 1, dy: -52,
  },
  {
    id: 'alfred', name: 'Alfred', stage: 3, sector: 'ai', tag: 'Physical AI',
    desc: 'Alfred is a physical-AI company based in Hawthorne, California. It builds software that helps engineers design and build robots, cars and other hardware faster. The aim is to bring the pace of software development to physical products.',
    url: '', logo: '', monogram: 'A',
    anchor: { type: 'city', name: 'Los Angeles' }, side: 1, dy: 44,
  },
  {
    id: 'anduril', name: 'Anduril', stage: 3, sector: 'space', tag: 'Defence technology',
    desc: 'Anduril Industries is a defence technology company based in Costa Mesa, California, founded in 2017 by Palmer Luckey and four partners. It builds autonomous aircraft, drones, undersea vehicles and missiles, run by its Lattice software, and sells them to the US military and its allies as finished products. Its Fury uncrewed fighter jet first flew in October 2025, and the US Air Force ordered it into production in June 2026.',
    url: 'https://www.anduril.com', logo: 'assets/logos/anduril.svg', chipBg: '#000',
    anchor: { type: 'jet' }, side: 1, dy: -72, reach: 0.62,
  },
  {
    id: 'neuralink', name: 'Neuralink', stage: 4, sector: 'neuro', tag: 'Brain interface',
    desc: 'Neuralink builds brain-computer interfaces: a small implant, placed by a surgical robot, that reads neural activity through fine threads. Its first product, Telepathy, lets people with paralysis control computers and phones by thought, and has been in human trials since 2024. A second device, Blindsight, is in development to restore vision.',
    url: 'https://neuralink.com', logo: 'assets/logos/neuralink.png',
    anchor: { type: 'chip' }, side: -1, dy: -54,
  },
  {
    id: 'yuga', name: 'Yuga Labs', stage: 5, sector: 'crypto', tag: 'Web3',
    desc: 'Yuga Labs is the web3 studio that created Bored Ape Yacht Club in 2021, one of the best-known NFT collections. It also builds Otherside, a virtual world that runs in the browser, and the ApeChain network around the ApeCoin token. Holders own their characters and can license them commercially.',
    url: 'https://yuga.com', logo: 'assets/logos/yuga.png', pad: true,
    anchor: { type: 'landmark' }, side: -1, dy: -30, reach: 0.6,
  },
  {
    id: 'predictex', name: 'PredictEX', stage: 5, sector: 'crypto', tag: 'Prediction markets',
    desc: 'PredictEX is an exchange for trading the outcomes of sporting events. Prices are set by the market rather than by a bookmaker, and positions can be traded while a game is in play. Trades settle on-chain in USDC on the Base network.',
    url: 'https://www.predictex.com', logo: 'assets/logos/predictex.png',
    anchor: { type: 'landmark' }, side: 1, dy: -44, stack: true,
  },
  {
    id: 'gains', name: 'Gains', stage: 5, sector: 'crypto', tag: 'Social gaming',
    desc: 'Gains is a social casino for adults in the United States, based in Miami. Its games are played with free Gold Coins for entertainment, with separate Sweeps Coins used for sweepstakes prizes, and no purchase is needed to play. Availability varies by state.',
    url: 'https://gains.com', logo: 'assets/logos/gains.png',
    anchor: { type: 'landmark' }, side: -1, dy: 24, mdy: -24, stack: true,
  },
];

// Sectors for the portfolio list on the closing screen, in display order. `col` is the column on that
// screen; companies are listed alphabetically inside each sector.
export const SECTORS = [
  { id: 'ai', label: 'AI', col: 0 },
  { id: 'space', label: 'Space & Defence', col: 1 },
  { id: 'neuro', label: 'Neurotechnology', col: 1 },
  { id: 'crypto', label: 'Crypto & Gaming', col: 1 },
];

export const CITIES = [
  ['San Francisco', 37.77, -122.42], ['Los Angeles', 33.92, -118.35], ['New York', 40.71, -74.0],
  ['Miami', 25.76, -80.19], ['Mexico City', 19.43, -99.13], ['Toronto', 43.65, -79.38],
  ['Sao Paulo', -23.55, -46.63], ['London', 51.5, -0.12], ['Berlin', 52.52, 13.4],
  ['Lagos', 6.52, 3.38], ['Dubai', 25.2, 55.27], ['Mumbai', 19.08, 72.88],
  ['Singapore', 1.35, 103.82], ['Hong Kong', 22.32, 114.17], ['Hangzhou', 30.27, 120.15],
  ['Beijing', 39.9, 116.4], ['Seoul', 37.57, 126.98], ['Tokyo', 35.68, 139.69],
  ['Sydney', -33.87, 151.21],
];

export const ARCS = [
  ['San Francisco', 'Tokyo'], ['San Francisco', 'New York'], ['New York', 'London'],
  ['London', 'Dubai'], ['Dubai', 'Singapore'], ['Singapore', 'Hong Kong'],
  ['Hong Kong', 'Tokyo'], ['Beijing', 'Seoul'], ['Singapore', 'Sydney'],
  ['London', 'Lagos'], ['New York', 'Sao Paulo'], ['Mumbai', 'Singapore'],
  ['Hong Kong', 'San Francisco'], ['Tokyo', 'Sydney'], ['Dubai', 'Mumbai'],
  ['Beijing', 'Hong Kong'], ['London', 'Berlin'], ['Miami', 'Sao Paulo'],
  ['Los Angeles', 'Mexico City'], ['Hangzhou', 'Singapore'], ['Berlin', 'Dubai'],
  ['Seoul', 'Tokyo'], ['Mumbai', 'Hong Kong'],
];
