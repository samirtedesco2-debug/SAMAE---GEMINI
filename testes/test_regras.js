// testes/test_regras.js
const assert = require('assert');

function executarTestesRegras() {
  console.log("-> Executando testes de Regras de Negócio...");
  
  function avaliarNivel(n) {
    if (n < 30) return "Crítico";
    if (n < 50) return "Atenção";
    return "Normal";
  }
  
  assert.strictEqual(avaliarNivel(20), "Crítico");
  assert.strictEqual(avaliarNivel(40), "Atenção");
  assert.strictEqual(avaliarNivel(70), "Normal");
  
  console.log("✓ Regras de Negócio: Todos os testes passaram!");
}

module.exports = executarTestesRegras;
