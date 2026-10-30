// testes/test_multiwindow_sync.js
const assert = require('assert');

function executarTestesMultiwindowSync() {
  console.log("-> Executando testes de Sincronização Multi-Janela e Auditoria CCO...");
  
  // Mock localStorage global para Node.js
  const storageMock = {};
  global.localStorage = {
    getItem: (key) => storageMock[key] || null,
    setItem: (key, val) => { storageMock[key] = String(val); },
    removeItem: (key) => { delete storageMock[key]; },
    clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
  };

  // Simular Janela A (Principal)
  const windowA = {
    ccoReconhecidos: new Map(),
    samaeIncidentsLog: []
  };

  // Simular Janela B (Mural Pop-up)
  const windowB = {
    ccoReconhecidos: new Map(),
    samaeIncidentsLog: []
  };

  // Ação de ACK na Janela B
  const chaveAlarme = "R-01";
  const severidadeAlarme = "Crítico";
  
  // Janela B reconhece o alarme
  windowB.ccoReconhecidos.set(chaveAlarme, severidadeAlarme);
  const payload = JSON.stringify(Object.fromEntries(windowB.ccoReconhecidos.entries()));
  localStorage.setItem("samae_cco_reconhecidos", payload);
  
  windowB.samaeIncidentsLog.push({
    timestamp: new Date().toISOString(),
    chave: chaveAlarme,
    severidade: severidadeAlarme,
    acao: "Reconhecido"
  });
  localStorage.setItem("samae_cco_incidents_log", JSON.stringify(windowB.samaeIncidentsLog));

  // Simular Sincronização na Janela A (como se o evento storage ou BroadcastChannel ocorresse)
  const reconhecidosSalvos = localStorage.getItem("samae_cco_reconhecidos");
  assert.strictEqual(reconhecidosSalvos !== null, true);
  const objReconhecidos = JSON.parse(reconhecidosSalvos);
  windowA.ccoReconhecidos = new Map(Object.entries(objReconhecidos));

  const logsSalvos = localStorage.getItem("samae_cco_incidents_log");
  windowA.samaeIncidentsLog = JSON.parse(logsSalvos);

  // Asserções
  assert.strictEqual(windowA.ccoReconhecidos.has(chaveAlarme), true);
  assert.strictEqual(windowA.ccoReconhecidos.get(chaveAlarme), severidadeAlarme);
  assert.strictEqual(windowA.samaeIncidentsLog.length, 1);
  assert.strictEqual(windowA.samaeIncidentsLog[0].acao, "Reconhecido");

  // Janela A revoga o alarme
  windowA.ccoReconhecidos.delete(chaveAlarme);
  localStorage.setItem("samae_cco_reconhecidos", JSON.stringify(Object.fromEntries(windowA.ccoReconhecidos.entries())));

  // Janela B sincroniza a revogação
  const reconRevogado = localStorage.getItem("samae_cco_reconhecidos");
  windowB.ccoReconhecidos = new Map(Object.entries(JSON.parse(reconRevogado)));
  assert.strictEqual(windowB.ccoReconhecidos.has(chaveAlarme), false);

  console.log("✓ Sincronização Multi-Janela e Auditoria: Todos os testes passaram!");
}

module.exports = executarTestesMultiwindowSync;
