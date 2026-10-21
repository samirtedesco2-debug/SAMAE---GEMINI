# Guia de Migração para Dados em Tempo Real

Este documento centraliza todas as observações, lembretes, melhorias e o checklist técnico para a transição do sistema de arquivos estáticos (`dados_historicos/`) e simulações para a telemetria em **tempo real** (via API REST ou WebSocket).

## 1. Checklist de Migração

- [ ] **Fonte de Dados (API / WebSocket)**: Substituir o carregamento estático dos arquivos JSON mensais (`dados_historicos/2026_XX.json`) por endpoints em tempo real ou streaming WebSocket fornecidos pelo CCO SAMAE.
- [ ] **Média Móvel (Filtro de Ruído)**:
  - *Estado Atual*: `janela = 1` (mantido temporariamente para dados simulados/históricos).
  - *Ação em Tempo Real*: Ajustar para `janela = 3` (ou conforme calibragem dos sensores físicos em campo) em `src/regrasNegocio.js` na função `calcularAutonomiaEProjecao`.
- [ ] **Vazão de Entrada (`vazaoEntrada`)**:
  - *Estado Atual*: Mapeado com fallback para `0` ou leitura opcional.
  - *Ação em Tempo Real*: Garantir que o payload do backend envie `reservatorio.leituras.vazaoEntrada` para alimentar o balanço hidráulico (*Net Flow*) de forma precisa.
- [ ] **Atualização Periódica (Polling / Push)**:
  - Configurar intervalo de atualização na interface (`app.js`) para refletir novas telemetrias sem necessitar de recarregamento manual da página.

## 2. Pontos de Código Marcados (`TODO: [TEMPO_REAL]`)
Procure por `TODO: [TEMPO_REAL]` no código-fonte (`src/regrasNegocio.js`, etc.) para localizar os pontos exatos de integração futura.
