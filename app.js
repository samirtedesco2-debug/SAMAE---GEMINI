// app.js - Lógica principal do Dashboard

// Guarda as instâncias do Chart.js para destruí-las adequadamente ao atualizar a interface
let instanciasGraficos = {};
let graficosAnaliticos = {};

const coresAnaliticas = [
  "#33a2e5",
  "#ff780a",
  "#73bf69",
  "#b877d9",
  "#e35d6a",
  "#38b2ac",
  "#d7a52b",
  "#5975d9",
];

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
      if (document.getElementById("painel-analitico").hidden) {
        renderizarDashboard();
      } else {
        renderizarAnalises();
      }
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
  inicializarNavegacao();
  inicializarAnalises();

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

function inicializarNavegacao() {
  const abas = Array.from(document.querySelectorAll(".view-tab"));
  const paineis = {
    "tab-operacional": document.getElementById("painel-operacional"),
    "tab-analitico": document.getElementById("painel-analitico"),
  };

  function ativarAba(abaAtiva) {
    abas.forEach((aba) => {
      const ativa = aba === abaAtiva;
      aba.classList.toggle("is-active", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      paineis[aba.id].hidden = !ativa;
    });

    if (abaAtiva.id === "tab-analitico") renderizarAnalises();
  }

  abas.forEach((aba) => {
    aba.addEventListener("click", () => ativarAba(aba));
    aba.addEventListener("keydown", (e) => {
      const index = abas.indexOf(aba);
      let proximoIndex;
      if (e.key === "ArrowRight") proximoIndex = (index + 1) % abas.length;
      if (e.key === "ArrowLeft")
        proximoIndex = (index - 1 + abas.length) % abas.length;
      if (e.key === "Home") proximoIndex = 0;
      if (e.key === "End") proximoIndex = abas.length - 1;

      if (proximoIndex !== undefined) {
        e.preventDefault();
        abas[proximoIndex].focus();
        ativarAba(abas[proximoIndex]);
      }
    });
  });
}

function inicializarAnalises() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const seletorInicio = document.getElementById("analise-inicio");
  const seletorFim = document.getElementById("analise-fim");
  const seletorGrupo = document.getElementById("analise-grupo");

  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[0];
  seletorFim.value = datas[datas.length - 1];

  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));
  const ultimoDia = banco.historico[datas[datas.length - 1]];
  const grupos = new Set(
    Object.values(ultimoDia.reservatorios).map(
      (reservatorio) => reservatorio.grupo,
    ),
  );
  grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));

  preencherReservatoriosAnalise("TODOS", []);
  seletorInicio.addEventListener("change", renderizarAnalises);
  seletorFim.addEventListener("change", renderizarAnalises);
  seletorGrupo.addEventListener("change", () => {
    const selecoes = Array.from(
      document.getElementById("analise-reservatorios").selectedOptions,
      (option) => option.value,
    );
    preencherReservatoriosAnalise(seletorGrupo.value, selecoes);
    renderizarAnalises();
  });
  document
    .getElementById("analise-reservatorios")
    .addEventListener("change", renderizarAnalises);
}

function preencherReservatoriosAnalise(grupoSelecionado, selecoesAnteriores) {
  const banco = window.bancoDeDados;
  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const reservatorios = banco.historico[ultimaData].reservatorios;
  const seletor = document.getElementById("analise-reservatorios");
  const disponiveis = Object.entries(reservatorios).filter(
    ([, reservatorio]) =>
      grupoSelecionado === "TODOS" || reservatorio.grupo === grupoSelecionado,
  );
  const selecoesValidas = selecoesAnteriores.filter((chave) =>
    disponiveis.some(([disponivel]) => disponivel === chave),
  );
  const chavesSelecionadas = selecoesValidas.length
    ? selecoesValidas
    : disponiveis.slice(0, 3).map(([chave]) => chave);

  seletor.replaceChildren();
  disponiveis.forEach(([chave, reservatorio]) => {
    const option = new Option(
      `${reservatorio.nome} (${reservatorio.grupo})`,
      chave,
    );
    option.selected = chavesSelecionadas.includes(chave);
    seletor.add(option);
  });
}

