// lighthouse.config.js
// Configuração de auditoria Lighthouse para Jungle Gaming NFT Marketplace
// Executa auditoria em página inicial e detalhe do NFT, desktop e mobile

const config = {
  // Cor: formato de relatório
  ci: {
    gather: {
      settings: {
        // Configurações de coleta
        chromeFlags: '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage',
      },
    },
    assert: {
      // Assertions (não falham o build, apenas relatam)
      assertions: {
        'performance': 'warn',
        'accessibility': 'warn',
        'best-practices': 'warn',
        'seo': 'warn',
        'pwa': 'off',
      },
    },
  },
  // Categorias a auditar
  passes: [
    {
      passName: 'defaultPass',
      // Geração de relatório
      record: true,
    },
  ],
  // Configurações de relatório
  report: {
    // Formato de relatório
    formats: ['json', 'html'],
    // Diretório de saída
    dir: 'lighthouse/report',
    // Nome do arquivo
    fileName: 'report',
  },
}

module.exports = config
