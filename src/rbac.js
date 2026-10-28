// rbac.js - Controle de Acesso Baseado em Papéis (RBAC) para o CCO SAMAE

class RBACManager {
  aplicarPermissoes() {
    const sessionStr = localStorage.getItem("samae_cco_session");
    if (!sessionStr) return;

    let session;
    try {
      session = JSON.parse(sessionStr);
    } catch (e) {
      return;
    }

    const role = session.role;
    const isAgent = role === "Agent" || role === "AGENT";

    // 1. Configurações de Reservatórios (Aba Configurações)
    const painelConfig = document.getElementById("painel-configuracoes");
    if (painelConfig) {
      const inputs = painelConfig.querySelectorAll("input, select, textarea");
      inputs.forEach(input => {
        if (isAgent) {
          input.disabled = true;
          input.readOnly = true;
        } else {
          input.disabled = false;
          input.readOnly = false;
        }
      });

      const btnSalvar = painelConfig.querySelectorAll(".btn-guardar-config, #btn-vincular-config");
      btnSalvar.forEach(btn => {
        btn.style.display = isAgent ? "none" : "";
      });
    }

    // 2. Ocultar painel de logs históricos de incidentes de SLA e Auditoria de Segurança para Agent
    const abaEngenharia = document.getElementById("tab-engenharia");
    if (abaEngenharia && isAgent) {
      abaEngenharia.style.display = "none";
    }

    // 3. Modificar botão de ACK no Mural para Agent (clique único '✓ Ciência Dada')
    window.samaeAgentIsRestricted = isAgent;
  }
}

window.RBACManager = new RBACManager();
