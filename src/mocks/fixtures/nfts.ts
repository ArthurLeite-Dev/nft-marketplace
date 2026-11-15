import type { DbNft, DbEdition } from '../db/types'

const ART_SEEDS = [
  { url: '/images/nfts/nft1.png', alt: 'Jaguar cibernético em neon sobre floresta', width: 800, height: 800 },
  { url: '/images/nfts/nft2.png', alt: 'Tigre pixelizado em tons de ouro', width: 800, height: 800 },
  { url: '/images/nfts/nft3.png', alt: 'Arara neon sobre copa dourada', width: 800, height: 800 },
  { url: '/images/nfts/nft4.png', alt: 'Sombra de onça na grove noturna', width: 800, height: 800 },
]

function edition(id: string, nftId: string, type: DbEdition['type'], label: string, priceEth: string, available: number | null, maxPerOrder: number, previousPriceEth?: string): DbEdition {
  return {
    id,
    nftId,
    type,
    label,
    priceEth,
    previousPriceEth,
    available,
    maxPerOrder,
    isSoldOut: available === 0,
  }
}

export const NFT_FIXTURES: DbNft[] = [
  {
    id: 'nft_01',
    name: 'Cyber Jaguar #01',
    collection: 'Jungle Warriors',
    network: 'Ethereum',
    priceEth: '1.50',
    artwork: ART_SEEDS[0]!,
    isRare: true,
    isNew: true,
    isTrending: true,
    defaultEditionId: 'ed_01_1',
    createdAt: '2026-10-01T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.1,
        count: 13
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_01_1', 'nft_01', 'unique_1_of_1', '1/1', '2.00', 1, 1),
      edition('ed_01_2', 'nft_01', 'limited_10', '1/10', '1.50', 8, 3),
      edition('ed_01_3', 'nft_01', 'open', 'Aberta', '1.20', null, 8),
    ],
  },
  {
    id: 'nft_02',
    name: 'Golden Tiger #02',
    collection: 'Cyber Safari',
    network: 'Polygon',
    priceEth: '0.85',
    artwork: ART_SEEDS[1]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_02_1',
    createdAt: '2026-10-02T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.2,
        count: 16
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_02_1', 'nft_02', 'limited_10', '1/10', '0.85', 5, 3),
      edition('ed_02_2', 'nft_02', 'open', 'Aberta', '0.60', null, 8),
    ],
  },
  {
    id: 'nft_03',
    name: 'Neon Macaw #03',
    collection: 'Neon Tropics',
    network: 'Ethereum',
    priceEth: '1.10',
    previousPriceEth: '1.30',
    artwork: ART_SEEDS[2]!,
    isRare: false,
    isNew: false,
    isTrending: true,
    defaultEditionId: 'ed_03_1',
    createdAt: '2026-10-03T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.3,
        count: 19
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_03_1', 'nft_03', 'limited_50', '1/50', '1.10', 12, 5),
      edition('ed_03_2', 'nft_03', 'open', 'Aberta', '0.90', null, 8),
    ],
  },
  {
    id: 'nft_04',
    name: 'Shadow Panther #04',
    collection: 'Shadow Grove',
    network: 'Base',
    priceEth: '0.40',
    artwork: ART_SEEDS[3]!,
    isRare: true,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_04_1',
    createdAt: '2026-10-04T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.4,
        count: 22
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_04_1', 'nft_04', 'unique_1_of_1', '1/1', '1.10', 1, 1),
      edition('ed_04_2', 'nft_04', 'limited_10', '1/10', '0.40', 0, 3),
    ],
  },
  {
    id: 'nft_05',
    name: 'Emerald Hive #05',
    collection: 'Emerald Hive',
    network: 'Ethereum',
    priceEth: '0.95',
    artwork: ART_SEEDS[4 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_05_1',
    createdAt: '2026-10-05T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.0,
        count: 25
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_05_1', 'nft_05', 'open', 'Aberta', '0.95', null, 8),
    ],
  },
  {
    id: 'nft_06',
    name: 'Desert Mirage #06',
    collection: 'Desert Mirage',
    network: 'Polygon',
    priceEth: '0.55',
    artwork: ART_SEEDS[5 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_06_1',
    createdAt: '2026-10-06T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.1,
        count: 28
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_06_1', 'nft_06', 'limited_10', '1/10', '0.55', 4, 3),
      edition('ed_06_2', 'nft_06', 'open', 'Aberta', '0.40', null, 8),
    ],
  },
  {
    id: 'nft_07',
    name: 'Frost Fox #07',
    collection: 'Frost Tundra',
    network: 'Base',
    priceEth: '0.70',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_07_1',
    createdAt: '2026-10-07T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.2,
        count: 31
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_07_1', 'nft_07', 'limited_50', '1/50', '0.70', 20, 5),
      edition('ed_07_2', 'nft_07', 'open', 'Aberta', '0.50', null, 8),
    ],
  },
  {
    id: 'nft_08',
    name: 'Neon Panther #08',
    collection: 'Jungle Warriors',
    network: 'Ethereum',
    priceEth: '1.80',
    previousPriceEth: '2.10',
    artwork: ART_SEEDS[7 % ART_SEEDS.length]!,
    isRare: true,
    isNew: false,
    isTrending: true,
    defaultEditionId: 'ed_08_1',
    createdAt: '2026-10-08T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.3,
        count: 34
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_08_1', 'nft_08', 'unique_1_of_1', '1/1', '3.00', 1, 1),
      edition('ed_08_2', 'nft_08', 'limited_10', '1/10', '1.80', 6, 3),
    ],
  },
  {
    id: 'nft_09',
    name: 'Canopy Jaguar #09',
    collection: 'Golden Canopy',
    network: 'Polygon',
    priceEth: '0.65',
    artwork: ART_SEEDS[0]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_09_1',
    createdAt: '2026-10-09T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.4,
        count: 37
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_09_1', 'nft_09', 'open', 'Aberta', '0.65', null, 8),
    ],
  },
  {
    id: 'nft_10',
    name: 'Pixel Lynx #10',
    collection: 'Pixel Fauna',
    network: 'Ethereum',
    priceEth: '0.30',
    artwork: ART_SEEDS[1]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_10_1',
    createdAt: '2026-10-10T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.0,
        count: 40
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_10_1', 'nft_10', 'limited_10', '1/10', '0.30', 3, 3),
      edition('ed_10_2', 'nft_10', 'open', 'Aberta', '0.22', null, 8),
    ],
  },
  {
    id: 'nft_11',
    name: 'Amber Owl #11',
    collection: 'Neon Tropics',
    network: 'Base',
    priceEth: '0.50',
    artwork: ART_SEEDS[2]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_11_1',
    createdAt: '2026-10-11T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.1,
        count: 43
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_11_1', 'nft_11', 'open', 'Aberta', '0.50', null, 8),
    ],
  },
  {
    id: 'nft_12',
    name: 'Midnight Boa #12',
    collection: 'Shadow Grove',
    network: 'Ethereum',
    priceEth: '1.25',
    previousPriceEth: '1.00',
    artwork: ART_SEEDS[3]!,
    isRare: true,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_12_1',
    createdAt: '2026-10-12T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.2,
        count: 46
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_12_1', 'nft_12', 'limited_50', '1/50', '1.25', 15, 5),
      edition('ed_12_2', 'nft_12', 'open', 'Aberta', '1.00', null, 8),
    ],
  },
  {
    id: 'nft_13',
    name: 'Sunset Tapir #13',
    collection: 'Desert Mirage',
    network: 'Polygon',
    priceEth: '0.45',
    artwork: ART_SEEDS[4 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_13_1',
    createdAt: '2026-10-13T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.3,
        count: 49
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_13_1', 'nft_13', 'limited_10', '1/10', '0.45', 2, 3),
      edition('ed_13_2', 'nft_13', 'open', 'Aberta', '0.35', null, 8),
    ],
  },
  {
    id: 'nft_14',
    name: 'Glacier Bear #14',
    collection: 'Frost Tundra',
    network: 'Base',
    priceEth: '0.90',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: true,
    defaultEditionId: 'ed_14_1',
    createdAt: '2026-10-14T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.4,
        count: 52
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_14_1', 'nft_14', 'open', 'Aberta', '0.90', null, 8),
    ],
  },
  {
    id: 'nft_15',
    name: 'Volt Iguana #15',
    collection: 'Cyber Safari',
    network: 'Ethereum',
    priceEth: '0.75',
    artwork: ART_SEEDS[1]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_15_1',
    createdAt: '2026-10-15T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.0,
        count: 55
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_15_1', 'nft_15', 'unique_1_of_1', '1/1', '1.50', 1, 1),
      edition('ed_15_2', 'nft_15', 'limited_10', '1/10', '0.75', 7, 3),
    ],
  },
  {
    id: 'nft_16',
    name: 'Jungle Ape #16',
    collection: 'Jungle Warriors',
    network: 'Polygon',
    priceEth: '1.05',
    artwork: ART_SEEDS[0]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_16_1',
    createdAt: '2026-10-16T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.1,
        count: 58
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_16_1', 'nft_16', 'open', 'Aberta', '1.05', null, 8),
    ],
  },
  {
    id: 'nft_17',
    name: 'Prism Frog #17',
    collection: 'Neon Tropics',
    network: 'Base',
    priceEth: '0.35',
    artwork: ART_SEEDS[2]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_17_1',
    createdAt: '2026-10-17T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.2,
        count: 61
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_17_1', 'nft_17', 'limited_10', '1/10', '0.35', 6, 3),
      edition('ed_17_2', 'nft_17', 'open', 'Aberta', '0.25', null, 8),
    ],
  },
  {
    id: 'nft_18',
    name: 'Obsidian Moth #18',
    collection: 'Shadow Grove',
    network: 'Ethereum',
    priceEth: '0.60',
    previousPriceEth: '0.70',
    artwork: ART_SEEDS[3]!,
    isRare: true,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_18_1',
    createdAt: '2026-10-18T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.3,
        count: 64
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_18_1', 'nft_18', 'limited_50', '1/50', '0.60', 25, 5),
      edition('ed_18_2', 'nft_18', 'open', 'Aberta', '0.50', null, 8),
    ],
  },
  {
    id: 'nft_19',
    name: 'Dune Fox #19',
    collection: 'Desert Mirage',
    network: 'Polygon',
    priceEth: '0.50',
    artwork: ART_SEEDS[4 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_19_1',
    createdAt: '2026-10-19T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.4,
        count: 67
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_19_1', 'nft_19', 'open', 'Aberta', '0.50', null, 8),
    ],
  },
  {
    id: 'nft_20',
    name: 'Aurora Wolf #20',
    collection: 'Frost Tundra',
    network: 'Base',
    priceEth: '1.30',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: true,
    isNew: true,
    isTrending: true,
    defaultEditionId: 'ed_20_1',
    createdAt: '2026-10-20T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.0,
        count: 70
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_20_1', 'nft_20', 'unique_1_of_1', '1/1', '2.50', 1, 1),
      edition('ed_20_2', 'nft_20', 'limited_10', '1/10', '1.30', 9, 3),
    ],
  },
  {
    id: 'nft_21',
    name: 'Chrome Rhino #21',
    collection: 'Cyber Safari',
    network: 'Ethereum',
    priceEth: '0.95',
    previousPriceEth: '1.10',
    artwork: ART_SEEDS[1]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_21_1',
    createdAt: '2026-10-21T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.1,
        count: 73
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_21_1', 'nft_21', 'limited_10', '1/10', '0.95', 4, 3),
      edition('ed_21_2', 'nft_21', 'open', 'Aberta', '0.75', null, 8),
    ],
  },
  {
    id: 'nft_22',
    name: 'Canopy Sloth #22',
    collection: 'Golden Canopy',
    network: 'Polygon',
    priceEth: '0.40',
    artwork: ART_SEEDS[0]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_22_1',
    createdAt: '2026-10-22T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.2,
        count: 76
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_22_1', 'nft_22', 'open', 'Aberta', '0.40', null, 8),
    ],
  },
  {
    id: 'nft_23',
    name: 'Voltage Bee #23',
    collection: 'Emerald Hive',
    network: 'Base',
    priceEth: '0.30',
    artwork: ART_SEEDS[4 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_23_1',
    createdAt: '2026-10-23T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.3,
        count: 79
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_23_1', 'nft_23', 'limited_10', '1/10', '0.30', 5, 3),
      edition('ed_23_2', 'nft_23', 'open', 'Aberta', '0.22', null, 8),
    ],
  },
  {
    id: 'nft_24',
    name: 'Glacier Lynx #24',
    collection: 'Frost Tundra',
    network: 'Ethereum',
    priceEth: '1.15',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_24_1',
    createdAt: '2026-10-24T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.4,
        count: 82
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_24_1', 'nft_24', 'limited_50', '1/50', '1.15', 18, 5),
      edition('ed_24_2', 'nft_24', 'open', 'Aberta', '0.95', null, 8),
    ],
  },
  {
    id: 'nft_25',
    name: 'Solar Iguana #25',
    collection: 'Desert Mirage',
    network: 'Polygon',
    priceEth: '0.55',
    previousPriceEth: '0.65',
    artwork: ART_SEEDS[5 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: true,
    defaultEditionId: 'ed_25_1',
    createdAt: '2026-10-25T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.0,
        count: 85
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_25_1', 'nft_25', 'open', 'Aberta', '0.55', null, 8),
    ],
  },
  {
    id: 'nft_26',
    name: 'Night Puma #26',
    collection: 'Shadow Grove',
    network: 'Base',
    priceEth: '0.80',
    artwork: ART_SEEDS[7 % ART_SEEDS.length]!,
    isRare: true,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_26_1',
    createdAt: '2026-10-26T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.1,
        count: 88
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_26_1', 'nft_26', 'unique_1_of_1', '1/1', '1.90', 1, 1),
      edition('ed_26_2', 'nft_26', 'limited_10', '1/10', '0.80', 3, 3),
    ],
  },
  {
    id: 'nft_27',
    name: 'Neon Toucan #27',
    collection: 'Neon Tropics',
    network: 'Ethereum',
    priceEth: '0.65',
    artwork: ART_SEEDS[2]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_27_1',
    createdAt: '2026-10-27T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.2,
        count: 91
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_27_1', 'nft_27', 'open', 'Aberta', '0.65', null, 8),
    ],
  },
  {
    id: 'nft_28',
    name: 'Frost Lynx #28',
    collection: 'Frost Tundra',
    network: 'Polygon',
    priceEth: '0.45',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_28_1',
    createdAt: '2026-10-28T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.3,
        count: 94
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_28_1', 'nft_28', 'limited_10', '1/10', '0.45', 1, 3),
      edition('ed_28_2', 'nft_28', 'open', 'Aberta', '0.33', null, 8),
    ],
  },
  {
    id: 'nft_29',
    name: 'Golden Boa #29',
    collection: 'Golden Canopy',
    network: 'Base',
    priceEth: '0.70',
    artwork: ART_SEEDS[0]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_29_1',
    createdAt: '2026-10-29T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.4,
        count: 97
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_29_1', 'nft_29', 'open', 'Aberta', '0.70', null, 8),
    ],
  },
  {
    id: 'nft_30',
    name: 'Pixel Panther #30',
    collection: 'Pixel Fauna',
    network: 'Ethereum',
    priceEth: '1.40',
    previousPriceEth: '1.60',
    artwork: ART_SEEDS[1]!,
    isRare: true,
    isNew: true,
    isTrending: true,
    defaultEditionId: 'ed_30_1',
    createdAt: '2026-10-30T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.0,
        count: 100
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_30_1', 'nft_30', 'unique_1_of_1', '1/1', '3.50', 1, 1),
      edition('ed_30_2', 'nft_30', 'limited_10', '1/10', '1.40', 10, 3),
    ],
  },
  {
    id: 'nft_31',
    name: 'Emerald Ape #31',
    collection: 'Emerald Hive',
    network: 'Polygon',
    priceEth: '0.50',
    artwork: ART_SEEDS[4 % ART_SEEDS.length]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_31_1',
    createdAt: '2026-10-31T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: false,
      },
      rating: {
        average: 4.1,
        count: 103
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_31_1', 'nft_31', 'limited_10', '1/10', '0.50', 8, 3),
      edition('ed_31_2', 'nft_31', 'open', 'Aberta', '0.38', null, 8),
    ],
  },
  {
    id: 'nft_32',
    name: 'Dune Moth #32',
    collection: 'Desert Mirage',
    network: 'Base',
    priceEth: '0.38',
    artwork: ART_SEEDS[5 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: false,
    defaultEditionId: 'ed_32_1',
    createdAt: '2026-11-01T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: true,
      },
      rating: {
        average: 4.2,
        count: 106
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_32_1', 'nft_32', 'open', 'Aberta', '0.38', null, 8),
    ],
  },
  {
    id: 'nft_33',
    name: 'Shadow Lynx #33',
    collection: 'Shadow Grove',
    network: 'Ethereum',
    priceEth: '0.85',
    artwork: ART_SEEDS[7 % ART_SEEDS.length]!,
    isRare: true,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_33_1',
    createdAt: '2026-11-02T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: false,
      },
      rating: {
        average: 4.3,
        count: 109
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_33_1', 'nft_33', 'limited_50', '1/50', '0.85', 22, 5),
      edition('ed_33_2', 'nft_33', 'open', 'Aberta', '0.70', null, 8),
    ],
  },
  {
    id: 'nft_34',
    name: 'Canopy Fox #34',
    collection: 'Golden Canopy',
    network: 'Polygon',
    priceEth: '0.48',
    artwork: ART_SEEDS[0]!,
    isRare: false,
    isNew: false,
    isTrending: false,
    defaultEditionId: 'ed_34_1',
    createdAt: '2026-11-03T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_2',
        name: 'Artista Jungle 2',
        verified: true,
      },
      rating: {
        average: 4.4,
        count: 112
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_34_1', 'nft_34', 'open', 'Aberta', '0.48', null, 8),
    ],
  },
  {
    id: 'nft_35',
    name: 'Glacier Owl #35',
    collection: 'Frost Tundra',
    network: 'Ethereum',
    priceEth: '0.92',
    artwork: ART_SEEDS[6 % ART_SEEDS.length]!,
    isRare: false,
    isNew: true,
    isTrending: true,
    defaultEditionId: 'ed_35_1',
    createdAt: '2026-11-04T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_3',
        name: 'Artista Jungle 3',
        verified: false,
      },
      rating: {
        average: 4.0,
        count: 115
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_35_1', 'nft_35', 'limited_10', '1/10', '0.92', 2, 3),
      edition('ed_35_2', 'nft_35', 'open', 'Aberta', '0.75', null, 8),
    ],
  },
  {
    id: 'nft_36',
    name: 'Neon Dragon #36',
    collection: 'Cyber Safari',
    network: 'Base',
    priceEth: '2.00',
    previousPriceEth: '2.50',
    artwork: ART_SEEDS[1]!,
    isRare: true,
    isNew: false,
    isTrending: true,
    defaultEditionId: 'ed_36_1',
    createdAt: '2026-11-05T00:00:00.000Z',
      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',
      creator: {
        id: 'creator_1',
        name: 'Artista Jungle 1',
        verified: true,
      },
      rating: {
        average: 4.1,
        count: 118
      },
      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],
    editions: [
      edition('ed_36_1', 'nft_36', 'unique_1_of_1', '1/1', '5.00', 1, 1),
      edition('ed_36_2', 'nft_36', 'limited_10', '1/10', '2.00', 11, 3),
    ],
  },
]