function renderizarAnalises() {
  const canvasNivel = document.getElementById("grafico-analise-nivel");
  if (!canvasNivel) return;

  Object.values(graficosAnaliticos).forEach((grafico) => grafico.destroy());
  graficosAnaliticos = {};

  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const indiceInicio = datas.indexOf(
    document.getElementById("analise-inicio").value,
  );
  const indiceFim = datas.indexOf(document.getElementById("analise-fim").value);
  const mensagem = document.getElementById("analise-mensagem");
  const resumo = document.getElementById("analise-resumo");
  const corpoTabela = document.getElementById("analise-comparacao");
  resumo.replaceChildren();
  corpoTabela.replaceChildren();
  mensagem.textContent = "";

  if (indiceInicio < 0 || indiceFim < 0 || indiceInicio > indiceFim) {
    mensagem.classList.add("has-alerts");
    mensagem.textContent =
      "A data inicial deve ser anterior ou igual à data final.";
    return;
  }

  const datasPeriodo = datas.slice(indiceInicio, indiceFim + 1);
  const chavesSelecionadas = Array.from(
    document.getElementById("analise-reservatorios").selectedOptions,
    (option) => option.value,
  );
  const ultimaData = datas[datas.length - 1];
  const catalogo = banco.historico[ultimaData].reservatorios;
  const reservatorios = chavesSelecionadas
    .filter((chave) => catalogo[chave])
    .map((chave) => ({ chave, ...catalogo[chave] }));

  if (!reservatorios.length) {
    mensagem.classList.remove("has-alerts");
    mensagem.textContent =
      "Selecione pelo menos um reservatório para visualizar as análises.";
    return;
  }

  const series = reservatorios.map((reservatorio, index) => {
    const alertas = {
      nivelAcimaDe100: 0,
      nivelAcimaDe110: 0,
      nivelNegativo: 0,
      vazaoNegativa: 0,
    };
    const leiturasPorData = datasPeriodo.map((data) => {
      const leituras =
        banco.historico[data]?.reservatorios?.[reservatorio.chave]?.leituras;
      const niveis = resumirLeituras(leituras?.nivel, "nivel");
      const vazoes = resumirLeituras(
        leituras?.vazao,
        "vazao",
        banco.historico[data]?.horarios,
      );
      alertas.nivelAcimaDe100 += niveis.alertas.acimaDe100;
      alertas.nivelAcimaDe110 += niveis.alertas.acimaDe110;
      alertas.nivelNegativo += niveis.alertas.negativo;
      alertas.vazaoNegativa += vazoes.alertas.negativo;
      return {
        nivel: niveis.media,
        nivelMin: niveis.minimo,
        nivelMax: niveis.maximo,
        vazao: vazoes.media,
        vazaoMin: vazoes.minimo,
        vazaoMax: vazoes.maximo,
        vazaoMinHorario: vazoes.horarioMinimo,
        vazaoMaxHorario: vazoes.horarioMaximo,
      };
    });
    const niveis = leiturasPorData
      .map((leituras) => leituras.nivel)
      .filter((valor) => valor !== null);
    const vazoes = leiturasPorData
      .map((leituras) => leituras.vazao)
      .filter((valor) => valor !== null);
    const primeiroNivel = niveis[0];
    const ultimoNivel = niveis[niveis.length - 1];

    return {
      reservatorio,
      color: coresAnaliticas[index % coresAnaliticas.length],
      leiturasPorData,
      mediaNivel: calcularMediaValida(niveis),
      minimoNivel: niveis.length ? Math.min(...niveis) : null,
      maximoNivel: niveis.length ? Math.max(...niveis) : null,
      variacaoNivel:
        primeiroNivel !== undefined && ultimoNivel !== undefined
          ? ultimoNivel - primeiroNivel
          : null,
      mediaVazao: calcularMediaValida(vazoes),
      alertas,
      diasComDados: leiturasPorData.filter(
        (leituras) => leituras.nivel !== null || leituras.vazao !== null,
      ).length,
    };
  });

  const diasComDados = new Set();
  series.forEach((serie) => {
    serie.leiturasPorData.forEach((leituras, index) => {
      if (leituras.nivel !== null || leituras.vazao !== null) {
        diasComDados.add(index);
      }
    });
  });

  criarResumoAnalitico(resumo, [
    [
      "Período",
      `${datasPeriodo[0]} – ${datasPeriodo[datasPeriodo.length - 1]}`,
    ],
    ["Reservatórios", String(reservatorios.length)],
    ["Dias com dados", `${diasComDados.size} de ${datasPeriodo.length}`],
  ]);
  const totalAlertas = series.reduce(
    (totais, serie) => {
      Object.entries(serie.alertas).forEach(([tipo, quantidade]) => {
        totais[tipo] += quantidade;
      });
      return totais;
    },
    {
      nivelAcimaDe100: 0,
      nivelAcimaDe110: 0,
      nivelNegativo: 0,
      vazaoNegativa: 0,
    },
  );
  const mensagensAlerta = [];
  if (totalAlertas.nivelAcimaDe100) {
    mensagensAlerta.push(
      `${totalAlertas.nivelAcimaDe100} leitura(s) de nível acima de 100% foram mantidas`,
    );
  }
  if (totalAlertas.nivelAcimaDe110) {
    mensagensAlerta.push(
      `${totalAlertas.nivelAcimaDe110} leitura(s) de nível acima de 110% foram ignoradas`,
    );
  }
  if (totalAlertas.nivelNegativo) {
    mensagensAlerta.push(
      `${totalAlertas.nivelNegativo} leitura(s) de nível negativa(s) foram ignoradas`,
    );
  }
  if (totalAlertas.vazaoNegativa) {
    mensagensAlerta.push(
      `${totalAlertas.vazaoNegativa} leitura(s) de vazão negativa(s) foram mantidas`,
    );
  }
  mensagem.classList.toggle("has-alerts", mensagensAlerta.length > 0);
  mensagem.textContent = mensagensAlerta.length
    ? `Alerta: ${mensagensAlerta.join("; ")}.`
    : "Sem alertas para os reservatórios e período selecionados.";
  renderizarGraficoAnalitico(
    canvasNivel,
    datasPeriodo,
    series,
    "nivel",
    "Nível médio (%)",
    true,
  );
  renderizarGraficoAnalitico(
    document.getElementById("grafico-analise-vazao"),
    datasPeriodo,
    series,
    "vazao",
    "Vazão média (L/s)",
    false,
  );
  renderizarGraficoFaixaVazao(
    document.getElementById("grafico-analise-vazao-faixa"),
    datasPeriodo,
    series,
  );
  preencherTabelaComparativa(corpoTabela, series);
}

