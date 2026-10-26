// testes/run_tests.js - Test Runner principal do projeto SAMAE CCO
const executarTestesNotificacoes = require('./test_notificacoes');
const executarTestesMural = require('./test_mural');
const executarTestesRegras = require('./test_regras');

console.log("==========================================================");
console.log("       SUÍTE DE TESTES AUTOMATIZADOS - SAMAE CCO          ");
console.log("==========================================================");

try {
  executarTestesNotificacoes();
  executarTestesMural();
  executarTestesRegras();
  console.log("\n==========================================================");
  console.log("🎉 TODOS OS MÓDULOS FORAM VALIDADOS COM 100% DE SUCESSO!     ");
  console.log("==========================================================");
  process.exit(0);
} catch (error) {
  console.error("\n❌ ERRO NOS TESTES:", error.message);
  process.exit(1);
}
