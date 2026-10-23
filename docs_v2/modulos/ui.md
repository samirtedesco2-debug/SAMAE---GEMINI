# Módulo: ui.js

O arquivo `src/ui.js` é responsável por renderizar a interface de usuário (DOM).

## Componentes Principais
- **`criarPainelAutonomiaPreditiva`**: Renderiza o painel modal/expansível de autonomia preditiva contendo:
  - Card 1: Status do Reservatório (Nível atual, tendência, saldo última hora em vermelho se negativo via `--status-critical-color`).
  - Card 2: Balanço Hidráulico / Net Flow (Vazão de entrada, vazão de saída, vazão líquida em vermelho se positiva via `--status-critical-color`).
  - Card 3: Projeção & Autonomia (Horizontes de alerta baseados em tempo).
- Renderização de cartões de reservatórios na visão operacional.
- Tabelas e paginação na visão de engenharia e formulários na visão de parametrização.
- **Aba de Registros Inconsistentes / Incompletos (`incompletos`)**:
  - Tratamento robusto e unificado para status `"Inconsistente"` e `"Sem Dados"`.
  - Classificação visual (`obterClasseStatus`) atribuindo classes adequadas (`status-sem-dados`) para leituras fora da faixa válida (0-110%) ou ausentes.
- **Mural de Alertas CCO (`renderizarDashboardExceccoes` e `obterReservatoriosComAlertaOuExcecao`)**:
  - Visão dedicada (fullscreen sem header principal) com relógio digital em tempo real.
  - Filtros interativos por categoria (Totais, Críticos, Atenção, Incompletos) com contadores dinâmicos.
  - Avaliação de nível e vazão baseada no momento atual (última leitura telemetrada).
  - Header enxuto de investigação (`atualizarHeaderEnxutoInvestigacao`) para visualização focada e botão de retorno rápido.
