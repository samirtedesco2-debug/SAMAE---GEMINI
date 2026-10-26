/**
 * ccoSync.js - Módulo de Sincronização, Canal CCO e Janela Singleton
 * SAMAE Jaraguá do Sul - CCO
 */

window.CcoSync = {
  inicializarCanal() {
    if (!window.ccoChannel) {
      window.ccoChannel = new BroadcastChannel('samae_cco_link');
      window.ccoReconhecidos = window.ccoReconhecidos || new Map();
      window.ccoChannel.onmessage = (event) => {
        const { type, chave, severidade } = event.data || {};
        if (type === 'ACK_ALARM') {
          window.ccoReconhecidos.set(chave, severidade);
          if (typeof renderizarDashboardExceccoes === 'function') {
            renderizarDashboardExceccoes();
          }
        } else if (type === 'REVOKE_ACK') {
          window.ccoReconhecidos.delete(chave);
          if (typeof renderizarDashboardExceccoes === 'function') {
            renderizarDashboardExceccoes();
          }
        }
      };
    }
  },

  abrirMuralSingleton() {
    if (window.ccoMuralWindow && !window.ccoMuralWindow.closed) {
      window.ccoMuralWindow.focus();
    } else {
      window.ccoMuralWindow = window.open('?view=exceccoes', 'ccoMuralWindow', 'width=1200,height=800');
    }
  },

  inicializarModoCCO() {
    const botoesCCO = document.querySelectorAll('#btn-modo-cco, #btn-modo-cco-mural');
    if (botoesCCO.length === 0) return;

    const iconeCCO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`;
    const iconePadrao = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

    botoesCCO.forEach(btnCCO => {
      btnCCO.addEventListener("click", (e) => {
        if (e.shiftKey || e.ctrlKey) {
          this.abrirMuralSingleton();
          return;
        }

        document.body.classList.toggle("modo-cco-ativo");
        const isLargeTV = document.body.classList.contains("modo-cco-ativo");
        document.body.dataset.viewScale = isLargeTV ? "large-tv" : "";

        botoesCCO.forEach(b => {
          if (isLargeTV) {
            b.innerHTML = iconePadrao;
            b.title = "Modo Padrão";
            b.style.borderColor = "var(--accent-color)";
          } else {
            b.innerHTML = iconeCCO;
            b.title = "Modo CCO";
            b.style.borderColor = "var(--border-color)";
          }
        });

        if (isLargeTV) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          const tabExceccoes = document.getElementById("tab-exceccoes");
          if (tabExceccoes) tabExceccoes.click();
        } else {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          const tabOp = document.getElementById("tab-operacional");
          if (tabOp) tabOp.click();
        }
      });
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("modo-cco-ativo");
        document.body.dataset.viewScale = "";
        botoesCCO.forEach(b => {
          b.innerHTML = iconeCCO;
          b.style.borderColor = "var(--border-color)";
          b.title = "Modo CCO";
        });
      }
    });
  },

  inicializarModoCCOMural(btnId = 'btn-modo-cco-mural') {
    const btnMural = document.getElementById(btnId);
    if (!btnMural) return;

    const iconeCCO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`;
    const iconePadrao = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

    btnMural.addEventListener("click", () => {
      document.body.classList.toggle("modo-cco-ativo");
      const isLargeTV = document.body.classList.contains("modo-cco-ativo");
      document.body.dataset.viewScale = isLargeTV ? "large-tv" : "";

      if (isLargeTV) {
        btnMural.innerHTML = iconePadrao;
        btnMural.title = "Modo Padrão";
        btnMural.style.borderColor = "var(--accent-color)";
        
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        btnMural.innerHTML = iconeCCO;
        btnMural.title = "Modo CCO";
        btnMural.style.borderColor = "var(--border-color)";
        
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("modo-cco-ativo");
        document.body.dataset.viewScale = "";
        btnMural.innerHTML = iconeCCO;
        btnMural.style.borderColor = "var(--border-color)";
        btnMural.title = "Modo CCO";
      }
    });
  }
};
