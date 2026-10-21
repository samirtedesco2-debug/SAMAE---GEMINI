# Módulo: dados.js & Dados Históricos

O arquivo `src/dados.js` processa os dados operacionais e históricos localizados na pasta `dados_historicos/` e no índice temporal (`indice_datas.json`).

## Estrutura e Funcionalidades
- **Carregamento de Datas**: Lê o índice de datas disponíveis e os arquivos mensais (ex: `2026_03.json` até `2026_10.json`).
- **Indexação de Leituras**: Estrutura as leituras horárias de nível, vazão, vazão de entrada e horários.
- **Resumos Estatísticos**: Calcula mínimos, máximos, médias e qualidade das leituras (detecção de dados ausentes ou vazões negativas).
