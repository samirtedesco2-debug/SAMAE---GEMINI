# Visão Geral & Arquitetura

O sistema é uma aplicação web interativa desenvolvida em **Vanilla JavaScript**, estruturada em módulos independentes na pasta `src/`.

## Estrutura de Arquivos e Módulos (`src/`)

- **`apiClient.js`**: Gerencia chamadas e integração com fontes externas de dados.
- **`app.js`**: Ponto de entrada principal que orquestra a aplicação, tratamento global de erros, exportações e eventos de UI.
- **`authRepository.js`**: Camada de repositório e persistência durável via IndexedDB isolado (`SamaeAuthDB` & `SamaeHandlesDB`), gerenciamento de usuários e trilha de auditoria.
- **`authUI.js`**: Gerencia a interface de login em tela cheia (com fundo SVG Base64), modais de primeiro acesso e o painel ADMIN de gerenciamento de usuários.
- **`ccoSync.js`**: Sincronização em tempo real e gerenciamento de janela singleton (`ccoMuralWindow`) para o Mural de Alarmes CCO via `BroadcastChannel`.
- **`dados.js`**: Carrega e processa dados históricos e índices temporais (`indice_datas.json`).
- **`graficos.js`**: Integração com Chart.js para renderização de gráficos analíticos e de engenharia.
- **`rbac.js`**: Motor de Controle de Acesso Baseado em Papéis (*Role-Based Access Control*), aplicando restrições dinâmicas na interface para perfis `ADMIN` e `Agent`.
- **`regrasNegocio.js`**: Concentra toda a lógica operacional, cálculos de média móvel, balanço hidráulico e autonomia preditiva.
- **`ui.js`**: Responsável pela renderização de componentes de interface, cartões de reservatórios e painéis preditivos.

## Princípios de Projeto
- **Modularidade**: Regras de negócio estritamente separadas da interface de usuário e camadas de autenticação.
- **Resiliência**: Fallback automático para modo somente nível quando dados de vazão estiverem ausentes e isolamento robusto de bancos IndexedDB.
- **Estética & Usabilidade**: Padrão visual moderno com suporte a temas, telas grandes (TV 55") e indicadores codificados por cores intuitivas.