export const RELATED_BY_NFT: Record<string, string[]> = {
  nft_01: ['nft_08', 'nft_16', 'nft_26'],
  nft_02: ['nft_15', 'nft_21', 'nft_36'],
  nft_03: ['nft_11', 'nft_17', 'nft_27'],
  nft_04: ['nft_12', 'nft_18', 'nft_33'],
  nft_05: ['nft_23', 'nft_31'],
  nft_06: ['nft_13', 'nft_19', 'nft_25'],
  nft_07: ['nft_14', 'nft_24', 'nft_35'],
  nft_08: ['nft_01', 'nft_02', 'nft_36'],
  nft_09: ['nft_22', 'nft_29', 'nft_34'],
  nft_10: ['nft_17', 'nft_23', 'nft_31'],
  nft_11: ['nft_03', 'nft_27'],
  nft_12: ['nft_04', 'nft_18', 'nft_33'],
  nft_13: ['nft_06', 'nft_19', 'nft_25'],
  nft_14: ['nft_07', 'nft_24', 'nft_35'],
  nft_15: ['nft_02', 'nft_21', 'nft_36'],
  nft_16: ['nft_01', 'nft_09', 'nft_34'],
  nft_17: ['nft_03', 'nft_11', 'nft_27'],
  nft_18: ['nft_04', 'nft_12', 'nft_33'],
  nft_19: ['nft_06', 'nft_13', 'nft_25'],
  nft_20: ['nft_07', 'nft_14', 'nft_24'],
  nft_21: ['nft_02', 'nft_15', 'nft_36'],
  nft_22: ['nft_09', 'nft_29', 'nft_34'],
  nft_23: ['nft_05', 'nft_10', 'nft_31'],
  nft_24: ['nft_07', 'nft_14', 'nft_20'],
  nft_25: ['nft_06', 'nft_13', 'nft_19'],
  nft_26: ['nft_01', 'nft_08', 'nft_30'],
  nft_27: ['nft_03', 'nft_11', 'nft_17'],
  nft_28: ['nft_06', 'nft_19', 'nft_25'],
  nft_29: ['nft_09', 'nft_22', 'nft_34'],
  nft_30: ['nft_02', 'nft_08', 'nft_26'],
  nft_31: ['nft_05', 'nft_23'],
  nft_32: ['nft_19', 'nft_25', 'nft_28'],
  nft_33: ['nft_04', 'nft_12', 'nft_18'],
  nft_34: ['nft_09', 'nft_22', 'nft_29'],
  nft_35: ['nft_07', 'nft_14', 'nft_24'],
  nft_36: ['nft_02', 'nft_08', 'nft_15'],
}
