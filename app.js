// app.js - Lógica principal do Dashboard

// Guarda as instâncias do Chart.js para destruí-las adequadamente ao atualizar a interface
let instanciasGraficos = {};

document.addEventListener("DOMContentLoaded", () => {
  inicializarDashboard();
});

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

  const seletorData = document.getElementById("seletor-data");
  seletorData.innerHTML = "";

  // Preenche o combo com as datas disponíveis
  banco.datasDisponiveis.forEach((data) => {
    const option = document.createElement("option");
    option.value = data;
    option.textContent = data;
    seletorData.appendChild(option);
  });

  // Seleciona por padrão a data mais recente
  const dataMaisRecente =
    banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  seletorData.value = dataMaisRecente;

  // Renderiza os dados do dia selecionado
  renderizarDashboardPorData(dataMaisRecente);

  // Evento de troca de data
  seletorData.addEventListener("change", (e) => {
    renderizarDashboardPorData(e.target.value);
  });
}

function renderizarDashboardPorData(dataSelecionada) {
  const banco = window.bancoDeDados;
  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;

  if (!dadosDoDia) {
    console.error(`Dados não encontrados para a data ${dataSelecionada}`);
    return;
  }

  // Atualiza label de atualização no header
  const lblAtualizacao = document.getElementById("lbl-atualizacao");
  if (lblAtualizacao) {
    lblAtualizacao.textContent =
      dadosDoDia.ultimaAtualizacao || dataSelecionada;
  }

  const containerGrid = document.getElementById("grid-reservatorios");
  containerGrid.innerHTML = "";

  // Destrói gráficos anteriores se existirem
  Object.keys(instanciasGraficos).forEach((key) => {
    if (instanciasGraficos[key]) {
      instanciasGraficos[key].destroy();
    }
  });
  instanciasGraficos = {};

  const reservatorios = dadosDoDia.reservatorios || {};
  const horarios = dadosDoDia.horarios || [];

  // Renderiza um card para cada reservatório
  Object.keys(reservatorios).forEach((chave) => {
    const res = reservatorios[chave];
    const cardHTML = criarCardHTML(res);
    containerGrid.insertAdjacentHTML("beforeend", cardHTML);
  });

  // Renderiza os gráficos após os elementos estarem no DOM
  Object.keys(reservatorios).forEach((chave) => {
    const res = reservatorios[chave];
    renderizarGrafico(res.nome, horarios, res.leituras);
  });
}

function criarCardHTML(res) {
  const kpis = res.kpis;
  let statusClass = "status-normal";
  if (kpis.status === "Atenção") statusClass = "status-atencao";
  if (kpis.status === "Crítico") statusClass = "status-critico";

  const idCanvas = `chart-${res.nome.replace(/[^a-zA-Z0-9]/g, "_")}`;

  return `
    <div class="card">
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
          <span class="kpi-label">Vazão Atual</span>
          <span class="kpi-value">${kpis.vazaoAtual}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Vazão Média</span>
          <span class="kpi-value">${kpis.vazaoMedia}</span>
        </div>
      </div>

      <div class="chart-box">
        <canvas id="${idCanvas}"></canvas>
      </div>
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
          labels: { color: "#d8d9da", boxWidth: 12, font: { size: 11 } },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8e8e8e" },
          grid: { color: "#22252b" },
        },
        yNivel: {
          type: "linear",
          position: "left",
          min: 0,
          max: 100,
          title: { display: true, text: "Nível (%)", color: "#33a2e5" },
          ticks: { color: "#8e8e8e" },
          grid: { color: "#22252b" },
        },
        yVazao: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Vazão (L/s)", color: "#ff780a" },
          ticks: { color: "#8e8e8e" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  instanciasGraficos[nomeReservatorio] = chart;
}
