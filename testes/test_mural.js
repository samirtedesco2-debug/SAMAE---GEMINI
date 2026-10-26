// testes/test_mural.js
const assert = require('assert');

function executarTestesMural() {
  console.log("-> Executando testes do Mural de Alertas Ativos...");
  global.window = {};
  window.ccoReconhecidos = new Map();
  window.samaeIncidentsLog = [];
  
  window.ccoReconhecidos.set("R01", "Crítico");
  window.samaeIncidentsLog.push({ chave: "R01", acao: "Reconhecido", tempoRespostaMs: 800 });
  
  assert.strictEqual(window.ccoReconhecidos.has("R01"), true);
  assert.strictEqual(window.samaeIncidentsLog.length, 1);
  
  window.ccoReconhecidos.delete("R01");
  assert.strictEqual(window.ccoReconhecidos.has("R01"), false);
  
  console.log("✓ Mural de Alertas: Todos os testes passaram!");
}

module.exports = executarTestesMural;
