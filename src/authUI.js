// authUI.js - Interface de Autenticação, Login, Primeiro Acesso e Recuperação de Senha (CCO SAMAE)

class AuthUI {
  _obterOuCriarOverlay() {
    let overlay = document.getElementById("samae-auth-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "samae-auth-overlay";
      document.body.appendChild(overlay);
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0b1329"/>
            <stop offset="60%" stop-color="#16223b"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <linearGradient id="concreteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="50%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="waterGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
          </linearGradient>
          <filter id="reservoirBlur">
            <feGaussianBlur stdDeviation="35"/>
          </filter>
        </defs>

        <rect width="1200" height="800" fill="url(#skyGrad)"/>

        <circle cx="950" cy="200" r="180" fill="rgba(56, 189, 248, 0.08)" filter="url(#reservoirBlur)"/>
        <circle cx="300" cy="400" r="220" fill="rgba(14, 165, 233, 0.06)" filter="url(#reservoirBlur)"/>

        <g filter="url(#reservoirBlur)">
          <path d="M 150 750 L 150 350 C 150 250, 350 200, 600 200 C 850 200, 1050 250, 1050 350 L 1050 750 Z" fill="url(#concreteGrad)"/>
          
          <path d="M 200 750 L 200 280 C 200 220, 400 220, 400 280 L 400 750 Z" fill="#475569" opacity="0.9"/>
          
          <path d="M 450 750 L 450 180 C 450 120, 750 120, 750 180 L 750 750 Z" fill="#334155"/>

          <path d="M 800 750 L 800 300 C 800 240, 1000 240, 1000 300 L 1000 750 Z" fill="#475569" opacity="0.9"/>

          <rect x="200" y="450" width="800" height="40" fill="#1e293b"/>
          <rect x="350" y="320" width="500" height="30" fill="#0f172a"/>

          <rect x="100" y="650" width="1000" height="25" rx="12" fill="url(#waterGlow)"/>
          <circle cx="600" cy="662.5" r="45" fill="#38bdf8" opacity="0.7"/>
        </g>

        <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
          <stop offset="40%" stop-color="transparent"/>
          <stop offset="100%" stop-color="#030712" stop-opacity="0.9"/>
        </radialGradient>
        <rect width="1200" height="800" fill="url(#vignette)"/>
      </svg>
    `;

    const base64Svg = btoa(svgString.trim());

    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: 
        linear-gradient(rgba(3, 7, 18, 0.75), rgba(3, 7, 18, 0.88)),
        url("data:image/svg+xml;base64,${base64Svg}");
      background-size: cover;
      background-position: center;
      backdrop-filter: blur(14px);
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
