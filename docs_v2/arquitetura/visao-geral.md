# Visão Geral & Arquitetura

O sistema é uma aplicação web interativa desenvolvida em **Vanilla JavaScript**, estruturada em módulos independentes na pasta `src/`.

## Estrutura de Arquivos e Módulos (`src/`)

- **`apiClient.js`**: Gerencia chamadas e integração com fontes externas de dados.
- **`dados.js`**: Carrega e processa dados históricos e índices temporais (`indice_datas.json`).
- **`regrasNegocio.js`**: Concentra toda a lógica operacional, cálculos de média móvel, balanço hidráulico e autonomia preditiva.
- **`graficos.js`**: Integração com Chart.js para renderização de gráficos analíticos e de engenharia.
- **`ui.js`**: Responsável pela renderização de componentes de interface e painéis preditivos.
- **`app.js`**: Ponto de entrada principal que orquestra a aplicação e eventos de UI.

## Princípios de Projeto
- **Modularidade**: Regras de negócio estritamente separadas da interface de usuário.
- **Resiliência**: Fallback automático para modo somente nível quando dados de vazão estiverem ausentes.
- **Estética & Usabilidade**: Padrão visual moderno com suporte a temas e indicadores codificados por cores intuitivas.
