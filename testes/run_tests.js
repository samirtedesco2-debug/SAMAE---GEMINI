// testes/run_tests.js - Test Runner principal do projeto SAMAE CCO
const executarTestesNotificacoes = require('./test_notificacoes');
const executarTestesMural = require('./test_mural');
const executarTestesRegras = require('./test_regras');
const executarTestesMultiwindowSync = require('./test_multiwindow_sync');
const executarTestesStorageRepository = require('./test_storage_repository');
const executarTestesTempoAlarme = require('./test_alarm_timing');
const executarTestesApiClientConfig = require('./test_api_client_config');

async function executarSuíte() {
  console.log("==========================================================");
  console.log("       SUÍTE DE TESTES AUTOMATIZADOS - SAMAE CCO          ");
  console.log("==========================================================");

  executarTestesNotificacoes();
  executarTestesMural();
  executarTestesRegras();
  executarTestesMultiwindowSync();
  executarTestesTempoAlarme();
  await executarTestesApiClientConfig();
  await executarTestesStorageRepository();
  console.log("\n==========================================================");
  console.log("🎉 TODOS OS MÓDULOS FORAM VALIDADOS COM 100% DE SUCESSO!     ");
  console.log("==========================================================");
}

executarSuíte().then(() => process.exit(0)).catch((error) => {
  console.error("\n❌ ERRO NOS TESTES:", error.message);
  process.exit(1);
});
