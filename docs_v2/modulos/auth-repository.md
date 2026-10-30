# Módulo: authRepository.js

O arquivo `src/authRepository.js` implementa a camada de repositório e persistência durável para autenticação, controle de usuários e auditoria de segurança no sistema **CCO SAMAE**.

## Responsabilidades
- **Gerenciamento de Bancos de Dados IndexedDB Isolados**:
  - **`SamaeAuthDB` (Versão 1)**: Banco de dados dedicado exclusivamente à autenticação, contendo a store `usuarios` e a store `auditoria`. Isso elimina completamente conflitos de versão (*VersionError* ou *NotFoundError*) com outros storages da aplicação.
  - **`SamaeHandlesDB` (Versão 1)**: Gerencia exclusivamente os *handles* de arquivos do File System Access API.
- **Autoinicialização de Usuários Padrão de Fábrica**:
  - `admin.samae` (`ADMIN` - Senha inicial: `Admin@2026`)
  - `agent.samae` (`Agent` - Senha inicial: `Agent@2026`)
- **Políticas de Segurança e Validação**:
  - Validação rigorosa de complexidade de senha via Regex (`/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/`).
  - Monitoramento de tentativas de login falhas com bloqueio automático de conta na 3ª tentativa consecutiva (`bloqueado: true`).
  - Geração de trilha de auditoria persistida na store `auditoria` do IndexedDB e na variável global `window.samaeSecurityLog`.
- **Gerenciamento de Sessão e Redefinição**:
  - Verificação de sessão ativa no `localStorage`.
  - Controle de flags `primeiroAcesso` e `requerRedefinicao`.
  - Funções para cadastro de novos usuários com e-mail corporativo obrigatório (exclusivo para `ADMIN`).

