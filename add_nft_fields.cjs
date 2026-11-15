const fs = require('fs');
let content = fs.readFileSync('src/mocks/fixtures/nfts.ts', 'utf8');

let count = 0;
content = content.replace(
  /(createdAt: '([^']+)',\n)(\s+editions: \[)/g,
  (match, createdAt, date, editions) => {
    count++;
    const n = count % 3 + 1;
    const verified = count % 2 === 0;
    const gallery = `      gallery: [
        { url: '/images/nfts/nft1.png', alt: 'Visão alternativa 1' },
        { url: '/images/nfts/nft2.png', alt: 'Visão alternativa 2' }
      ],\n`;
    const creator = `      creator: {
        id: 'creator_${n}',
        name: 'Artista Jungle ${n}',
        verified: ${verified},
      },\n`;
    const rating = `      rating: {
        average: 4.${count % 5},
        count: ${10 + count * 3}
      },\n`;
    const description = `      description: 'Obra exclusiva da coleção Jungle Gaming. Edição limitada com proveniência verificada.',\n`;
    return createdAt + description + creator + rating + gallery + editions;
  }
);

fs.writeFileSync('src/mocks/fixtures/nfts.ts', content);
console.log('Updated ' + count + ' NFT fixtures');
