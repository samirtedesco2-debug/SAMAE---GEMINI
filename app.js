// app.js - Lógica principal do Dashboard

// Guarda as instâncias do Chart.js para destruí-las adequadamente ao atualizar a interface
let instanciasGraficos = {};

document.addEventListener("DOMContentLoaded", () => {
  inicializarTema();
  inicializarDashboard();
});

function inicializarTema() {
  const botaoTema = document.getElementById("theme-toggle");
  const temaSalvo = localStorage.getItem("tema-dashboard");
  const temaInicial = temaSalvo === "light" ? "light" : "dark";

  aplicarTema(temaInicial, botaoTema);

  botaoTema.addEventListener("click", () => {
    const novoTema =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    aplicarTema(novoTema, botaoTema);
    if (window.bancoDeDados?.datasDisponiveis?.length) {
      renderizarDashboard();
    }
  });
}

function aplicarTema(tema, botaoTema) {
  const temaAlvo = tema === "dark" ? "claro" : "escuro";
  document.documentElement.dataset.theme = tema;
  botaoTema.setAttribute("aria-label", `Ativar tema ${temaAlvo}`);
  botaoTema.title = `Ativar tema ${temaAlvo}`;
  botaoTema.setAttribute("aria-pressed", String(tema === "light"));
  localStorage.setItem("tema-dashboard", tema);
}

function inicializarDashboard() {
  const banco = window.bancoDeDados;

  if (
    !banco ||
    !banco.datasDisponiveis ||
    banco.datasDisponiveis.length === 0
  ) {
    document.getElementById("grid-reservatorios").innerHTML =
      "<p style='color: #8e8e8e;'>Nenhum dado encontrado no banco de dados.</p>";
    return;
  }

  // Exibe a última data cadastrada no banco de dados
  const ultimaDataDoBanco =
    banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const lblAtualizacao = document.getElementById("lbl-atualizacao");
  if (lblAtualizacao) {
    lblAtualizacao.textContent = ultimaDataDoBanco;
  }

  // 1. Preenche o seletor de datas
  const seletorData = document.getElementById("seletor-data");
  seletorData.innerHTML = "";
  banco.datasDisponiveis.forEach((data) => {
    const option = document.createElement("option");
    option.value = data;
    option.textContent = data;
    seletorData.appendChild(option);
  });
  seletorData.value = ultimaDataDoBanco;

  const seletorFiltro = document.getElementById("seletor-filtro");
  preencherSeletorFiltro(ultimaDataDoBanco, "TODOS");

  const containerGrid = document.getElementById("grid-reservatorios");
  containerGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) selecionarCard(card);
  });
  containerGrid.addEventListener("keydown", (e) => {
    if (
      e.target.classList.contains("card") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      selecionarCard(e.target);
    }
  });

  // 3. Renderiza a visualização inicial
  renderizarDashboard();

  // Eventos de alteração dos seletores
  seletorData.addEventListener("change", (e) => {
    preencherSeletorFiltro(e.target.value, seletorFiltro.value);
    renderizarDashboard();
  });

  seletorFiltro.addEventListener("change", renderizarDashboard);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && seletorFiltro.value !== "TODOS") {
      e.preventDefault();
      seletorFiltro.value = "TODOS";
      seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
      seletorFiltro.focus();
    }
  });
}

function preencherSeletorFiltro(dataSelecionada, valorAnterior) {
  const banco = window.bancoDeDados;
  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;
  const seletorFiltro = document.getElementById("seletor-filtro");
  if (!seletorFiltro || !dadosDoDia?.reservatorios) return;

  seletorFiltro.innerHTML = "";
  seletorFiltro.add(new Option("Todos os grupos e reservatórios", "TODOS"));

  const gruposUnicos = new Set();
  Object.values(dadosDoDia.reservatorios).forEach((res) => {
    if (res.grupo) gruposUnicos.add(res.grupo);
  });

  gruposUnicos.forEach((grupo) => {
    seletorFiltro.add(new Option(`Grupo: ${grupo}`, `grupo:${grupo}`));
  });

  Object.entries(dadosDoDia.reservatorios).forEach(([chave, res]) => {
    seletorFiltro.add(
      new Option(`  ${res.nome} (${res.grupo})`, `reservatorio:${chave}`),
    );
  });

  seletorFiltro.value = Array.from(seletorFiltro.options).some(
    (option) => option.value === valorAnterior,
  )
    ? valorAnterior
    : "TODOS";
}

