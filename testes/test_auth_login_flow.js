const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function criarContextoLogin(autenticar) {
  const elementos = {
    "samae-auth-overlay": {
      style: {},
      innerHTML: "",
      removido: false,
      remove() {
        this.removido = true;
      }
    },
    "samae-login-form": { onsubmit: null },
    "login-username": { value: "operador.teste" },
    "login-password": { value: "Senha@2026" },
    "login-error-msg": { style: {}, textContent: "" },
    "link-esqueceu-senha": { onclick: null }
  };
  const valoresLocalStorage = new Map();
  const chamadas = { permissoes: 0, reload: 0 };
  const document = {
    body: { appendChild() {} },
    createElement: () => elementos["samae-auth-overlay"],
    getElementById: (id) => elementos[id] || null
  };
  const window = {
    AuthRepository: { autenticar },
    RBACManager: { aplicarPermissoes: () => { chamadas.permissoes += 1; } },
    location: { reload: () => { chamadas.reload += 1; } }
  };
  const localStorage = {
    getItem: (chave) => valoresLocalStorage.get(chave) ?? null,
    setItem: (chave, valor) => valoresLocalStorage.set(chave, String(valor)),
    removeItem: (chave) => valoresLocalStorage.delete(chave)
  };
  const contexto = { document, window, localStorage };
  const source = fs.readFileSync(path.join(__dirname, "../src/authUI.js"), "utf8");
  vm.runInNewContext(source, contexto);
  window.AuthUI.exibirTelaLogin();

  return { elementos, chamadas, valoresLocalStorage };
}

async function executarTestesFluxoLogin() {
  const usuario = {
    username: "operador.teste",
    role: "Agent",
    primeiroAcesso: false,
    requerRedefinicao: false
  };
  const sucesso = criarContextoLogin(async () => usuario);

  assert.match(sucesso.elementos["samae-auth-overlay"].innerHTML, /for="login-username"/);
  assert.match(sucesso.elementos["samae-auth-overlay"].innerHTML, /for="login-password"/);
  await sucesso.elementos["samae-login-form"].onsubmit({ preventDefault() {} });
  assert.strictEqual(
    sucesso.valoresLocalStorage.get("samae_cco_session"),
    JSON.stringify({ username: usuario.username, role: usuario.role })
  );
  assert.strictEqual(sucesso.elementos["samae-auth-overlay"].removido, true);
  assert.strictEqual(sucesso.chamadas.permissoes, 1);
  assert.strictEqual(sucesso.chamadas.reload, 1);

  const falha = criarContextoLogin(async () => {
    throw new Error("Usuário ou senha inválidos.");
  });
  await falha.elementos["samae-login-form"].onsubmit({ preventDefault() {} });
  assert.strictEqual(falha.elementos["login-error-msg"].textContent, "Usuário ou senha inválidos.");
  assert.strictEqual(falha.elementos["login-error-msg"].style.display, "block");
  assert.strictEqual(falha.valoresLocalStorage.has("samae_cco_session"), false);
  assert.strictEqual(falha.chamadas.reload, 0);

  console.log("✓ Login persiste sessão após autenticação e mostra erro sem criar sessão quando falha.");
}

module.exports = executarTestesFluxoLogin;
