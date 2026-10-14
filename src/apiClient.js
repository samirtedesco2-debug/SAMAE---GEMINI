/**
 * apiClient.js - Camada de Abstração de Consumo de Dados (API Client)
 * SAMAE Jaraguá do Sul - CCO
 * 
 * Padroniza e isola o acesso a dados. Na transição futura para API REST, WebSockets 
 * ou Rádio, apenas este módulo precisará ser atualizado, preservando ui.js e regrasNegocio.js.
 */

window.ApiClient = {
  async carregarIndice() {
    const resposta = await fetch("indice_datas.json");
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar o índice de datas.");
    }
    return await resposta.json();
  },

  async carregarMes(anoMes) {
    const arquivoMes = `dados_historicos/${anoMes}.json`;
    try {
      const resp = await fetch(arquivoMes);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn(`Aviso: Não foi possível carregar o ficheiro mensal ${arquivoMes}`, e);
    }
    return null;
  },

  async inicializarBanco() {
    const indice = await this.carregarIndice();
    const datasDisponiveis = indice.datasDisponiveis || [];
    const historico = {};

    if (datasDisponiveis.length > 0) {
      const mesesParaCarregar = new Set();
      datasDisponiveis.forEach((dataStr) => {
        const partes = dataStr.split("/");
        if (partes.length === 3) {
          mesesParaCarregar.add(`${partes[2]}_${partes[1]}`); // Formato: ano_mes (ex: 2026_10)
        }
      });

      const promessasCarregamento = Array.from(mesesParaCarregar).map(
        async (anoMes) => {
          const dadosMes = await this.carregarMes(anoMes);
          if (dadosMes && dadosMes.dias) {
            Object.assign(historico, dadosMes.dias);
          }
        }
      );

      await Promise.all(promessasCarregamento);
    }

    return {
      datasDisponiveis,
      historico
    };
  }
};
