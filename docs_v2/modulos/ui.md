# Módulo: ui.js

O arquivo `src/ui.js` é responsável por renderizar a interface de usuário (DOM).

## Componentes Principais
- **`criarPainelAutonomiaPreditiva`**: Renderiza o painel modal/expansível de autonomia preditiva contendo:
  - Card 1: Status do Reservatório (Nível atual, tendência, saldo última hora em vermelho se negativo via `--status-critical-color`).
  - Card 2: Balanço Hidráulico / Net Flow (Vazão de entrada, vazão de saída, vazão líquida em vermelho se positiva via `--status-critical-color`).
  - Card 3: Projeção & Autonomia (Horizontes de alerta baseados em tempo).
- Renderização de cartões de reservatórios na visão operacional.
- Tabelas e paginação na visão de engenharia e formulários na visão de parametrização.
