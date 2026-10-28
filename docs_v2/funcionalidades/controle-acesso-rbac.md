# Manual Completo: Sistema de Controle de Acesso Baseado em Papéis (RBAC) e Segurança Industrial CCO

Este manual descreve a arquitetura, o funcionamento técnico, os fluxos de autenticação, as políticas de segurança e os controles de privilégios implementados no sistema **CCO SAMAE**.

---

## 1. Visão Geral da Arquitetura (Future-Proof)

O módulo de autenticação e controle de acesso foi construído de forma **desacoplada e modular** no diretório `src/`:
* **`src/authRepository.js`**: Camada de repositório abstrata responsável pela persistência durável via **IndexedDB** (`SamaeConfigDB`), gerenciamento de usuários, validação de senhas por Regex, política anti-força bruta e registro de auditoria.
* **`src/authUI.js`**: Camada de interface de autenticação (telas de login em tela cheia, modal de primeiro acesso, recuperação de senha e redefinição).
* **`src/rbac.js`**: Gerenciador de privilégios baseado em papéis (*Role-Based Access Control*), aplicando restrições automáticas na interface com base no perfil ativo.

---

## 2. Infraestrutura de Usuários Durável (IndexedDB)

O banco de dados local **`SamaeConfigDB`** gerencia a store `usuarios` e a store `auditoria`. Na primeira inicialização, o sistema autoinicializa dois usuários padrão de fábrica:
1. **Administrador (`admin.samae`)**
   * **Senha Inicial:** `Admin@2026`
   * **E-mail:** `samirtedesco2@gmail.com`
   * **Papel (Role):** `ADMIN`
2. **Operador de Plantão (`agent.samae`)**
   * **Senha Inicial:** `Agent@2026`
   * **E-mail:** `samirtedesco2@gmail.com`
   * **Papel (Role):** `Agent`

### Cadastro de Novos Usuários pelo ADMIN
Apenas usuários com o papel `ADMIN` podem cadastrar novos operadores. 
* A senha padrão gerada no cadastro é automaticamente o **primeiro nome do usuário em letras minúsculas** (ex: `carlos.silva` nasce com a senha `carlos`).
* O registro nasce com a flag **`primeiroAcesso: true`**, obrigando a alteração imediata no primeiro login.
* **Procedimento de Cadastro:** Atualmente, o cadastro é executado pelo Administrador logado através do **Console do Navegador (F12)** utilizando o repositório de autenticação:
  ```javascript
  await window.AuthRepository.cadastrarUsuario("admin.samae", "nome.sobrenome", "Agent");
  ```

---

## 3. Políticas de Segurança Industrial

### A. Política de Bloqueio por Força Bruta
* O sistema monitora as tentativas consecutivas de senha incorreta.
* A partir da **3ª tentativa falha**, a conta é automaticamente bloqueada (`bloqueado: true`).
* Mensagem exibida ao operador: *"Conta bloqueada por segurança após 3 tentativas incorretas. Utilize a redefinição por e-mail."*

### B. Validação Rigorosa de Complexidade de Senha (Regex)
Toda nova senha cadastrada (seja no primeiro acesso ou recuperação) deve atender obrigatoriamente à seguinte política de complexidade:
* **Mínimo de 8 caracteres.**
* Pelo menos **1 letra** (maiúscula ou minúscula).
* Pelo menos **1 número**.
* Pelo menos **1 caractere especial** (`@$!%*#?&`).
* *Regex de Validação:* `/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/`

### C. Trilha de Auditoria de Segurança (`samaeSecurityLog`)
Todas as ações críticas de segurança geram registros persistidos na store `auditoria` do IndexedDB e na variável global `window.samaeSecurityLog`:
* Eventos registrados: `LOGIN_SUCESSO`, `LOGIN_FALHOU`, `CONTA_BLOQUEADA_FORCA_BRUTA`, `SOLICITAR_RECUPERACAO`, `ATUALIZAR_SENHA`, `CADASTRAR_USUARIO`.
* Cada registro armazena `timestamp`, `usuario`, `acao` e `detalhes`.

---

## 4. Fluxos de Autenticação, Recuperação e Painel ADMIN

1. **Tela de Login:**
   * Overlay com imagem vetorial imponente de reservatório industrial em alta resolução convertida em Base64 (`btoa`), com desfoque atmosférico de fundo e vinheta noturna (`backdrop-filter: blur(14px)`).
   * Exigência obrigatória de login no carregamento inicial (`DOMContentLoaded`).
2. **Primeiro Acesso & Redefinição:**
   * Exibido quando `primeiroAcesso: true` ou `requerRedefinicao: true`. O operador insere a senha definitiva validada por complexidade estrita.
3. **Gerenciamento de Usuários (Painel ADMIN):**
   * Acessível exclusivamente para administradores através do botão dedicado **`#btn-gerenciar-usuarios`** no menu lateral do painel de configurações (`⚙️`).
   * Permite cadastrar novos operadores (`Agent`) ou administradores (`ADMIN`) informando obrigatoriamente o e-mail corporativo individual (sem geração automática de e-mail).
4. **Isolamento de Bancos IndexedDB:**
   * **`SamaeAuthDB` (Versão 1):** Gerencia exclusivamente as stores de `usuarios` e `auditoria`.
   * **`SamaeHandlesDB` (Versão 1):** Gerencia exclusivamente os *handles* de arquivos do File System Access API, eliminando qualquer conflito de versão (*VersionError*).

---

## 5. Parâmetros Globais Dedicados

* Acessíveis através do botão dedicado **`#btn-config-parametros-globais`** no painel de configurações, separados dos formulários individuais de reservatórios.
* Contém o **Formulário I** (Passagem de plantão, e-mails de destino e grade de Timers de disparos automáticos) e o **Formulário II** (E-mails da manutenção, logs de erro, SLA e Cron).

---

## 6. Travas de Privilégios na Interface (RBAC)

* **Perfil `AGENT` (Operador de Plantão):**
  * **Configurações:** Campos de parametrização, gerenciamento de usuários e parâmetros globais ocultos ou bloqueados.
  * **Engenharia:** Aba de relatórios históricos de SLA e auditoria oculta.
  * **Mural de Alertas:** O botão de reconhecimento (*ACK*) opera em modo de clique único com restrição de confirmação (`✓ Ciência Dada`).
* **Perfil `ADMIN` (Administrador):**
  * Acesso irrestrito a todas as configurações, cadastro de novos usuários com e-mail corporativo obrigatório, relatórios de engenharia, painéis de auditoria e ferramentas operacionais.
