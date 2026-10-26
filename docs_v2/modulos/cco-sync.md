# Módulo: ccoSync.js

O arquivo `src/ccoSync.js` é responsável por centralizar a lógica de sincronização em tempo real (CCO Sync), gerenciamento de janelas dedicadas e o modo CCO/Fullscreen.

## Responsabilidades e Funções
- **`inicializarCanal()`**:
  - Configura o `BroadcastChannel('samae_cco_link')`.
  - Sincroniza em tempo real ações de reconhecimento (`ACK_ALARM`) e revogação (`REVOKE_ACK`) entre diferentes abas e janelas do navegador.
- **`abrirMuralSingleton()`**:
  - Garante o comportamento de **janela singleton** para o Mural de Alarmes CCO (`ccoMuralWindow`).
  - Se a janela já estiver aberta, traz o foco para ela (`focus()`); caso contrário, abre nova janela em `?view=exceccoes` com dimensões otimizadas.
- **`inicializarModoCCO()`**:
  - Gerencia a transição para o Modo CCO / Telas Grandes (TV 55"), ativando a API de Tela Cheia (`requestFullscreen`) e ajustando a escala visual do aplicativo.
  - Suporta múltiplos seletores de acionamento (`#btn-modo-cco` no cabeçalho geral e `#btn-modo-cco-mural` no cabeçalho do mural), sincronizando automaticamente o estado visual, ícones e tooltips em todos os botões ativos.
