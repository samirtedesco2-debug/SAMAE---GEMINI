const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://cdn.jsdelivr.net/npm/chart.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.Chart = class Chart { static getChart() { return null; } };"
    })
  );
});

test("login acessível rejeita credenciais inválidas", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#nexo-auth-overlay .auth-brand-logo")).toBeVisible();
  const campoUsuario = page.getByLabel("Usuário");
  const campoSenha = page.getByLabel("Senha");
  await expect(campoUsuario).toBeVisible();
  await expect(campoSenha).toBeVisible();
  await campoUsuario.focus();
  await page.keyboard.press("Tab");
  await expect(campoSenha).toBeFocused();

  await campoUsuario.fill("admin.nexo");
  await campoSenha.fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("nexo_hidrico_session"))).toBeNull();
});

test("login válido cria sessão e abre o painel", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".header-brand-logo")).toBeVisible();
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("nexo_hidrico_session") || "null"))
  ).toEqual({ username: "admin.nexo", role: "ADMIN" });
});

test("migra contas e dados locais legados sem removê-los", async ({ page }) => {
  await page.goto("/manual-imagens/nexo-hidrico-icon.svg");
  await page.evaluate(async () => {
    const abrirBanco = (nome, stores) => new Promise((resolve, reject) => {
      const request = indexedDB.open(nome, nome === "SamaeCCOStorageDB" ? 2 : 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        stores.forEach(({ name, options, indexes = [] }) => {
          const store = db.createObjectStore(name, options);
          indexes.forEach((index) => store.createIndex(index.name, index.keyPath, { unique: false }));
        });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const gravar = (db, nomeStore, operation) => new Promise((resolve, reject) => {
      const transaction = db.transaction(nomeStore, "readwrite");
      operation(transaction);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    const authDb = await abrirBanco("SamaeAuthDB", [
      { name: "usuarios", options: { keyPath: "username" }, indexes: [{ name: "email", keyPath: "email" }] },
      { name: "auditoria", options: { keyPath: "id", autoIncrement: true } }
    ]);
    await gravar(authDb, ["usuarios", "auditoria"], (transaction) => {
      transaction.objectStore("usuarios").put({
        username: "admin.samae",
        senha: "SenhaCustom@2026",
        email: "admin@exemplo.com",
        role: "ADMIN",
        primeiroAcesso: false,
        bloqueado: false,
        tentativasFalhas: 1,
        requerRedefinicao: false
      });
      transaction.objectStore("usuarios").put({
        username: "agent.samae",
        senha: "SenhaOperador@2026",
        email: "operador@exemplo.com",
        role: "Agent",
        primeiroAcesso: false,
        bloqueado: false,
        tentativasFalhas: 2,
        requerRedefinicao: false
      });
      transaction.objectStore("auditoria").add({ usuario: "admin.samae", acao: "LOGIN_SUCESSO" });
    });
    authDb.close();

    const storageDb = await abrirBanco("SamaeCCOStorageDB", [
      { name: "reconhecidos", options: { keyPath: "chave" } },
      { name: "logs", options: { keyPath: "id", autoIncrement: true } }
    ]);
    await gravar(storageDb, ["reconhecidos", "logs"], (transaction) => {
      transaction.objectStore("reconhecidos").put({ chave: "R-LEGADO", severidade: "Atenção", timestamp: 100 });
      transaction.objectStore("logs").add({ chave: "R-LEGADO", acao: "Reconhecido" });
    });
    storageDb.close();

    const handlesDb = await abrirBanco("SamaeHandlesDB", [
      { name: "handles", options: {} }
    ]);
    await gravar(handlesDb, "handles", (transaction) =>
      transaction.objectStore("handles").put("handle-legado", "configFile")
    );
    handlesDb.close();

    localStorage.setItem("samae_cco_session", JSON.stringify({ username: "admin.samae", role: "ADMIN" }));
    localStorage.setItem("samai_reservatorios_config", JSON.stringify({ "R-LEGADO": { nivelAtencao: 70 } }));
    localStorage.setItem("samai_global_config", JSON.stringify({ caminhoLocal: "C:/Samae/Relatorios" }));
    localStorage.setItem("samae_cco_reconhecidos", JSON.stringify({ "R-LOCAL": "Crítico" }));
    localStorage.setItem("samae_cco_ack_metadata", JSON.stringify({ "R-LOCAL": { operador: "admin.samae" } }));
    localStorage.setItem("samae_cco_ack_tombstones", JSON.stringify({ "R-REMOVIDO": 200 }));
    localStorage.setItem("samae_cco_incidents_log", JSON.stringify([{ chave: "R-HIST", acao: "Revogado" }]));
    localStorage.setItem("samae_cco_trigger_times", JSON.stringify({ "R-LOCAL": "03/11/2026 07:00:00" }));
    localStorage.setItem("samai_cco_external_notifications", JSON.stringify([{ id: "n1", lida: false }]));
    localStorage.setItem("samai_cco_sound_enabled", "false");
  });

  await page.goto("/");
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");

  const dadosMigrados = await page.evaluate(async () => {
    const usuario = await window.AuthRepository.obterUsuario("admin.nexo");
    const operador = await window.AuthRepository.obterUsuario("operador.nexo");
    const auditoria = await window.AuthRepository.obterLogsAuditoria();
    const bancoLegado = await new Promise((resolve, reject) => {
      const request = indexedDB.open("SamaeAuthDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const usuarioLegado = await new Promise((resolve, reject) => {
      const request = bancoLegado.transaction("usuarios", "readonly")
        .objectStore("usuarios").get("admin.samae");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    bancoLegado.close();
    const reconhecidos = await window.StorageRepository.executarTransacao(
      "reconhecidos",
      "readonly",
      (store) => store.getAll()
    );
    const logs = await window.StorageRepository.carregarLogs();
    const handlesDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open("NexoHandlesDB", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const handle = await new Promise((resolve, reject) => {
      const request = handlesDb.transaction("handles", "readonly").objectStore("handles").get("configFile");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    handlesDb.close();
    return {
      usuario,
      operador,
      usuarioLegado,
      auditoriaUsuario: auditoria[0]?.usuario,
      reconhecido: reconhecidos.find((item) => item.chave === "R-LEGADO"),
      log: logs.find((item) => item.chave === "R-LEGADO"),
      handle,
      sessao: JSON.parse(localStorage.getItem("nexo_hidrico_session")),
      config: JSON.parse(localStorage.getItem("nexo_hidrico_reservatorios_config")),
      configGlobal: JSON.parse(localStorage.getItem("nexo_hidrico_global_config")),
      reconhecidosLocal: JSON.parse(localStorage.getItem("nexo_hidrico_reconhecidos")),
      metadadosLocal: JSON.parse(localStorage.getItem("nexo_hidrico_ack_metadata")),
      tombstonesLocal: JSON.parse(localStorage.getItem("nexo_hidrico_ack_tombstones")),
      historicoLocal: JSON.parse(localStorage.getItem("nexo_hidrico_incidents_log")),
      temposLocal: JSON.parse(localStorage.getItem("nexo_hidrico_trigger_times")),
      notificacoes: JSON.parse(localStorage.getItem("nexo_hidrico_external_notifications")),
      som: localStorage.getItem("nexo_hidrico_sound_enabled"),
      sessaoLegada: localStorage.getItem("samae_cco_session"),
      migracao: localStorage.getItem("nexo_hidrico_migration_version")
    };
  });
  expect(dadosMigrados.usuario).toMatchObject({
    username: "admin.nexo",
    senha: "SenhaCustom@2026",
    role: "ADMIN",
    tentativasFalhas: 1
  });
  expect(dadosMigrados.usuarioLegado.senha).toBe("SenhaCustom@2026");
  expect(dadosMigrados.operador).toMatchObject({
    username: "operador.nexo",
    senha: "SenhaOperador@2026",
    role: "Agent",
    tentativasFalhas: 2
  });
  expect(dadosMigrados.auditoriaUsuario).toBe("admin.samae");
  expect(dadosMigrados.reconhecido.severidade).toBe("Atenção");
  expect(dadosMigrados.log.acao).toBe("Reconhecido");
  expect(dadosMigrados.handle).toBe("handle-legado");
  expect(dadosMigrados.sessao).toEqual({ username: "admin.nexo", role: "ADMIN" });
  expect(dadosMigrados.config["R-LEGADO"].nivelAtencao).toBe(70);
  expect(dadosMigrados.configGlobal.caminhoLocal).toBe("C:/Samae/Relatorios");
  expect(dadosMigrados.reconhecidosLocal["R-LOCAL"]).toBe("Crítico");
  expect(dadosMigrados.metadadosLocal["R-LOCAL"].operador).toBe("admin.samae");
  expect(dadosMigrados.tombstonesLocal["R-REMOVIDO"]).toBe(200);
  expect(dadosMigrados.historicoLocal[0].acao).toBe("Revogado");
  expect(dadosMigrados.temposLocal["R-LOCAL"]).toBe("03/11/2026 07:00:00");
  expect(dadosMigrados.notificacoes).toEqual([{ id: "n1", lida: false }]);
  expect(dadosMigrados.som).toBe("false");
  expect(JSON.parse(dadosMigrados.sessaoLegada).username).toBe("admin.samae");
  expect(dadosMigrados.migracao).toBe("1");
});

test("logout permite entrar novamente com a mesma conta", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem("nexo_hidrico_session"))).toBeNull();

  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");
});

test("bloqueio de uma conta não impede o login de outro usuário", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Usuário").fill("operador.nexo");
  await page.getByLabel("Senha").fill("Agent@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible({ timeout: 15_000 });

  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    await page.getByLabel("Usuário").fill("admin.nexo");
    await page.getByLabel("Senha").fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await expect(page.getByRole("alert")).toContainText("Conta bloqueada por segurança");

  await page.getByLabel("Usuário").fill("operador.nexo");
  await page.getByLabel("Senha").fill("Agent@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("operador.nexo");
});

test("painel alerta quando um arquivo mensal não carrega", async ({ page }) => {
  await page.route("**/dados_historicos/2026_10.json", (route) => route.abort());
  await page.goto("/");

  const aviso = page.locator("#data-load-status");
  await expect(aviso).toBeVisible({ timeout: 15_000 });
  await expect(aviso).toContainText("dados_historicos/2026_10.json");
  await expect(aviso).toContainText("dados podem estar incompletos");
});

test("reconhecimento do alarme persiste e sincroniza entre janelas", async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });

  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.getByLabel("Senha").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;

  await page.goto("/?view=exceccoes");
  await expect(page.locator("#painel-exceccoes")).toBeVisible({ timeout: 15_000 });

  const alarme = page.locator("#grid-exceccoes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarme).toBeVisible({ timeout: 15_000 });
  await alarme.getByRole("button", { name: /Reconhecer/ }).click();
  await expect(alarme.locator(".mural-ack-badge")).toContainText("Reconhecido");
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("nexo_hidrico_reconhecidos") || "{}")["R01-A"])
  ).toBe("Atenção");

  const segundaJanela = await context.newPage();
  await segundaJanela.goto("/?view=exceccoes");
  await expect(segundaJanela.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(segundaJanela.locator("#painel-exceccoes")).toBeVisible({ timeout: 15_000 });
  const alarmeSegundaJanela = segundaJanela
    .locator("#grid-exceccoes .mural-alarm-card")
    .filter({ hasText: "R01-A" })
    .first();
  await expect(alarmeSegundaJanela.locator(".mural-ack-badge")).toContainText("Reconhecido", { timeout: 15_000 });
  await expect.poll(() =>
    segundaJanela.evaluate(() => window.ccoAckMetadata.get("R01-A")?.operador)
  ).toBe("admin.nexo");

  await page.reload();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#painel-exceccoes")).toBeVisible({ timeout: 15_000 });
  const alarmePersistido = page.locator("#grid-exceccoes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarmePersistido.locator(".mural-ack-badge")).toContainText("Reconhecido", { timeout: 15_000 });
  await expect.poll(() =>
    page.evaluate(async () => {
      const registros = await window.StorageRepository.executarTransacao(
        "reconhecidos",
        "readonly",
        (store) => store.getAll()
      );
      return registros.find((registro) => registro.chave === "R01-A")?.metadados?.operador;
    })
  ).toBe("admin.nexo");
});