function renderizarDashboard() {
  const banco = window.bancoDeDados;
  const dataSelecionada = document.getElementById("seletor-data").value;
  const filtroSelecionado = document.getElementById("seletor-filtro").value;

  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;

  if (!dadosDoDia) {
    console.error(`Dados não encontrados para a data ${dataSelecionada}`);
    return;
  }

  const containerGrid = document.getElementById("grid-reservatorios");
  const header = document.querySelector("header");
  header.classList.toggle("has-active-filter", filtroSelecionado !== "TODOS");
  containerGrid.innerHTML = "";

  // Destrói gráficos anteriores
  Object.keys(instanciasGraficos).forEach((key) => {
    if (instanciasGraficos[key]) {
      instanciasGraficos[key].destroy();
    }
  });
  instanciasGraficos = {};

  const reservatorios = dadosDoDia.reservatorios || {};
  const horarios = dadosDoDia.horarios || [];
  const visaoGeral = filtroSelecionado === "TODOS";

  // Lógica de filtragem
  let chavesParaExibir = Object.keys(reservatorios);

  if (filtroSelecionado.startsWith("grupo:")) {
    const grupoSelecionado = filtroSelecionado.slice("grupo:".length);
    chavesParaExibir = chavesParaExibir.filter(
      (chave) => reservatorios[chave].grupo === grupoSelecionado,
    );
  } else if (filtroSelecionado.startsWith("reservatorio:")) {
    const reservatorioSelecionado = filtroSelecionado.slice(
      "reservatorio:".length,
    );
    chavesParaExibir = chavesParaExibir.filter(
      (chave) => chave === reservatorioSelecionado,
    );
  }

  // Renderiza os cards
  chavesParaExibir.forEach((chave) => {
    const res = reservatorios[chave];
    const selecionado = filtroSelecionado === `reservatorio:${chave}`;
    const exibirGrafico = !visaoGeral;
    const cardHTML = criarCardHTML(res, chave, exibirGrafico, selecionado);
    containerGrid.insertAdjacentHTML("beforeend", cardHTML);

    if (exibirGrafico) {
      renderizarGrafico(res.nome, horarios, res.leituras);
    }
  });
}

function selecionarCard(card) {
  const chaveReservatorio = decodeURIComponent(card.dataset.reservatorio);
  const seletorFiltro = document.getElementById("seletor-filtro");
  seletorFiltro.value = `reservatorio:${chaveReservatorio}`;
  seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
}

function criarCardHTML(res, chave, exibirGraficos, selecionado) {
  const kpis = res.kpis;
  let statusClass = "status-normal";
  if (kpis.status === "Atenção") statusClass = "status-atencao";
  if (kpis.status === "Crítico") statusClass = "status-critico";

  const idCanvas = `chart-${res.nome.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const graficoHTML = exibirGraficos
    ? `<div class="chart-box"><canvas id="${idCanvas}"></canvas></div>`
    : "";

  return `
    <div
      class="card${selecionado ? " is-selected" : ""}"
      data-reservatorio="${encodeURIComponent(chave)}"
      role="button"
      tabindex="0"
      aria-pressed="${selecionado}"
      aria-label="Selecionar KPIs de ${res.nome}, grupo ${res.grupo}"
    >
      <div class="card-header">
        <span class="card-title">${res.nome} (${res.grupo})</span>
        <span class="badge-status ${statusClass}">${kpis.status}</span>
      </div>

      <div class="kpi-container">
        <div class="kpi-box">
          <span class="kpi-label">Nível Atual</span>
          <span class="kpi-value">${kpis.nivelAtual}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Nível Mín/Máx</span>
          <span class="kpi-value">${kpis.nivelMin} / ${kpis.nivelMax}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Vazão Mín/Máx</span>
          <span class="kpi-value">${kpis.vazaoMin} / ${kpis.vazaoMax}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Vazão Média</span>
          <span class="kpi-value">${kpis.vazaoMedia}</span>
        </div>
      </div>

      ${graficoHTML}
    </div>
  `;
}

function renderizarGrafico(nomeReservatorio, horarios, leituras) {
  const idCanvas = `chart-${nomeReservatorio.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const ctx = document.getElementById(idCanvas);

  if (!ctx) return;

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: horarios,
      datasets: [
        {
          label: "Nível (%)",
          data: leituras.nivel,
          borderColor: "#33a2e5",
          backgroundColor: "rgba(51, 162, 229, 0.1)",
          borderWidth: 2,
          fill: true,
          yAxisID: "yNivel",
          tension: 0.3,
        },
        {
          label: "Vazão (L/s)",
          data: leituras.vazao,
          borderColor: "#ff780a",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [4, 4],
          yAxisID: "yVazao",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: obterVariavelCSS("--text-color"),
            boxWidth: 12,
            font: { size: 11 },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        yNivel: {
          type: "linear",
          position: "left",
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "Nível (%)",
            color: obterVariavelCSS("--accent-color"),
          },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        yVazao: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Vazão (L/s)", color: "#ff780a" },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  instanciasGraficos[nomeReservatorio] = chart;
}

function obterVariavelCSS(nome) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
}
