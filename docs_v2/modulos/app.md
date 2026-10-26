# Módulo: app.js

O arquivo `src/app.js` atua como o **controlador principal (orquestrador)** da aplicação.

## Responsabilidades
- Inicialização da aplicação ao carregar a página e verificação de query parameters (`?view=exceccoes`).
- **Integração com Módulo CCO Sync (`src/ccoSync.js`)**:
  - Delegação da inicialização do `BroadcastChannel('samae_cco_link')` e do modo CCO/Fullscreen.
  - Gerenciamento de Janela Singleton (`ccoMuralWindow`) para o Mural de Alarmes CCO.
- **Central de Notificações Externa**:
  - Popover dedicado (`#btn-notificacoes`) transformado em feed de avisos e notificações externas/sistêmicas (separado dos logs internos de ACK).
  - Suporte a categorias operacionais: `UPDATE` (atualizações de sistema), `MAINTENANCE` (manutenção de sensores), `ANNOUNCE` (comunicados da engenharia/criador) e `SYSTEM` (infraestrutura SCADA/WebSocket).
  - Persistência em `localStorage` (chave `samai_cco_external_notifications`) e ações rápidas ("Marcar todas como lidas", contagem de não lidas com badge dinâmico).
- **Tratamento Global de Erros**:
  - Ouvinte global `unhandledrejection` para interceptação e registro de exceções assíncronas não tratadas.
- **Escala para Telas Grandes (TV 55")**:
  - Injeção da propriedade `data-view-scale="large-tv"` no `body` ao entrar em tela cheia/modo CCO para dimensionamento proporcional de fontes, cards e elementos.
- **Central de Exportação Manual Multiformato**:
  - Resumo de Passagem de Plantão textual com extração de TAGs curtas via Regex e diagnósticos entre colchetes.
  - Exportação para Excel/CSV com delimitador ponto e vírgula (`;`) e injeção do caractere `\uFEFF` (BOM UTF-8) para abertura correta no Microsoft Excel.
  - Geração e download de Relatório HTML independente com estilos embutidos e tabelas de ocorrências.
- **Parametrização Bilateral e Master Sidebar**:
  - Filtros em cascata com busca em tempo real (`oninput`) para TAGs e dropdown de Grupos Hidráulicos.
  - Gerenciamento bilateral independente para Formulário I (Plantão) e Formulário II (Log de Erros e SLA Técnico).
- Gerenciamento de eventos de navegação entre abas (Visão Operacional, Analítica, Engenharia, Configurações, Mural de Alarmes CCO).
- Sincronização de seletores de grupo, reservatório e data.
- Inicialização do sistema de alarmes CCO e atualização periódica.

