// Scroll timeline. `len` is the scroll length of each stage in viewport heights (vh).
export const STAGES = [
  { id: 'hero', len: 100 },
  { id: 'rack', len: 400 },
  { id: 'orbit', len: 330 },
  { id: 'earth', len: 240 },
  { id: 'defence', len: 260 },
  { id: 'mind', len: 240 },
  { id: 'network', len: 240 },
  { id: 'close', len: 120 },
];

// `sector` is the id of one of SECTORS below; it groups the portfolio list on the closing screen.
// `stage` is the index into STAGES. `anchor` says which part of the 3D object the label is pinned to.
// `side` (1 = right of the anchor, -1 = left) and `dy` place the label; it flips sides by itself if it would
// run off the screen. A blade anchor with `edge: 'left'` pins to the left edge of the rack instead of the right.
// A panel anchor with `wing: 'left'` pins to the satellite's left solar panel instead of the right.
// An lpu anchor pins to the chip that opens the Intelligence stage, and a rack anchor to the top of the rack.
// A jet anchor pins to the aircraft that crosses the sky of the Defence stage, and a drone anchor to the quadcopter
// that the person on the ground is flying.
// A landmark anchor pins to that company's building in the town of the Network stage.
// On phones the model sits at the left of the screen, so rack and satellite labels go on the right there.
// Optional fields:
//   `at: [in0, in1, out0, out1]`  show the label only for part of its stage (stage positions, e.g. 2.14)
//   `exited: true`                adds a small "Exited" badge
//   `mdy: -24`, `mside: 1`         a different `dy` or `side` on phones
//   `stack: true`                 keep the preferred side even where the label then sits above its anchor
//   `reach: 0.6`                  shorten (or lengthen) the leader line on desktop, as a multiple of the default
//   `chipBg`, `pad`               logo tile background colour, and inset the logo inside the tile
//   `display: 'name'`             name only: no logo and no link
export const COMPANIES = [
  {
    id: 'groq', name: 'Groq', stage: 1, sector: 'ai', tag: 'Inference chips', exited: true,
    desc: 'Groq was founded in 2016 by Jonathan Ross, a former Google engineer, to build the LPU: a chip made to run AI models quickly once they have been trained. In December 2025 Nvidia took a non-exclusive licence to the technology and hired Ross and most of the team, in a deal reported at about $20 billion that was paid out to Groq\'s shareholders. Nvidia has since built the technology into its own LPX systems.',
    url: 'https://groq.com', logo: 'assets/logos/groq.svg',
    anchor: { type: 'lpu' }, side: 1, dy: -40, at: [1.12, 1.18, 1.34, 1.4],
  },
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
    id: 'groqcloud', name: 'Groq Cloud', stage: 1, sector: 'ai', tag: 'Inference cloud',
    desc: 'Groq Cloud is what Groq became after the Nvidia deal: an independent company with a single business, a cloud that runs AI models for other companies. It operates 13 data centres across North America, Europe, the Middle East and Asia Pacific, and serves more than six million developers. It raised $650 million in June 2026, and announced a further $350 million in August 2026 at a valuation of $3.5 billion.',
    url: 'https://groq.com', logo: 'assets/logos/groq.svg',
    anchor: { type: 'rack' }, side: -1, dy: -34,
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
    desc: 'Alfred is a physical-AI company based in Hawthorne, California, backed by Sam Altman. It builds software that helps engineers design and build robots, cars and other hardware faster. The aim is to bring the pace of software development to physical products. The company is still in stealth.',
    url: '', logo: '', monogram: 'A',
    anchor: { type: 'city', name: 'Los Angeles' }, side: 1, dy: 44,
  },
  {
    id: 'anduril', name: 'Anduril', stage: 4, sector: 'space', tag: 'Defence technology',
    desc: 'Anduril Industries is a defence technology company based in Costa Mesa, California, founded in 2017 by Palmer Luckey and four partners. It builds autonomous aircraft, drones, undersea vehicles and missiles, run by its Lattice software, and sells them to the US military and its allies as finished products. Its Fury uncrewed fighter jet first flew in October 2025, and the US Air Force ordered it into production in June 2026.',
    url: 'https://www.anduril.com', logo: 'assets/logos/anduril.svg', chipBg: '#000',
    anchor: { type: 'jet' }, side: 1, dy: -56, mdy: -44, reach: 0.62,
  },
  {
    id: 'shieldai', name: 'Shield AI', stage: 4, sector: 'space', tag: 'Defence technology',
    desc: 'Shield AI is a defence technology company based in San Diego, founded in 2015 by Brandon Tseng, a former Navy SEAL, his brother Ryan Tseng and Andrew Reiter. Its Hivemind software is an AI pilot that flies drones without GPS or a radio link. It first flew on Nova, a quadcopter that searches buildings on its own, and now flies V-BAT, a drone that takes off and lands standing on its tail. X-BAT, an uncrewed fighter that takes off the same way, was unveiled in October 2025, and its first full-scale prototype was finished in November 2026.',
    url: 'https://shield.ai', logo: 'assets/logos/shieldai.svg', pad: true, chipBg: '#000',
    anchor: { type: 'drone' }, side: -1, mside: 1, stack: true, dy: -58, mdy: -52, reach: 0.5,
  },
  {
    id: 'neuralink', name: 'Neuralink', stage: 5, sector: 'neuro', tag: 'Brain interface',
    desc: 'Neuralink builds brain-computer interfaces: a small implant, placed by a surgical robot, that reads neural activity through fine threads. Its first product, Telepathy, lets people with paralysis control computers and phones by thought, and has been in human trials since 2024. A second device, Blindsight, is in development to restore vision.',
    url: 'https://neuralink.com', logo: 'assets/logos/neuralink.png',
    anchor: { type: 'chip' }, side: -1, dy: -54,
  },
  {
    id: 'yuga', name: 'Yuga Labs', stage: 6, sector: 'crypto', tag: 'Web3',
    desc: 'Yuga Labs is the web3 studio that created Bored Ape Yacht Club in 2021, one of the best-known NFT collections. It also builds Otherside, a virtual world that runs in the browser, and the ApeChain network around the ApeCoin token. Holders own their characters and can license them commercially.',
    url: 'https://yuga.com', logo: 'assets/logos/yuga.png', pad: true,
    anchor: { type: 'landmark' }, side: -1, dy: -30, reach: 0.6,
  },
  {
    id: 'predictex', name: 'PredictEX', stage: 6, sector: 'crypto', tag: 'Prediction markets',
    desc: 'PredictEX is an exchange for trading the outcomes of sporting events. Prices are set by the market rather than by a bookmaker, and positions can be traded while a game is in play. Trades settle on-chain in USDC on the Base network.',
    url: 'https://www.predictex.com', logo: 'assets/logos/predictex.png',
    anchor: { type: 'landmark' }, side: 1, dy: -44, stack: true,
  },
  {
    id: 'gains', name: 'Gains', stage: 6, sector: 'crypto', tag: 'Social gaming',
    desc: 'Gains is a social casino for adults in the United States, based in Miami. Its games are played with free Gold Coins for entertainment, with separate Sweeps Coins used for sweepstakes prizes, and no purchase is needed to play. Availability varies by state.',
    url: 'https://gains.com', logo: 'assets/logos/gains.png',
    anchor: { type: 'landmark' }, side: -1, dy: 24, mdy: -24, stack: true,
  },
];

// Sectors for the portfolio list on the closing screen, in display order. Each sector is a heading with
// its companies in rows beneath it, alphabetical from left to right.
export const SECTORS = [
  { id: 'ai', label: 'AI' },
  { id: 'space', label: 'Space & Defence' },
  { id: 'neuro', label: 'Neurotechnology' },
  { id: 'crypto', label: 'Crypto & Gaming' },
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
