/**
 * scripts/lighthouse.mjs
 * Auditoria de performance Lighthouse para Jungle Gaming NFT Marketplace
 *
 * Executa auditoria em:
 * - Página inicial (/)
 * - Detalhe do NFT (/nft/nft_01)
 * - Perfis: desktop e mobile
 * - Três medições por página/perfil, reporta mediana
 *
 * Metrics relatadas: LCP, CLS, TBT, FCP, SI
 * Categorias: Performance, Accessibility, Best Practices, SEO
 * Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const PROJECT_ROOT = process.cwd()
const PREVIEW_PORT = 4176
const REPORT_DIR = path.join(PROJECT_ROOT, 'lighthouse', 'report')
const URLS = [
  { name: 'home', url: `http://localhost:${PREVIEW_PORT}/` },
  { name: 'nft-detail', url: `http://localhost:${PREVIEW_PORT}/nft/nft_01` },
]
const PROFILES = [
  { name: 'desktop', preset: 'desktop' },
  { name: 'mobile', preset: 'mobile' },
]
const MEASUREMENTS_PER_PAGE = 3

// Metas de auditoria
const THRESHOLDS = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}

async function runLighthouse(url, preset) {
  const reportPath = path.join(REPORT_DIR, `lighthouse-${url.replace(/[^a-z0-9]/gi, '-')}-${preset}.json`)

  const cmd = `npx lighthouse "${url}" --preset=${preset} --output=json --output-path="${reportPath}" --chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage"`

  try {
    execSync(cmd, { stdio: 'pipe', cwd: PROJECT_ROOT, timeout: 120000 })
  } catch (err) {
    // Lighthouse exits with non-zero code when there are audit failures,
    // but the report is still generated
  }

  // Read the report
  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  return reportData
}

async function runAudit() {
  console.log('🚀 Iniciando auditoria Lighthouse')
  console.log('=' .repeat(60))

  // Verificar se o build existe
  const fs = await import('fs')
  const path = await import('path')
  const distDir = path.join(PROJECT_ROOT, 'dist')
  if (!fs.existsSync(distDir)) {
    console.log('⚠️  Build não encontrado. Execute "npm run build" primeiro.')
    process.exit(1)
  }

  // Verificar se o servidor de preview está rodando
  console.log('\n🖥️ Verificando servidor de preview em http://localhost:' + PREVIEW_PORT + '/...')
  try {
    const res = await fetch(`http://localhost:${PREVIEW_PORT}/`)
    if (!res.ok) {
      throw new Error(`Servidor respondeu com status ${res.status}`)
    }
    console.log('✓ Servidor de preview está rodando')
  } catch (err) {
    console.log('⚠️  Servidor de preview não está rodando.')
    console.log('   Inicie-o com: npm run preview -- --port ' + PREVIEW_PORT)
    console.log('   E então rode novamente: npm run lighthouse')
    process.exit(1)
  }

  // Criar diretório de relatórios
  fs.mkdirSync(REPORT_DIR, { recursive: true })

  const allResults = []

  for (const urlInfo of URLS) {
    console.log(`\n📊 Auditando ${urlInfo.name} (${urlInfo.url})`)

    for (const profile of PROFILES) {
      console.log(`  📱 Perfil: ${profile.name}`)

      const measurements = []

      for (let i = 0; i < MEASUREMENTS_PER_PAGE; i++) {
        console.log(`    Medição ${i + 1}/${MEASUREMENTS_PER_PAGE}...`)

        let result
        try {
          result = await runLighthouse(urlInfo.url, profile.preset, i + 1)
        } catch (err) {
          console.log(`      Erro na medição ${i + 1}: ${err.message}`)
          continue
        }

        const categories = result.categories

        const measurement = {
          measurement: i + 1,
          profile: profile.name,
          url: urlInfo.url,
          categories: {
            performance: categories.performance?.score * 100 || 0,
            accessibility: categories.accessibility?.score * 100 || 0,
            'best-practices': categories['best-practices']?.score * 100 || 0,
            seo: categories.seo?.score * 100 || 0,
          },
          metrics: {
            lcp: result.audits['largest-contentful-paint']?.numericValue || 0,
            cls: result.audits['cumulative-layout-shift']?.numericValue || 0,
            tbt: result.audits['total-blocking-time']?.numericValue || 0,
            fcp: result.audits['first-contentful-paint']?.numericValue || 0,
            si: result.audits['speed-index']?.numericValue || 0,
          },
          timestamp: new Date().toISOString(),
        }

        measurements.push(measurement)

        console.log(`      Performance: ${measurement.categories.performance.toFixed(1)}`)
        console.log(`      Accessibility: ${measurement.categories.accessibility.toFixed(1)}`)
        console.log(`      Best Practices: ${measurement.categories['best-practices'].toFixed(1)}`)
        console.log(`      SEO: ${measurement.categories.seo.toFixed(1)}`)
        console.log(`      LCP: ${measurement.metrics.lcp.toFixed(0)}ms`)
        console.log(`      CLS: ${measurement.metrics.cls.toFixed(3)}`)
        console.log(`      TBT: ${measurement.metrics.tbt.toFixed(0)}ms`)
      }

      // Calcular mediana de cada métrica
      if (measurements.length === 0) {
        console.log(`    Nenhuma medição bem-sucedida para ${profile.name}`)
        continue
      }

      const medianMeasurement = {
        ...measurements[0],
        categories: {},
        metrics: {},
      }

      for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
        const values = measurements.map(m => m.categories[category]).sort((a, b) => a - b)
        medianMeasurement.categories[category] = values[Math.floor(values.length / 2)]
      }

      for (const metric of ['lcp', 'cls', 'tbt', 'fcp', 'si']) {
        const values = measurements.map(m => m.metrics[metric]).sort((a, b) => a - b)
        medianMeasurement.metrics[metric] = values[Math.floor(values.length / 2)]
      }

      allResults.push({
        url: urlInfo.url,
        name: urlInfo.name,
        profile: profile.name,
        measurements,
        median: medianMeasurement,
      })

      console.log(`\n  📊 Mediana (${profile.name}):`)
      console.log(`    Performance: ${medianMeasurement.categories.performance.toFixed(1)}`)
      console.log(`    Accessibility: ${medianMeasurement.categories.accessibility.toFixed(1)}`)
      console.log(`    Best Practices: ${medianMeasurement.categories['best-practices'].toFixed(1)}`)
      console.log(`    SEO: ${medianMeasurement.categories.seo.toFixed(1)}`)
      console.log(`    LCP: ${medianMeasurement.metrics.lcp.toFixed(0)}ms`)
      console.log(`    CLS: ${medianMeasurement.metrics.cls.toFixed(3)}`)
      console.log(`    TBT: ${medianMeasurement.metrics.tbt.toFixed(0)}ms`)
      console.log(`    FCP: ${medianMeasurement.metrics.fcp.toFixed(0)}ms`)
      console.log(`    SI: ${medianMeasurement.metrics.si.toFixed(0)}ms`)
    }
  }

  // Gerar relatórios HTML e JSON
  // Ambiente e condições de execução (exigidos pelo desafio junto com os relatórios).
  const os = await import('os')
  let lighthouseVersion = 'desconhecida'
  try {
    lighthouseVersion = execSync('npx lighthouse --version', { cwd: PROJECT_ROOT, stdio: 'pipe' }).toString().trim()
  } catch {
    // mantém "desconhecida"
  }
  const reportData = {
    generatedAt: new Date().toISOString(),
    thresholds: THRESHOLDS,
    environment: {
      node: process.version,
      lighthouse: lighthouseVersion,
      platform: `${os.platform()} ${os.release()} (${os.arch()})`,
      cpus: os.cpus().length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      chromeFlags: '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
      throttling: 'padrão do Lighthouse para cada preset (desktop / mobile Moto G Power emulado)',
      build: 'vite build + vite preview (build otimizado, cenário padrão dos mocks)',
      measurementsPerPageAndProfile: MEASUREMENTS_PER_PAGE,
      aggregate: 'mediana',
    },
    results: allResults,
  }

  // Salvar JSON
  const jsonPath = path.join(REPORT_DIR, 'lighthouse-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2))
  console.log(`\n📄 Relatório JSON salvo: ${jsonPath}`)

  // Salvar HTML
  const htmlPath = path.join(REPORT_DIR, 'lighthouse-report.html')
  const htmlContent = generateHtmlReport(reportData)
  fs.writeFileSync(htmlPath, htmlContent)
  console.log(`📄 Relatório HTML salvo: ${htmlPath}`)

  // Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA AUDITORIA LIGHTHOUSE')
  console.log('='.repeat(60))

  for (const result of allResults) {
    console.log(`\n${result.name} (${result.profile}):`)
    console.log(`  Performance: ${result.median.categories.performance.toFixed(1)} ${result.median.categories.performance >= THRESHOLDS.performance ? '✓' : '✗'}`)
    console.log(`    Accessibility: ${result.median.categories.accessibility.toFixed(1)} ${result.median.categories.accessibility >= THRESHOLDS.accessibility ? '✓' : '✗'}`)
    console.log(`    Best Practices: ${result.median.categories['best-practices'].toFixed(1)} ${result.median.categories['best-practices'] >= THRESHOLDS['best-practices'] ? '✓' : '✗'}`)
    console.log(`    SEO: ${result.median.categories.seo.toFixed(1)} ${result.median.categories.seo >= THRESHOLDS.seo ? '✓' : '✗'}`)
  }

  console.log('\n✓ Auditoria concluída!')
}

function generateHtmlReport(reportData) {
  const { results } = reportData

  let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse Audit Report - Jungle Gaming NFT Marketplace</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
    h2 { color: #1a1a1a; margin-top: 30px; }
    h3 { color: #333; margin-top: 20px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-value { font-size: 32px; font-weight: bold; color: #1a1a1a; }
    .metric-label { font-size: 14px; color: #666; text-transform: uppercase; }
    .status-pass { color: #22c55e; }
    .status-fail { color: #ef4444; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th { background: #1a1a1a; color: white; padding: 12px; text-align: left; }
    .table td { padding: 8px; border-bottom: 1px solid #ddd; }
    .result-card { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; overflow: hidden; }
    .result-header { background: #f5f5f5; padding: 16px 20px; font-weight: bold; border-bottom: 1px solid #ddd; }
    .result-body { padding: 20px; }
    .metrics-table { width: 100%; }
    .metrics-table th { background: #f5f5f5; padding: 8px; text-align: left; }
    .metrics-table td { padding: 8px; border-bottom: 1px solid #eee; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Lighthouse Audit Report - Jungle Gaming NFT Marketplace</h1>
    <p>Gerado em: ${new Date(reportData.generatedAt).toLocaleString('pt-BR')}</p>
    <p>Limiares: Performance ≥ ${reportData.thresholds.performance}, Accessibility ≥ ${reportData.thresholds.accessibility}, Best Practices ≥ ${reportData.thresholds['best-practices']}, SEO ≥ ${reportData.thresholds.seo}</p>

    ${results.map(result => `
      <div class="result-card">
        <div class="result-header">
          ${result.name.charAt(0).toUpperCase() + result.name.slice(1)} (${result.profile})
        </div>
        <div class="result-body">
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value ${result.median.categories.performance >= reportData.thresholds.performance ? 'status-pass' : 'status-fail'}">${result.median.categories.performance.toFixed(1)}</div>
              <div class="metric-label">Performance</div>
            </div>
            <div class="metric-card">
              <div class="metric-value ${result.median.categories.accessibility >= reportData.thresholds.accessibility ? 'status-pass' : 'status-fail'}">${result.median.categories.accessibility.toFixed(1)}</div>
              <div class="metric-label">Accessibility</div>
            </div>
            <div class="metric-card">
              <div class="metric-value ${result.median.categories['best-practices'] >= reportData.thresholds['best-practices'] ? 'status-pass' : 'status-fail'}">${result.median.categories['best-practices'].toFixed(1)}</div>
              <div class="metric-label">Best Practices</div>
            </div>
            <div class="metric-card">
              <div class="metric-value ${result.median.categories.seo >= reportData.thresholds.seo ? 'status-pass' : 'status-fail'}">${result.median.categories.seo.toFixed(1)}</div>
              <div class="metric-label">SEO</div>
            </div>
          </div>
          <table class="metrics-table">
            <tr><th>Métrica</th><th>Valor</th></tr>
            <tr><td>LCP</td><td>${result.median.metrics.lcp.toFixed(0)} ms</td></tr>
            <tr><td>CLS</td><td>${result.median.metrics.cls.toFixed(3)}</td></tr>
            <tr><td>TBT</td><td>${result.median.metrics.tbt.toFixed(0)} ms</td></tr>
            <tr><td>FCP</td><td>${result.median.metrics.fcp.toFixed(0)} ms</td></tr>
            <tr><td>SI</td><td>${result.median.metrics.si.toFixed(0)} ms</td></tr>
          </table>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `

  return html
}

runAudit().catch((error) => {
  console.error('Erro na auditoria:', error)
  process.exit(1)
})