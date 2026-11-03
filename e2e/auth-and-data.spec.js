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

  const campoUsuario = page.getByLabel("Usuário");
  const campoSenha = page.getByLabel("Senha");
  await expect(campoUsuario).toBeVisible();
  await expect(campoSenha).toBeVisible();
  await campoUsuario.focus();
  await page.keyboard.press("Tab");
  await expect(campoSenha).toBeFocused();

  await campoUsuario.fill("admin.samae");
  await campoSenha.fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  await expect(page.locator("#samae-auth-overlay")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("samae_cco_session"))).toBeNull();
});

test("login válido cria sessão e abre o painel", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.samae");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("admin.samae");
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("samae_cco_session") || "null"))
  ).toEqual({ username: "admin.samae", role: "ADMIN" });
});

test("logout permite entrar novamente com a mesma conta", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.samae");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.locator("#samae-auth-overlay")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem("samae_cco_session"))).toBeNull();

  await page.getByLabel("Usuário").fill("admin.samae");
  await page.getByLabel("Senha").fill("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("admin.samae");
});

test("bloqueio de uma conta não impede o login de outro usuário", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Usuário").fill("agent.samae");
  await page.getByLabel("Senha").fill("Agent@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.locator("#samae-auth-overlay")).toBeVisible({ timeout: 15_000 });

  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    await page.getByLabel("Usuário").fill("admin.samae");
    await page.getByLabel("Senha").fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await expect(page.getByRole("alert")).toContainText("Conta bloqueada por segurança");

  await page.getByLabel("Usuário").fill("agent.samae");
  await page.getByLabel("Senha").fill("Agent@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("agent.samae");
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
    localStorage.setItem("samai_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });

  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.samae");
  await page.getByLabel("Senha").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;

  await page.goto("/?view=exceccoes");
  await expect(page.locator("#painel-exceccoes")).toBeVisible({ timeout: 15_000 });

  const alarme = page.locator("#grid-exceccoes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarme).toBeVisible({ timeout: 15_000 });
  await alarme.getByRole("button", { name: /Reconhecer/ }).click();
  await expect(alarme.locator(".mural-ack-badge")).toContainText("Reconhecido");
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("samae_cco_reconhecidos") || "{}")["R01-A"])
  ).toBe("Atenção");

  const segundaJanela = await context.newPage();
  await segundaJanela.goto("/?view=exceccoes");
  await expect(segundaJanela.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(segundaJanela.locator("#painel-exceccoes")).toBeVisible({ timeout: 15_000 });
  const alarmeSegundaJanela = segundaJanela
    .locator("#grid-exceccoes .mural-alarm-card")
    .filter({ hasText: "R01-A" })
    .first();
  await expect(alarmeSegundaJanela.locator(".mural-ack-badge")).toContainText("Reconhecido", { timeout: 15_000 });
  await expect.poll(() =>
    segundaJanela.evaluate(() => window.ccoAckMetadata.get("R01-A")?.operador)
  ).toBe("admin.samae");

  await page.reload();
  await expect(page.locator("#samae-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
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
  ).toBe("admin.samae");
});
