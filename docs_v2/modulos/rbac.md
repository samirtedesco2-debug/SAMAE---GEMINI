# Módulo: rbac.js

O arquivo `src/rbac.js` implementa o motor de Controle de Acesso Baseado em Papéis (*Role-Based Access Control* - RBAC) no sistema **CCO SAMAE**.

## Responsabilidades
- **Leitura do perfil da sessão local**:
  - Distinção clara entre perfis de usuário: `ADMIN` e `Agent` (Operador de Plantão).
- **Aplicação de restrições de interface**:
  - Ocultação e desativação automática de elementos restritos a administradores (painel de configurações avançadas, botões de gerenciamento de usuários `#btn-gerenciar-usuarios`, parâmetros globais de engenharia e relatórios de auditoria) para operadores do tipo `Agent`.
- **Limite de segurança**:
  - As restrições são aplicadas no navegador. Sem um serviço de servidor que valide a sessão e as permissões, elas não garantem que ações ou dados estejam protegidos contra adulteração local.
- **Moderação do Mural de Alertas**:
  - O perfil `Agent` usa o fluxo de reconhecimento simplificado (`✓ Ciência Dada`); a interface permite revogação de ACK somente para `ADMIN`.
