# Histórico de Melhorias - Sistema CCO SAMAE

Este documento registra o histórico cronológico de melhorias, refatorações e evoluções arquiteturais aplicadas ao sistema CCO SAMAE.

---

## 📅 Outubro de 2026

### 1. Autenticação Obrigatória no Carregamento Inicial
* **Data:** 27 de Outubro de 2026
* **Descrição:** Integração da verificação de sessão e exibição de login do `AuthUI` no evento `DOMContentLoaded` (`src/app.js`). O sistema agora exige autenticação por usuário e senha imediatamente ao abrir via Live Server, caso não exista sessão ativa no `localStorage`.

### 2. Isolamento de Bancos de Dados IndexedDB (`SamaeAuthDB` & `SamaeHandlesDB`)
* **Data:** 27 de Outubro de 2026
* **Descrição:** Resolução definitiva do erro `VersionError` e `NotFoundError` separando as responsabilidades de persistência em IndexedDB:
  - **`SamaeAuthDB`**: Banco exclusivo para autenticação, tabela de usuários e trilha de auditoria.
  - **`SamaeHandlesDB`**: Banco exclusivo para armazenamento de *handles* de arquivos do File System Access API.

### 3. Fundo Visual Imersivo de Reservatório Industrial (Base64 SVG)
* **Data:** 27 de Outubro de 2026
* **Descrição:** Substituição do fundo da tela de login por uma arte vetorial SVG em alta resolução codificada em Base64 (`btoa`), retratando uma estrutura monumental de reservatório industrial de concreto brutalista com desfoque atmosférico (`backdrop-filter: blur(14px)`) e vinheta noturna.

### 4. Painel ADMIN de Gerenciamento de Usuários
* **Data:** 27 de Outubro de 2026
* **Descrição:** Criação da interface dedicada de cadastro de novos usuários no painel de configurações (`#btn-gerenciar-usuarios`), acessível **exclusivamente para perfis ADMIN**. 
* **Regra de E-mail Obrigatório:** Remoção da geração automática de e-mail e imposição de obrigatoriedade de preenchimento do e-mail corporativo individual para cada operador cadastrado.

### 5. Seção Dedicada de Parâmetros Globais
* **Data:** 27 de Outubro de 2026
* **Descrição:** Extração dos parâmetros globais (Formulário I de plantão e Timers, Formulário II de manutenção e SLA) de dentro dos formulários individuais de reservatórios, criando uma aba e botão dedicados no menu lateral (`#btn-config-parametros-globais`) com persistência em `samai_global_config`.

### 6. Identificadores Semânticos e Robustez de Seletores
* **Data:** 27 de Outubro de 2026
* **Descrição:** Substituição de seletores numéricos frágeis baseados em ordem (`nth-child`) por IDs e atributos semânticos explícitos (`id="config-res-${chave}"`, `id="btn-gerenciar-usuarios"`, `id="btn-config-parametros-globais"`), garantindo endereçamento direto e imune a reordenações no DOM.

### 7. Sincronização Multi-Monitor CCO, Persistência Síncrona e Auditoria Unificada
* **Data:** 30 de Outubro de 2026
* **Descrição:** 
  - **Múltiplos Monitores CCO**: Restauração da abertura do Mural de Alarmes em janela separada otimizada (`window.open` em `?view=exceccoes`) com gerenciamento automático de ciclo de vida (`beforeunload` para fechar janelas filhas ao sair).
  - **Persistência Síncrona**: Utilização de `localStorage` síncrono e `StorageRepository` (IndexedDB) para garantir gravação instantânea de ACKs e incidentes sem perdas por fechamento rápido de janela.
  - **Sincronização em Tempo Real**: Propagação bidirecional via `BroadcastChannel` e eventos `storage`.
  - **Auditoria Unificada**: Integração completa das ações operacionais de ACK/revogação na trilha central de auditoria (`AuthRepository`), exibindo todos os eventos na tabela de **Logs de Auditoria & Sistema**.

---
*SAMAE - Centro de Controle Operacional (CCO)*
