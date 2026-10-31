# Documentação Oficial - Sistema CCO SAMAE (Versão 2.0)

Bem-vindo à nova documentação oficial do **Sistema de Monitoramento e Autonomia Preditiva dos Reservatórios do SAMAE**.

Esta documentação foi estruturada em pastas e subpastas organizadas por áreas, mantendo a pasta antiga (`docs/`) preservada para fins históricos.

## Estrutura de Pastas e Módulos

1. **Arquitetura (`arquitetura/`)**:
   - [Visão Geral & Arquitetura](./arquitetura/visao-geral.md)
   - [Mapa Técnico do DOM (IDs e Classes)](./arquitetura/mapa-dom.md)
   - [Interface e Estilos (`index.html` & `styles.css`)](./arquitetura/estilos-interface.md)

2. **Módulos do Sistema (`modulos/`)**:
   - [Orquestrador Principal (`app.js`)](./modulos/app.md)
   - [Repositório de Autenticação & IndexedDB (`authRepository.js`)](./modulos/auth-repository.md)
   - [Interface de Autenticação & Login (`authUI.js`)](./modulos/auth-ui.md)
   - [Controle de Acesso Baseado em Papéis - RBAC (`rbac.js`)](./modulos/rbac.md)
   - [Sincronização e Janela CCO (`ccoSync.js`)](./modulos/cco-sync.md)
   - [Interface de Usuário (`ui.js`)](./modulos/ui.md)
   - [Regras de Negócio & Motor Preditivo (`regrasNegocio.js`)](./modulos/regras-negocio.md)
   - [Gráficos & Visualização (`graficos.js`)](./modulos/graficos.md)
   - [Processamento de Dados & Histórico (`dados.js`)](./modulos/dados.md)
   - [Cliente de API & Configurações (`apiClient.js`)](./modulos/api-client.md)

3. **Funcionalidades Operacionais (`funcionalidades/`)**:
   - [Controle de Acesso (RBAC) & Segurança Industrial](./funcionalidades/controle-acesso-rbac.md)
   - [Motor de Autonomia Preditiva e Balanço Hidráulico](./funcionalidades/motor-preditivo.md)
   - [Parametrização e Regras de Alarme](./funcionalidades/parametrizacao.md)
   - [Guia de Migração para Tempo Real](./funcionalidades/migracao-tempo-real.md)
   - [Possíveis Melhorias Futuras](./funcionalidades/possiveis-melhorias.md)

---
*SAMAE - Centro de Controle Operacional (CCO)*

