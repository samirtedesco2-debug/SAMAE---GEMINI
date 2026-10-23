# Módulo: app.js

O arquivo `src/app.js` atua como o **controlador principal (orquestrador)** da aplicação.

## Responsabilidades
- Inicialização da aplicação ao carregar a página e verificação de query parameters (`?view=exceccoes`).
- **Arquitetura Reativa de 2 Telas ("Mente Unida")**:
  - Instanciação do canal global `BroadcastChannel('samae_cco_link')`.
  - Sincronização reativa instantânea de ações de reconhecimento de alarmes (`ACK_ALARM`, `REVOKE_ACK`) entre janelas operacionais e mural de exceções.
  - Suporte a disparo em janela separada via `window.open('?view=exceccoes')` ao acionar modo CCO.
- **Escala para Telas Grandes (TV 55")**:
  - Injeção da propriedade `data-view-scale="large-tv"` no `body` ao entrar em tela cheia/modo CCO para dimensionamento proporcional de fontes, cards e elementos.
- **Central de Exportação Manual Multiformato**:
  - Resumo de Passagem de Plantão textual com extração de TAGs curtas via Regex e diagnósticos entre colchetes.
  - Exportação para Excel/CSV com delimitador ponto e vírgula (`;`) e injeção do caractere `\uFEFF` (BOM UTF-8) para abertura correta no Microsoft Excel.
  - Geração e download de Relatório HTML independente com estilos embutidos e tabelas de ocorrências.
- **Parametrização Bilateral e Master Sidebar**:
  - Filtros em cascata com busca em tempo real (`oninput`) para TAGs e dropdown de Grupos Hidráulicos.
  - Gerenciamento bilateral independente para Formulário I (Plantão) e Formulário II (Log de Erros e SLA Técnico).
- Gerenciamento de eventos de navegação entre abas (Visão Operacional, Analítica, Engenharia, Configurações, Alertas CCO).
- Sincronização de seletores de grupo, reservatório e data.
- Inicialização do sistema de alarmes CCO e atualização periódica.

