// authRepository.js - Repositório desacoplado de Autenticação e Autorização (IndexedDB / RBAC / Auditoria)

const DB_NAME = "SamaeAuthDB";
const DB_VERSION = 1;

class AuthRepository {
  async abrirDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = async (event) => {
        const db = event.target.result;
        // Validação de segurança: se o banco abriu mas por algum motivo não tem o store "usuarios", recria o banco
        if (!db.objectStoreNames.contains("usuarios") || !db.objectStoreNames.contains("auditoria")) {
          db.close();
          const deleteReq = indexedDB.deleteDatabase(DB_NAME);
          deleteReq.onsuccess = () => {
            // Reabre após deletar
            const retryReq = indexedDB.open(DB_NAME, DB_VERSION);
            retryReq.onerror = () => reject(retryReq.error);
            retryReq.onsuccess = (e) => resolve(e.target.result);
            retryReq.onupgradeneeded = (ev) => {
              const newDb = ev.target.result;
              if (!newDb.objectStoreNames.contains("usuarios")) {
                const storeUsuarios = newDb.createObjectStore("usuarios", { keyPath: "username" });
                storeUsuarios.createIndex("email", "email", { unique: false });
              }
              if (!newDb.objectStoreNames.contains("auditoria")) {
                newDb.createObjectStore("auditoria", { keyPath: "id", autoIncrement: true });
              }
            };
          };
          deleteReq.onerror = () => reject(deleteReq.error);
          return;
        }
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("usuarios")) {
          const storeUsuarios = db.createObjectStore("usuarios", { keyPath: "username" });
          storeUsuarios.createIndex("email", "email", { unique: false });
        }
        if (!db.objectStoreNames.contains("auditoria")) {
          db.createObjectStore("auditoria", { keyPath: "id", autoIncrement: true });
        }
      };
    });
  }

  async inicializarDB() {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readwrite");
      const store = transaction.objectStore("usuarios");
      
      const countReq = store.count();
      countReq.onsuccess = async () => {
        if (countReq.result === 0) {
          const usuariosIniciais = [
            {
              username: "admin.samae",
              senha: "Admin@2026",
              email: "samirtedesco2@gmail.com",
              role: "ADMIN",
              primeiroAcesso: false,
              bloqueado: false,
              tentativasFalhas: 0,
              requerRedefinicao: false
            },
            {
              username: "agent.samae",
              senha: "Agent@2026",
              email: "samirtedesco2@gmail.com",
              role: "Agent",
              primeiroAcesso: false,
              bloqueado: false,
              tentativasFalhas: 0,
              requerRedefinicao: false
            }
          ];

          for (const u of usuariosIniciais) {
            store.put(u);
          }
        }
        resolve(true);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  async obterUsuario(username) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readonly");
      const store = transaction.objectStore("usuarios");
      const req = store.get(username);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async salvarUsuario(usuario) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readwrite");
      const store = transaction.objectStore("usuarios");
      const req = store.put(usuario);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async registrarAuditoria(acao, usuario, detalhes) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      usuario: usuario || "sistema",
      acao,
      detalhes
    };

    window.samaeSecurityLog = window.samaeSecurityLog || [];
    window.samaeSecurityLog.push(logEntry);

    try {
      const db = await this.abrirDB();
      const transaction = db.transaction("auditoria", "readwrite");
      const store = transaction.objectStore("auditoria");
      store.add(logEntry);
    } catch (e) {
      console.warn("Erro ao gravar auditoria no IndexedDB:", e);
    }
  }

  async autenticar(username, senha) {
    const user = await this.obterUsuario(username);
    if (!user) {
      await this.registrarAuditoria("LOGIN_FALHOU", username, "Usuário não encontrado");
      throw new Error("Usuário ou senha inválidos.");
    }

    if (user.bloqueado) {
      await this.registrarAuditoria("LOGIN_BLOQUEADO", username, "Tentativa de login em conta bloqueada");
      throw new Error("Conta bloqueada por segurança. Utilize a redefinição por e-mail.");
    }

    if (user.senha !== senha) {
      user.tentativasFalhas = (user.tentativasFalhas || 0) + 1;
      if (user.tentativasFalhas >= 3) {
        user.bloqueado = true;
        await this.salvarUsuario(user);
        await this.registrarAuditoria("CONTA_BLOQUEADA_FORCA_BRUTA", username, "Bloqueio automático após 3 falhas");
        throw new Error("Conta bloqueada por segurança após 3 tentativas incorretas. Utilize a redefinição por e-mail.");
      }
      await this.salvarUsuario(user);
      await this.registrarAuditoria("LOGIN_FALHOU", username, `Senha incorreta (tentativa ${user.tentativasFalhas}/3)`);
      throw new Error(`Usuário ou senha inválidos. Tentativa ${user.tentativasFalhas}/3.`);
    }

    // Sucesso na autenticação
    user.tentativasFalhas = 0;
    await this.salvarUsuario(user);
    await this.registrarAuditoria("LOGIN_SUCESSO", username, `Autenticação bem-sucedida (${user.role})`);
    return user;
  }

  async cadastrarUsuario(adminUsername, novoUsername, role = "Agent", email = "") {
    if (!email || !email.trim()) {
      throw new Error("O e-mail corporativo é obrigatório para cadastrar um novo usuário.");
    }
    const adminUser = await this.obterUsuario(adminUsername);
    if (!adminUser || adminUser.role !== "ADMIN") {
      throw new Error("Apenas administradores podem cadastrar novos usuários.");
    }

    const usuarioExistente = await this.obterUsuario(novoUsername);
    if (usuarioExistente) {
      throw new Error("Já existe um usuário cadastrado com este nome.");
    }

    const primeiroNome = novoUsername.trim().split(".")[0].toLowerCase();
    const novoUsuario = {
      username: novoUsername.trim(),
      senha: primeiroNome,
      email: email.trim(),
      role,
      primeiroAcesso: true,
      bloqueado: false,
      tentativasFalhas: 0,
      requerRedefinicao: false
    };

    await this.salvarUsuario(novoUsuario);
    await this.registrarAuditoria("CADASTRAR_USUARIO", adminUsername, `Criado usuário ${novoUsername.trim()} (${role}, e-mail: ${email.trim()})`);
    return novoUsuario;
  }

  async atualizarSenha(username, novaSenha) {
    // Validação de complexidade: mín 8 caracteres, 1 letra, 1 número, 1 caractere especial (@$!%*#?&)
    const regexComplexidade = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!regexComplexidade.test(novaSenha)) {
      throw new Error("A senha deve conter no mínimo 8 caracteres, incluindo pelo menos: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).");
    }

    const user = await this.obterUsuario(username);
    if (!user) throw new Error("Usuário não encontrado.");

    user.senha = novaSenha;
    user.primeiroAcesso = false;
    user.requerRedefinicao = false;
    user.bloqueado = false;
    user.tentativasFalhas = 0;

    await this.salvarUsuario(user);
    await this.registrarAuditoria("ATUALIZAR_SENHA", username, "Senha alterada com sucesso");
    return true;
  }

  async solicitarRecuperacao(email) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readonly");
      const store = transaction.objectStore("usuarios");
      const req = store.getAll();

      req.onsuccess = async () => {
        const usuarios = req.result || [];
        const user = usuarios.find(u => u.email === email);
        if (!user) {
          await this.registrarAuditoria("RECUPERACAO_FALHOU", email, "E-mail não cadastrado");
          return reject(new Error("E-mail não encontrado no sistema."));
        }

        user.requerRedefinicao = true;
        user.bloqueado = false;
        await this.salvarUsuario(user);
        await this.registrarAuditoria("SOLICITAR_RECUPERACAO", user.username, "Solicitação de redefinição de acesso por e-mail");

        const mailtoLink = `mailto:${user.email}?subject=Redefinição de Acesso - CCO SAMAE&body=Olá ${user.username}, clique no link para redefinir sua senha no sistema CCO SAMAE.`;
        resolve(mailtoLink);
      };
      req.onerror = () => reject(req.error);
    });
  }
}

window.AuthRepository = new AuthRepository();
