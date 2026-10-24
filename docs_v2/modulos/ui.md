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
- **Mural de Alertas Ativos (`renderizarDashboardExceccoes` e `obterReservatoriosComAlertaOuExcecao`)**:
  - Visão dedicada com cabeçalho compacto (`analysis-intro`) otimizado para salas de controle.
  - Filtros interativos por categoria (Totais, Críticos, Atenção, Inconsistentes) com contadores dinâmicos.
  - **Cabeçalho Compacto e Ergonômico**:
    - Botão Fechar minimalista sem borda (`✕`) posicionado de forma isolada e discreta no canto superior direito.
    - Barra de ferramentas operacional unificada com botões em formato de ícone quadrado (`btn-operacional-quadrado`): Alternância dinâmica entre Cards Visuais e Tabela Compacta (`btn-mural-view-toggle`), Modo CCO (`btn-modo-cco-mural`) e relógio vertical (`cco-clock-display` com data na linha superior e hora na inferior).
    - Barra de ferramentas de exportação semântica (`#cco-export-toolbar`) com rótulo "Relatórios & Exportação" e ações de cópia de plantão, CSV e HTML.
  - Suporte completo a navegação por teclado (`tabindex`, setas, `Enter`, `Espaço`).
