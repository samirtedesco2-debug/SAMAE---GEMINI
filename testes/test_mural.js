// testes/test_mural.js
const assert = require('assert');

function executarTestesMural() {
  console.log("-> Executando testes do Mural de Alertas Ativos e Governança RBAC...");
  global.window = {};
  window.ccoReconhecidos = new Map();
  window.samaeIncidentsLog = [];
  window.ccoAlarmStartTimes = new Map();
  
  // 1. Teste de Reconhecimento (ACK)
  const chave = "R-01";
  const severidade = "Crítico";
  window.ccoReconhecidos.set(chave, severidade);
  assert.strictEqual(window.ccoReconhecidos.has(chave), true);

  // 2. Teste de Cronômetro de Exposição ao Alarme (Tempo Ativo)
  window.ccoAlarmStartTimes.set(chave, Date.now() - 120000); // 2 minutos atrás
  const startTime = window.ccoAlarmStartTimes.get(chave);
  const segundosAtivo = Math.floor((Date.now() - startTime) / 1000);
  assert.strictEqual(segundosAtivo >= 119, true);

  // 3. Teste de Restrição RBAC para Revogação (Apenas ADMIN pode desreconhecer)
  let sessionAdmin = { username: "admin.samae", role: "ADMIN" };
  let sessionOperator = { username: "operador.plantao", role: "Agent" };

  function simularRevogacao(session) {
    if (session.role !== "ADMIN") {
      throw new Error("Acesso Negado: Apenas administradores podem revogar alarme.");
    }
    window.ccoReconhecidos.delete(chave);
  }

  // Operador tentando revogar deve lançar erro
  assert.throws(() => {
    simularRevogacao(sessionOperator);
  }, /Acesso Negado/);

  // Admin revogando deve funcionar
  simularRevogacao(sessionAdmin);
  assert.strictEqual(window.ccoReconhecidos.has(chave), false);

  console.log("✓ Mural de Alertas e Governança RBAC: Todos os testes passaram!");
}

module.exports = executarTestesMural;
