const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function criarApiClient(estadoInicial, configuracao) {
  const localStorageData = {};
  const window = {
    ccoReconhecidos: new Map(estadoInicial.reconhecidos),
    samaeIncidentsLog: estadoInicial.logs,
    ccoReconhecidosCarregado: estadoInicial.carregado
  };
  const context = {
    window,
    fetch: async () => ({ ok: true, json: async () => configuracao }),
    localStorage: {
      getItem: (chave) => localStorageData[chave] ?? null,
      setItem: (chave, valor) => { localStorageData[chave] = String(valor); }
    },
    console,
    Map,
    Object
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/apiClient.js"), "utf8");
  vm.runInNewContext(source, context);
  return { window, localStorageData };
}

async function executarTestesApiClientConfig() {
  console.log("-> Executando testes de precedência do estado dos alarmes...");

  const snapshot = {
    _estado_plantao: {
      reconhecidos: [["R-01", "Atenção"]],
      logsIncidentes: [{ chave: "R-01", acao: "snapshot antigo" }]
    }
  };
  const carregado = criarApiClient({
    carregado: true,
    reconhecidos: [["R-01", "Crítico"]],
    logs: [{ chave: "R-01", acao: "estado local recente" }]
  }, snapshot);

  await carregado.window.ApiClient.carregarConfiguracoes();
  assert.strictEqual(carregado.window.ccoReconhecidos.get("R-01"), "Crítico");
  assert.strictEqual(carregado.window.samaeIncidentsLog[0].acao, "estado local recente");
  assert.strictEqual(carregado.localStorageData.samae_cco_reconhecidos, undefined);
  assert.strictEqual(carregado.localStorageData.samae_cco_incidents_log, undefined);

  const naoCarregado = criarApiClient({
    carregado: false,
    reconhecidos: [],
    logs: []
  }, snapshot);

  await naoCarregado.window.ApiClient.carregarConfiguracoes();
  assert.strictEqual(naoCarregado.window.ccoReconhecidos.get("R-01"), "Atenção");
  assert.strictEqual(naoCarregado.window.samaeIncidentsLog[0].acao, "snapshot antigo");
  assert.notStrictEqual(naoCarregado.localStorageData.samae_cco_reconhecidos, undefined);
  assert.notStrictEqual(naoCarregado.localStorageData.samae_cco_incidents_log, undefined);

  console.log("✓ Estado local carregado prevalece; configuração continua como fallback inicial.");
}

module.exports = executarTestesApiClientConfig;
