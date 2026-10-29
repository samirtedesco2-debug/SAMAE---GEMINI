// authUI.js - Interface de Autenticação, Login, Primeiro Acesso e Recuperação de Senha (CCO SAMAE)

class AuthUI {
  _obterOuCriarOverlay() {
    let overlay = document.getElementById("samae-auth-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "samae-auth-overlay";
      document.body.appendChild(overlay);
    }

    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: 
        linear-gradient(rgba(3, 7, 18, 0.65), rgba(3, 7, 18, 0.85)),
        url("manual-imagens/login.jfif");
      background-size: cover;
      background-position: center;
      backdrop-filter: blur(4px);
      display: flex; justify-content: center; align-items: center; z-index: 99999;
      font-family: inherit; color: #fff;
    `;
    return overlay;
  }

  async verificarSessaoOuExibirLogin() {
    await window.AuthRepository.inicializarDB();

    const sessaoStr = localStorage.getItem("samae_cco_session");
    if (sessaoStr) {
      try {
        const sessao = JSON.parse(sessaoStr);
        const user = await window.AuthRepository.obterUsuario(sessao.username);
        if (user && !user.bloqueado) {
          if (user.primeiroAcesso) {
            this.exibirModalPrimeiroAcesso(user);
            return;
          }
          if (user.requerRedefinicao) {
            this.exibirModalNovaSenha(user);
            return;
          }
          window.RBACManager.aplicarPermissoes();
          return;
        }
      } catch (e) {
        localStorage.removeItem("samae_cco_session");
      }
    }

    this.exibirTelaLogin();
  }

  exibirTelaLogin() {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.6rem; font-weight: 700;">Acesso ao Sistema</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Insira suas credenciais para continuar</p>
        </div>

        <form id="samae-login-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Usuário</label>
            <input type="text" id="login-username" required placeholder="Ex: admin.samae" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Senha</label>
            <input type="password" id="login-password" required placeholder="••••••••" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
          </div>

          <div id="login-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          " onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'">
            Entrar
          </button>
        </form>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <a href="#" id="link-esqueceu-senha" style="color: #38bdf8; text-decoration: none; font-weight: 600;">Esqueceu a senha?</a>
          <span style="color: #64748b; font-size: 0.75rem;">Segurança Industrial</span>
        </div>
      </div>
    `;

    document.getElementById("samae-login-form").onsubmit = async (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      const errEl = document.getElementById("login-error-msg");
      errEl.style.display = "none";

      try {
        const user = await window.AuthRepository.autenticar(u, p);
        if (user.primeiroAcesso) {
          this.exibirModalPrimeiroAcesso(user);
          return;
        }
        if (user.requerRedefinicao) {
          this.exibirModalNovaSenha(user);
          return;
        }

        localStorage.setItem("samae_cco_session", JSON.stringify({ username: user.username, role: user.role }));
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };

    document.getElementById("link-esqueceu-senha").onclick = (e) => {
      e.preventDefault();
      this.exibirModalRecuperacao();
    };
  }

  exibirModalPrimeiroAcesso(user) {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Primeiro Acesso</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Olá ${user.username}, defina sua senha definitiva.</p>
        </div>

        <form id="samae-primeiro-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Nova Senha Definitiva</label>
            <input type="password" id="primeiro-nova-senha" required placeholder="••••••••" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
            <span style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 2px;">
              Mínimo de 8 caracteres, incluindo: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).
            </span>
          </div>

          <div id="primeiro-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          ">
            Salvar e Continuar
          </button>
        </form>
      </div>
    `;

    document.getElementById("samae-primeiro-form").onsubmit = async (e) => {
      e.preventDefault();
      const novaSenha = document.getElementById("primeiro-nova-senha").value;
      const errEl = document.getElementById("primeiro-error-msg");
      errEl.style.display = "none";

      try {
        await window.AuthRepository.atualizarSenha(user.username, novaSenha);
        localStorage.setItem("samae_cco_session", JSON.stringify({ username: user.username, role: user.role }));
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };
  }

  exibirModalRecuperacao() {
    const overlay = this._obterOuCriarOverlay();
    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Recuperação de Acesso</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Informe seu e-mail corporativo cadastrado.</p>
        </div>

        <form id="samae-recup-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">E-mail Corporativo</label>
            <input type="email" id="recup-email" required placeholder="ex: samirtedesco2@gmail.com" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
          </div>

          <div id="recup-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          ">
            Solicitar Redefinição
          </button>
        </form>

        <a href="#" id="link-voltar-login" style="color: #94a3b8; text-decoration: none; font-size: 0.85rem; font-weight: 600;">← Voltar ao login</a>
      </div>
    `;

    document.getElementById("samae-recup-form").onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById("recup-email").value.trim();
      const errEl = document.getElementById("recup-error-msg");
      errEl.style.display = "none";

      try {
        const mailto = await window.AuthRepository.solicitarRecuperacao(email);
        alert("Instrução de redefinição gerada. O aplicativo de e-mail será aberto.");
        window.location.href = mailto;
        this.exibirTelaLogin();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };

    document.getElementById("link-voltar-login").onclick = (e) => {
      e.preventDefault();
      this.exibirTelaLogin();
    };
  }

  exibirModalNovaSenha(user) {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Nova Senha Definitiva</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Olá ${user.username}, escolha uma nova senha forte.</p>
        </div>

        <form id="samae-novasenha-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Nova Senha Definitiva</label>
            <input type="password" id="novasenha-input" required placeholder="••••••••" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
            <span style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 2px;">
              Mínimo de 8 caracteres, incluindo: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).
            </span>
          </div>

          <div id="novasenha-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          ">
            Atualizar e Acessar
          </button>
        </form>
      </div>
    `;

    document.getElementById("samae-novasenha-form").onsubmit = async (e) => {
      e.preventDefault();
      const novaSessionSenha = document.getElementById("novasenha-input").value;
      const errEl = document.getElementById("novasenha-error-msg");
      errEl.style.display = "none";

      try {
        await window.AuthRepository.atualizarSenha(user.username, novaSessionSenha);
        localStorage.setItem("samae_cco_session", JSON.stringify({ username: user.username, role: user.role }));
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };
  }
}

window.AuthUI = new AuthUI();
