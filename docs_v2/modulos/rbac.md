# Módulo: rbac.js

O arquivo `src/rbac.js` implementa o motor de Controle de Acesso Baseado em Papéis (*Role-Based Access Control* - RBAC) no sistema **CCO SAMAE**.

## Responsabilidades
- **Verificação de Privilégios por Perfil**:
  - Distinção clara entre perfis de usuário: `ADMIN` e `Agent` (Operador de Plantão).
- **Aplicações de Restrições na Interface**:
  - Ocultação e desativação automática de elementos restritos a administradores (painel de configurações avançadas, botões de gerenciamento de usuários `#btn-gerenciar-usuarios`, parâmetros globais de engenharia e relatórios de auditoria) para operadores do tipo `Agent`.
- **Restrição de Ações Críticas**:
  - Garantia de que apenas o papel `ADMIN` possa executar operações sensíveis, como cadastro de novos usuários e alteração de parâmetros globais do sistema.
- **Moderação do Mural de Alertas**:
  - Restrição do reconhecimento de alarmes (`ACK`) para o formato adequado conforme as permissões do perfil ativo.