function calcularMediaValida(valores) {
  if (!Array.isArray(valores)) return null;
  const validos = valores
    .filter((valor) => valor !== null && valor !== undefined && valor !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!validos.length) return null;
  return validos.reduce((total, valor) => total + valor, 0) / validos.length;
}

function resumirLeituras(valores, tipo, horarios = []) {
  if (!Array.isArray(valores)) {
    return {
      media: null,
      minimo: null,
      maximo: null,
      horarioMinimo: null,
      horarioMaximo: null,
      alertas: { acimaDe100: 0, acimaDe110: 0, negativo: 0 },
    };
  }
  const numericos = valores
    .map((valor, indice) => ({ valor: Number(valor), indice }))
    .filter(
      ({ valor }, indice) =>
        valores[indice] !== null &&
        valores[indice] !== undefined &&
        valores[indice] !== "" &&
        Number.isFinite(valor),
    );
  const acimaDe100 =
    tipo === "nivel"
      ? numericos.filter(({ valor }) => valor > 100 && valor <= 110).length
      : 0;
  const acimaDe110 =
    tipo === "nivel" ? numericos.filter(({ valor }) => valor > 110).length : 0;
  const negativos = numericos.filter(({ valor }) => valor < 0).length;
  const validos = numericos.filter(
    tipo === "nivel" ? ({ valor }) => valor >= 0 && valor <= 110 : () => true,
  );
  const minimo = validos.length
    ? Math.min(...validos.map(({ valor }) => valor))
    : null;
  const maximo = validos.length
    ? Math.max(...validos.map(({ valor }) => valor))
    : null;
  const leituraMinima = validos.find(({ valor }) => valor === minimo);
  const leituraMaxima = validos.find(({ valor }) => valor === maximo);
  return {
    media: calcularMediaValida(validos.map(({ valor }) => valor)),
    minimo,
    maximo,
    horarioMinimo: leituraMinima
      ? (horarios[leituraMinima.indice] ?? null)
      : null,
    horarioMaximo: leituraMaxima
      ? (horarios[leituraMaxima.indice] ?? null)
      : null,
    alertas: {
      acimaDe100,
      acimaDe110,
      negativo: negativos,
    },
  };
}

