# Módulo: authUI.js

O arquivo `src/authUI.js` gerencia a interface de usuário relacionada à autenticação e controle de acesso no sistema **CCO SAMAE**.

## Responsabilidades
- **Renderização da Tela de Login em Tela Cheia**:
  - Overlay imersivo com fundo visual vetorial SVG em alta resolução codificado em Base64 (`btoa`), retratando uma estrutura de reservatório industrial de concreto brutalista com desfoque atmosférico (`backdrop-filter: blur(14px)`) e vinheta noturna.
  - Formulário de credenciais com validação em tempo real e feedback visual de erros.
- **Modais de Redefinição e Primeiro Acesso**:
  - Exibição automática do modal de troca de senha obrigatória quando a flag `primeiroAcesso` ou `requerRedefinicao` está ativa.
  - Validação estrita de complexidade de senha na UI.
- **Painel ADMIN de Gerenciamento de Usuários**:
  - Interface dedicada acessível através do botão `#btn-gerenciar-usuarios` no painel de configurações (disponível exclusivamente para perfis `ADMIN`).
  - Formulário de cadastro de novos operadores exigindo obrigatoriamente o e-mail corporativo individual.
- **Integração com o Fluxo de Inicialização**:
  - Acionamento imediato no evento `DOMContentLoaded` (`src/app.js`) para garantir que nenhuma tela operacional seja acessada sem autenticação prévia.