function renderizarGraficoFaixaVazao(canvas, datas, series) {
  const datasets = series.flatMap((serie) => [
    {
      label: `${serie.reservatorio.nome} · Mínima`,
      data: serie.leiturasPorData.map((leituras) => leituras.vazaoMin),
      horariosRegistro: serie.leiturasPorData.map(
        (leituras) => leituras.vazaoMinHorario,
      ),
      borderColor: serie.color,
      borderWidth: 1.5,
      borderDash: [5, 4],
      fill: "+1",
      backgroundColor: `${serie.color}22`,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
    },
    {
      label: `${serie.reservatorio.nome} · Máxima`,
      data: serie.leiturasPorData.map((leituras) => leituras.vazaoMax),
      horariosRegistro: serie.leiturasPorData.map(
        (leituras) => leituras.vazaoMaxHorario,
      ),
      borderColor: serie.color,
      backgroundColor: serie.color,
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
    },
  ]);
  const chart = criarGraficoAnalitico(
    canvas,
    datas,
    datasets,
    "Vazão (L/s)",
    false,
    (context) => {
      const horario = context.dataset.horariosRegistro?.[context.dataIndex];
      return horario ? `Horário registrado: ${horario}` : "";
    },
  );
  graficosAnaliticos.vazaoFaixa = chart;
}

function criarResumoAnalitico(container, itens) {
  itens.forEach(([rotulo, valor]) => {
    const card = document.createElement("div");
    card.className = "analysis-summary-card";
    const titulo = document.createElement("span");
    titulo.className = "analysis-summary-label";
    titulo.textContent = rotulo;
    const conteudo = document.createElement("strong");
    conteudo.className = "analysis-summary-value";
    conteudo.textContent = valor;
    card.append(titulo, conteudo);
    container.append(card);
  });
}

function renderizarGraficoAnalitico(
  canvas,
  datas,
  series,
  metrica,
  rotuloEixo,
  escalaPercentual,
) {
  const datasets = series.map((serie) => ({
    label: serie.reservatorio.nome,
    data: serie.leiturasPorData.map((leituras) => leituras[metrica]),
    borderColor: serie.color,
    backgroundColor: serie.color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.25,
    spanGaps: false,
  }));
  const chart = criarGraficoAnalitico(
    canvas,
    datas,
    datasets,
    rotuloEixo,
    escalaPercentual,
  );
  graficosAnaliticos[metrica] = chart;
}

function criarGraficoAnalitico(
  canvas,
  datas,
  datasets,
  rotuloEixo,
  escalaPercentual,
  tooltipAfterLabel,
) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: datas,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: obterVariavelCSS("--text-color"),
            usePointStyle: true,
            boxWidth: 8,
            padding: 16,
          },
        },
        ...(tooltipAfterLabel
          ? { tooltip: { callbacks: { afterLabel: tooltipAfterLabel } } }
          : {}),
      },
      scales: {
        x: {
          ticks: {
            color: obterVariavelCSS("--muted-color"),
            autoSkip: true,
            maxTicksLimit: 12,
            maxRotation: 0,
          },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        y: {
          beginAtZero: !escalaPercentual,
          min: escalaPercentual ? 0 : undefined,
          suggestedMax: escalaPercentual ? 110 : undefined,
          title: {
            display: true,
            text: rotuloEixo,
            color: obterVariavelCSS("--muted-color"),
          },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
      },
    },
  });
  graficosAnaliticos[metrica] = chart;
}

function preencherTabelaComparativa(corpoTabela, series) {
  series.forEach((serie) => {
    const linha = document.createElement("tr");
    const nome = document.createElement("th");
    nome.scope = "row";
    nome.textContent = `${serie.reservatorio.nome} (${serie.reservatorio.grupo})`;
    linha.append(nome);
    [
      formatarMetrica(serie.mediaNivel, "%"),
      `${formatarMetrica(serie.minimoNivel, "%")} / ${formatarMetrica(serie.maximoNivel, "%")}`,
      serie.variacaoNivel === null
        ? "Sem dados"
        : `${serie.variacaoNivel > 0 ? "+" : ""}${serie.variacaoNivel.toFixed(1)} p.p.`,
      formatarMetrica(serie.mediaVazao, " L/s"),
      String(serie.diasComDados),
    ].forEach((valor) => {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.append(celula);
    });
    corpoTabela.append(linha);
  });
}

function formatarMetrica(valor, unidade) {
  return valor === null ? "Sem dados" : `${valor.toFixed(1)}${unidade}`;
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
