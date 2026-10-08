// app.js - Lógica principal do Dashboard

// Guarda as instâncias do Chart.js para destruí-las adequadamente ao atualizar a interface
let instanciasGraficos = {};
let graficosAnaliticos = {};
let graficosEngenharia = {};
let categoriaBoletimAtiva = null;
let analiseReservatorioAberta = false;
let graficoAnaliseComMedias = false;
const TAMANHO_PAGINA_ENGENHARIA = 100;
const MINIMO_DIAS_HISTORICOS_PARA_ESPERAR_DADO = 4;

const LIMITE_ATENCAO_NIVEL_PERCENTUAL = 60;
const LIMITE_CRITICO_NIVEL_PERCENTUAL = 50;
const LIMITE_ATENCAO_VAZAO_PERCENTUAL = 20;
const LIMITE_CRITICO_VAZAO_PERCENTUAL = 35;

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
      if (!document.getElementById("painel-operacional").hidden) {
        renderizarDashboard();
      } else if (!document.getElementById("painel-analitico").hidden) {
        renderizarAnalises();
      } else {
        renderizarEngenharia();
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
  const seletorBaseComparacao = document.getElementById("seletor-base-vazao");
  const seletorEscopo = document.getElementById("seletor-escopo-operacional");
  preencherSeletorFiltro(ultimaDataDoBanco, "TODOS");
  inicializarNavegacao();
  inicializarAnalises();
  inicializarEngenharia();

  const containerGrid = document.getElementById("grid-reservatorios");
  const resumoOperacional = document.getElementById("operational-summary");
  resumoOperacional.addEventListener("click", (e) => {
    const botaoCategoria = e.target.closest("[data-operational-category]");
    if (!botaoCategoria) return;

    const categoria = botaoCategoria.dataset.operationalCategory;
    categoriaBoletimAtiva =
      categoriaBoletimAtiva === categoria ? null : categoria;
    renderizarDashboard();
  });
  document
    .getElementById("operational-details")
    .addEventListener("click", (e) => {
      const botaoReservatorio = e.target.closest("[data-detail-reservoir]");
      if (!botaoReservatorio) return;

      const chave = botaoReservatorio.dataset.detailReservoir;
      categoriaBoletimAtiva = null;
      seletorFiltro.value = `reservatorio:${chave}`;
      seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("painel-operacional").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  containerGrid.addEventListener("click", (e) => {
    const botaoAnalise = e.target.closest("[data-open-reservoir-analysis]");
    if (botaoAnalise) {
      e.preventDefault();
      e.stopPropagation();
      analiseReservatorioAberta = true;
      graficoAnaliseComMedias = false;
      renderizarDashboard();
      document
        .getElementById("analise-grafico-reservatorio")
        .scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const card = e.target.closest(".card");
    if (card) selecionarCard(card);
  });
  const painelAnaliseReservatorio = document.getElementById(
    "analise-grafico-reservatorio",
  );
  painelAnaliseReservatorio.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-reservoir-analysis]")) {
      analiseReservatorioAberta = false;
      renderizarDashboard();
      document.querySelector(".card.is-selected")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const botaoModo = e.target.closest("[data-analysis-chart-mode]");
    if (botaoModo) {
      graficoAnaliseComMedias =
        botaoModo.dataset.analysisChartMode === "averages";
      renderizarDashboard();
    }
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

  seletorFiltro.addEventListener("change", () => {
    if (
      analiseReservatorioAberta &&
      !seletorFiltro.value.startsWith("reservatorio:")
    ) {
      analiseReservatorioAberta = false;
    }
    renderizarDashboard();
  });
  seletorBaseComparacao.addEventListener("change", renderizarDashboard);
  seletorEscopo.addEventListener("change", renderizarDashboard);
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
    "tab-engenharia": document.getElementById("painel-engenharia"),
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
    if (abaAtiva.id === "tab-engenharia") renderizarEngenharia();
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
  const seletorReservatorios = document.getElementById("analise-reservatorios");

  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
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
    const selecoes = obterReservatoriosSelecionados(seletorReservatorios);
    preencherReservatoriosAnalise(seletorGrupo.value, selecoes);
    renderizarAnalises();
  });
  seletorReservatorios.addEventListener("change", () => {
    atualizarContagemReservatorios(
      seletorReservatorios,
      "dica-selecao-reservatorios",
    );
    renderizarAnalises();
  });
}

function inicializarEngenharia() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const ultimaData = datas[datas.length - 1];
  const reservatorios = banco.historico[ultimaData].reservatorios;
  const seletorInicio = document.getElementById("engenharia-inicio");
  const seletorFim = document.getElementById("engenharia-fim");
  const seletorGrupo = document.getElementById("engenharia-grupo");

  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
  seletorFim.value = ultimaData;

  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));
  const grupos = new Set(
    Object.values(reservatorios).map((reservatorio) => reservatorio.grupo),
  );
  grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));
  preencherReservatoriosEngenharia("TODOS", []);

  seletorInicio.addEventListener("change", renderizarEngenharia);
  seletorFim.addEventListener("change", renderizarEngenharia);
  seletorGrupo.addEventListener("change", () => {
    const selecionador = document.getElementById("engenharia-reservatorios");
    const selecionados = obterReservatoriosSelecionados(selecionador);
    preencherReservatoriosEngenharia(seletorGrupo.value, selecionados);
    renderizarEngenharia();
  });
  const seletorReservatorios = document.getElementById(
    "engenharia-reservatorios",
  );
  seletorReservatorios.addEventListener("change", () => {
    atualizarContagemReservatorios(
      seletorReservatorios,
      "dica-selecao-engenharia",
    );
    renderizarEngenharia();
  });
}

function obterIndiceInicioPeriodoRecente(datas, dias = 30) {
  const ultimaDataUTC = converterDataParaUTC(datas[datas.length - 1]);
  const inicioPeriodoUTC = ultimaDataUTC - (dias - 1) * 86400000;
  const indice = datas.findIndex(
    (data) => converterDataParaUTC(data) >= inicioPeriodoUTC,
  );
  return indice < 0 ? 0 : indice;
}

function obterReservatoriosSelecionados(container) {
  return Array.from(
    container.querySelectorAll('input[type="checkbox"]:checked'),
    (checkbox) => checkbox.value,
  );
}

function atualizarContagemReservatorios(container, idDica) {
  const selecionados = obterReservatoriosSelecionados(container).length;
  const disponiveis = container.querySelectorAll(
    'input[type="checkbox"]',
  ).length;
  document.getElementById(idDica).textContent =
    `${selecionados} de ${disponiveis} reservatório(s) selecionado(s). ` +
    "Marque os itens desejados.";
}

function renderizarListaReservatorios(container, disponiveis, selecionados, idDica) {
  container.replaceChildren();
  disponiveis.forEach(([chave, reservatorio], indice) => {
    const rotulo = document.createElement("label");
    rotulo.className = "reservoir-checkbox-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = chave;
    checkbox.checked = selecionados.includes(chave);
    checkbox.id = `${container.id}-opcao-${indice}`;
    const nome = document.createElement("span");
    nome.textContent = `${reservatorio.nome} (${reservatorio.grupo})`;
    rotulo.htmlFor = checkbox.id;
    rotulo.append(checkbox, nome);
    container.append(rotulo);
  });
  atualizarContagemReservatorios(container, idDica);
}

function preencherReservatoriosEngenharia(
  grupoSelecionado,
  selecoesAnteriores,
) {
  const banco = window.bancoDeDados;
  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const reservatorios = banco.historico[ultimaData].reservatorios;
  const seletor = document.getElementById("engenharia-reservatorios");
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

  renderizarListaReservatorios(
    seletor,
    disponiveis,
    chavesSelecionadas,
    "dica-selecao-engenharia",
  );
}

function renderizarEngenharia() {
  Object.values(graficosEngenharia).forEach((grafico) => grafico.destroy());
  graficosEngenharia = {};

  const datas = window.bancoDeDados.datasDisponiveis;
  const inicio = document.getElementById("engenharia-inicio").value;
  const fim = document.getElementById("engenharia-fim").value;
  const inicioIndex = datas.indexOf(inicio);
  const fimIndex = datas.indexOf(fim);
  const mensagem = document.getElementById("engenharia-mensagem");
  const resumo = document.getElementById("engenharia-resumo");
  const corpoTabela = document.getElementById("engenharia-registros");
  const paginacao = document.getElementById("engenharia-paginacao");
  const registrosVisiveis = document.getElementById(
    "engenharia-registros-visiveis",
  );
  const botaoCarregarMais = document.getElementById(
    "engenharia-carregar-mais",
  );
  mensagem.classList.remove("has-alerts");
  resumo.replaceChildren();
  corpoTabela.replaceChildren();
  paginacao.hidden = true;
  botaoCarregarMais.onclick = null;

  if (inicioIndex < 0 || fimIndex < 0 || inicioIndex > fimIndex) {
    mensagem.classList.add("has-alerts");
    mensagem.textContent =
      "A data inicial deve ser anterior ou igual à data final.";
    return;
  }

  const datasPeriodo = datas.slice(inicioIndex, fimIndex + 1);
  const chavesSelecionadas = obterReservatoriosSelecionados(
    document.getElementById("engenharia-reservatorios"),
  );
  if (!chavesSelecionadas.length) {
    mensagem.textContent =
      "Selecione pelo menos um reservatório para consultar os dados.";
    return;
  }

  const catalogo =
    window.bancoDeDados.historico[datas[datas.length - 1]].reservatorios;
  const totais = {
    registros: 0,
    nivelValidas: 0,
    nivelEsperadas: 0,
    vazaoValidas: 0,
    vazaoEsperadas: 0,
    nivelAcimaDe100: 0,
    nivelAcimaDe110: 0,
    nivelNegativo: 0,
    vazaoNegativa: 0,
    diasSemRegistro: 0,
  };
  const series = chavesSelecionadas.map((chave, indice) => ({
    chave,
    reservatorio: catalogo[chave],
    color: coresAnaliticas[indice % coresAnaliticas.length],
    leiturasPorData: [],
  }));
  const registrosTabela = [];

  datasPeriodo.forEach((data) => {
    const dadosDoDia = window.bancoDeDados.historico[data];
    const horarios = dadosDoDia?.horarios ?? [];
    chavesSelecionadas.forEach((chave, indiceReservatorio) => {
      const reservatorio = dadosDoDia?.reservatorios?.[chave];
      const leituras = reservatorio?.leituras;
      const niveis = resumirLeiturasEstruturadas(leituras?.nivel, horarios);
      const vazoes = resumirLeiturasEstruturadas(leituras?.vazao, horarios);
      const quantidadeSlots = Math.max(
        horarios.length,
        leituras?.nivel?.length ?? 0,
        leituras?.vazao?.length ?? 0,
      );
      const qualidade = avaliarQualidadeLeituras(
        leituras?.nivel,
        leituras?.vazao,
        quantidadeSlots,
      );

      totais.registros += reservatorio ? 1 : 0;
      totais.diasSemRegistro += reservatorio ? 0 : 1;
      totais.nivelValidas += niveis.quantidade;
      totais.nivelEsperadas += quantidadeSlots;
      totais.vazaoValidas += vazoes.quantidade;
      totais.vazaoEsperadas += quantidadeSlots;
      Object.keys(qualidade).forEach((tipo) => {
        totais[tipo] += qualidade[tipo];
      });
      series[indiceReservatorio].leiturasPorData.push({
        nivelMin: niveis.minimo,
        nivelMedia: niveis.media,
        nivelMax: niveis.maximo,
        vazaoMin: vazoes.minimo,
        vazaoMedia: vazoes.media,
        vazaoMax: vazoes.maximo,
      });

      registrosTabela.push({
        chave,
        data,
        reservatorio: reservatorio ?? catalogo[chave],
        horarios,
        niveis,
        vazoes,
        qualidade,
        temRegistro: Boolean(reservatorio),
        quantidadeSlots,
      });
    });
  });

  const totalSinalizacoes =
    totais.nivelAcimaDe100 +
    totais.nivelAcimaDe110 +
    totais.nivelNegativo +
    totais.vazaoNegativa;
  criarResumoAnalitico(resumo, [
    ["Período consultado", `${inicio} – ${fim}`],
    ["Registros diários", String(totais.registros)],
    [
      "Cobertura de nível",
      `${totais.nivelValidas} / ${totais.nivelEsperadas} leituras`,
    ],
    [
      "Cobertura de vazão",
      `${totais.vazaoValidas} / ${totais.vazaoEsperadas} leituras`,
    ],
    ["Sinalizações para revisão", String(totalSinalizacoes)],
  ]);
  renderizarGraficosEngenharia(datasPeriodo, series);
  let quantidadeExibida = 0;
  const carregarProximaPagina = () => {
    const fimPagina = Math.min(
      quantidadeExibida + TAMANHO_PAGINA_ENGENHARIA,
      registrosTabela.length,
    );
    const fragmento = document.createDocumentFragment();
    for (; quantidadeExibida < fimPagina; quantidadeExibida += 1) {
      fragmento.append(
        criarLinhaEngenharia(registrosTabela[quantidadeExibida]),
      );
    }
    corpoTabela.append(fragmento);
    registrosVisiveis.textContent =
      `Exibindo ${quantidadeExibida} de ${registrosTabela.length} registros.`;
    botaoCarregarMais.hidden = quantidadeExibida >= registrosTabela.length;
  };
  if (registrosTabela.length > TAMANHO_PAGINA_ENGENHARIA) {
    paginacao.hidden = false;
    botaoCarregarMais.onclick = carregarProximaPagina;
    carregarProximaPagina();
  } else {
    paginacao.hidden = registrosTabela.length === 0;
    carregarProximaPagina();
  }
  mensagem.textContent =
    "Os valores originais são preservados nesta visão. Sinalizações destacam " +
    "leituras para revisão e não representam alarmes ou limites operacionais.";
  if (totais.diasSemRegistro) {
    mensagem.textContent +=
      ` Há ${totais.diasSemRegistro} combinação(ões) de reservatório/data ` +
      "sem registro no histórico.";
  }
}

function renderizarGraficosEngenharia(datas, series) {
  const metricas = [
    {
      id: "nivel",
      canvas: document.getElementById("grafico-engenharia-nivel"),
      eixo: "Nível (%)",
      minimo: "nivelMin",
      media: "nivelMedia",
      maximo: "nivelMax",
    },
    {
      id: "vazao",
      canvas: document.getElementById("grafico-engenharia-vazao"),
      eixo: "Vazão (L/s)",
      minimo: "vazaoMin",
      media: "vazaoMedia",
      maximo: "vazaoMax",
    },
  ];
  const estilos = [
    { rotulo: "Mínima", dash: [5, 4], pointStyle: "circle" },
    { rotulo: "Média", dash: [], pointStyle: "rectRounded" },
    { rotulo: "Máxima", dash: [2, 3], pointStyle: "triangle" },
  ];

  metricas.forEach((metrica) => {
    const datasets = series.flatMap((serie) =>
      [
        { campo: metrica.minimo, estilo: estilos[0] },
        { campo: metrica.media, estilo: estilos[1] },
        { campo: metrica.maximo, estilo: estilos[2] },
      ].map(({ campo, estilo }) => ({
        label: `${serie.reservatorio.nome} · ${estilo.rotulo}`,
        data: serie.leiturasPorData.map((leituras) => leituras[campo]),
        borderColor: serie.color,
        backgroundColor: serie.color,
        borderWidth: estilo.rotulo === "Média" ? 2.5 : 1.5,
        borderDash: estilo.dash,
        pointStyle: estilo.pointStyle,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        spanGaps: false,
      })),
    );
    graficosEngenharia[metrica.id] = new Chart(metrica.canvas, {
      type: "line",
      data: { labels: datas, datasets },
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
              padding: 14,
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const valor = context.parsed.y;
                return `${context.dataset.label}: ${valor === null ? "Sem dados" : valor.toFixed(1)}`;
              },
            },
          },
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
            beginAtZero: true,
            suggestedMax: metrica.id === "nivel" ? 110 : undefined,
            title: {
              display: true,
              text: metrica.eixo,
              color: obterVariavelCSS("--muted-color"),
            },
            ticks: { color: obterVariavelCSS("--muted-color") },
            grid: { color: obterVariavelCSS("--border-color") },
          },
        },
      },
    });
  });
}

function resumirLeiturasEstruturadas(valores, horarios) {
  const leituras = Array.isArray(valores)
    ? valores
        .map((valor, indice) => ({
          valor: Number(valor),
          indice,
        }))
        .filter(
          ({ valor }, indice) =>
            valores[indice] !== null &&
            valores[indice] !== undefined &&
            valores[indice] !== "" &&
            Number.isFinite(valor),
        )
    : [];
  const numeros = leituras.map(({ valor }) => valor);
  const minimo = numeros.length ? Math.min(...numeros) : null;
  const maximo = numeros.length ? Math.max(...numeros) : null;
  const leituraMinima = leituras.find(({ valor }) => valor === minimo);
  const leituraMaxima = leituras.find(({ valor }) => valor === maximo);

  return {
    quantidade: numeros.length,
    minimo,
    media: calcularMediaValida(numeros),
    maximo,
    horarioMinimo: leituraMinima
      ? (horarios[leituraMinima.indice] ??
        `Leitura ${leituraMinima.indice + 1}`)
      : null,
    horarioMaximo: leituraMaxima
      ? (horarios[leituraMaxima.indice] ??
        `Leitura ${leituraMaxima.indice + 1}`)
      : null,
  };
}

function avaliarQualidadeLeituras(niveis, vazoes, quantidadeSlots) {
  const valoresNumericos = (valores) =>
    Array.isArray(valores)
      ? valores
          .filter(
            (valor) => valor !== null && valor !== undefined && valor !== "",
          )
          .map(Number)
          .filter(Number.isFinite)
      : [];
  const niveisNumericos = valoresNumericos(niveis);
  const vazoesNumericas = valoresNumericos(vazoes);
  return {
    nivelAcimaDe100: niveisNumericos.filter(
      (valor) => valor > 100 && valor <= 110,
    ).length,
    nivelAcimaDe110: niveisNumericos.filter((valor) => valor > 110).length,
    nivelNegativo: niveisNumericos.filter((valor) => valor < 0).length,
    vazaoNegativa: vazoesNumericas.filter((valor) => valor < 0).length,
    nivelAusente: Math.max(0, quantidadeSlots - niveisNumericos.length),
    vazaoAusente: Math.max(0, quantidadeSlots - vazoesNumericas.length),
  };
}

function criarLinhaEngenharia({
  chave,
  data,
  reservatorio,
  horarios,
  niveis,
  vazoes,
  qualidade,
  temRegistro,
  quantidadeSlots,
}) {
  const linha = document.createElement("tr");
  const idDetalhes =
    `engenharia-detalhes-${chave.replace(/[^a-zA-Z0-9_-]/g, "-")}-` +
    data.replace(/\D/g, "");
  const celulaId = document.createElement("td");
  const botaoId = document.createElement("button");
  botaoId.className = "engineering-id-button";
  botaoId.type = "button";
  botaoId.textContent = chave;
  botaoId.setAttribute("aria-expanded", "false");
  botaoId.setAttribute("aria-controls", idDetalhes);
  celulaId.append(botaoId);
  linha.append(celulaId);
  appendCelulaEngenharia(linha, data);

  appendCelulaExtremoEngenharia(linha, niveis.minimo, niveis.horarioMinimo);
  appendCelulaEngenharia(linha, formatarMetrica(niveis.media, ""));
  appendCelulaExtremoEngenharia(linha, niveis.maximo, niveis.horarioMaximo);
  appendCelulaExtremoEngenharia(linha, vazoes.minimo, vazoes.horarioMinimo);
  appendCelulaEngenharia(linha, formatarMetrica(vazoes.media, ""));
  appendCelulaExtremoEngenharia(linha, vazoes.maximo, vazoes.horarioMaximo);
  appendCelulaEngenharia(linha, criarSinalizacoesEngenharia(qualidade));

  const linhaDetalhes = document.createElement("tr");
  linhaDetalhes.className = "engineering-details-row";
  linhaDetalhes.hidden = true;
  linhaDetalhes.id = idDetalhes;
  const celulaDetalhes = document.createElement("td");
  celulaDetalhes.colSpan = 9;
  const conteudoDetalhes = document.createElement("div");
  conteudoDetalhes.className = "engineering-details-content";
  const identificacao = document.createElement("strong");
  identificacao.textContent = reservatorio
    ? `${reservatorio.nome} (${reservatorio.grupo})`
    : `${chave} — Reservatório sem registro nesta data`;
  const cobertura = document.createElement("span");
  cobertura.textContent =
    `Leituras numéricas — nível: ${niveis.quantidade} de ${quantidadeSlots}; ` +
    `vazão: ${vazoes.quantidade} de ${quantidadeSlots}`;
  conteudoDetalhes.append(identificacao, cobertura);

  celulaDetalhes.append(conteudoDetalhes);
  linhaDetalhes.append(celulaDetalhes);
  let leiturasCarregadas = false;
  botaoId.addEventListener("click", () => {
    const expandido = botaoId.getAttribute("aria-expanded") === "true";
    if (!expandido && !leiturasCarregadas) {
      if (temRegistro) {
        const tabelaLeituras = criarTabelaLeiturasHorarias(
          horarios,
          reservatorio.leituras,
          quantidadeSlots,
        );
        tabelaLeituras.classList.add("engineering-expanded-readings");
        conteudoDetalhes.append(tabelaLeituras);
      } else {
        const aviso = document.createElement("p");
        aviso.className = "engineering-no-data";
        aviso.textContent = "Não há dados deste reservatório nesta data.";
        conteudoDetalhes.append(aviso);
      }
      leiturasCarregadas = true;
    }
    botaoId.setAttribute("aria-expanded", String(!expandido));
    linhaDetalhes.hidden = expandido;
  });

  const linhas = document.createDocumentFragment();
  linhas.append(linha, linhaDetalhes);
  return linhas;
}

function appendCelulaExtremoEngenharia(linha, valor, horario) {
  const celula = document.createElement("td");
  const extremo = document.createElement("div");
  extremo.className = "engineering-extreme";
  const valorElemento = document.createElement("strong");
  valorElemento.textContent = valor === null ? "Sem dados" : valor.toFixed(1);
  const horarioElemento = document.createElement("span");
  horarioElemento.textContent = horario ?? "—";
  extremo.append(valorElemento, horarioElemento);
  celula.append(extremo);
  linha.append(celula);
}

function criarTabelaLeiturasHorarias(horarios, leituras, quantidadeSlots) {
  const tabela = document.createElement("table");
  tabela.className = "hourly-readings-table";
  const cabecalho = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  ["Horário", "Nível (%)", "Vazão (L/s)", "Sinalizações"].forEach((rotulo) => {
    const celula = document.createElement("th");
    celula.scope = "col";
    celula.textContent = rotulo;
    linhaCabecalho.append(celula);
  });
  cabecalho.append(linhaCabecalho);
  tabela.append(cabecalho);

  const corpo = document.createElement("tbody");
  for (let indice = 0; indice < quantidadeSlots; indice += 1) {
    const linha = document.createElement("tr");
    const nivel = leituras.nivel?.[indice];
    const vazao = leituras.vazao?.[indice];
    appendCelulaEngenharia(linha, horarios[indice] ?? `Leitura ${indice + 1}`);
    appendCelulaEngenharia(linha, formatarLeituraOriginal(nivel));
    appendCelulaEngenharia(linha, formatarLeituraOriginal(vazao));
    appendCelulaEngenharia(
      linha,
      criarSinalizacoesEngenharia(
        avaliarQualidadeLeituras([nivel], [vazao], 1),
        true,
      ),
    );
    corpo.append(linha);
  }
  tabela.append(corpo);
  return tabela;
}

function criarSinalizacoesEngenharia(qualidade, compacta = false) {
  const sinalizacoes = [];
  if (qualidade.nivelAcimaDe100) {
    sinalizacoes.push(`Nível >100%: ${qualidade.nivelAcimaDe100}`);
  }
  if (qualidade.nivelAcimaDe110) {
    sinalizacoes.push(`Nível >110%: ${qualidade.nivelAcimaDe110}`);
  }
  if (qualidade.nivelNegativo) {
    sinalizacoes.push(`Nível negativo: ${qualidade.nivelNegativo}`);
  }
  if (qualidade.vazaoNegativa) {
    sinalizacoes.push(`Vazão negativa: ${qualidade.vazaoNegativa}`);
  }
  if (!compacta && qualidade.nivelAusente) {
    sinalizacoes.push(`Nível ausente: ${qualidade.nivelAusente}`);
  }
  if (!compacta && qualidade.vazaoAusente) {
    sinalizacoes.push(`Vazão ausente: ${qualidade.vazaoAusente}`);
  }

  if (!sinalizacoes.length) {
    const semSinalizacao = document.createElement("span");
    semSinalizacao.className = "engineering-ok";
    semSinalizacao.textContent = "—";
    return semSinalizacao;
  }

  const lista = document.createElement("ul");
  lista.className = "engineering-flags";
  sinalizacoes.forEach((sinalizacao) => {
    const item = document.createElement("li");
    item.textContent = sinalizacao;
    lista.append(item);
  });
  return lista;
}

function appendCelulaEngenharia(linha, conteudo) {
  const celula = document.createElement("td");
  if (conteudo instanceof Node) {
    celula.append(conteudo);
  } else {
    celula.textContent = conteudo;
  }
  linha.append(celula);
}

function formatarLeituraOriginal(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toFixed(1) : String(valor);
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

  renderizarListaReservatorios(
    seletor,
    disponiveis,
    chavesSelecionadas,
    "dica-selecao-reservatorios",
  );
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
  const chavesSelecionadas = obterReservatoriosSelecionados(
    document.getElementById("analise-reservatorios"),
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
          ? calcularVariacaoPercentual(ultimoNivel, primeiroNivel)
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
        ? "Sem comparação"
        : formatarPercentual(serie.variacaoNivel),
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
  const painelOperacional = document.getElementById("painel-operacional");
  const resumoOperacional = painelOperacional.querySelector(".operational-brief");
  const painelAnaliseReservatorio = document.getElementById(
    "analise-grafico-reservatorio",
  );
  if (
    analiseReservatorioAberta &&
    !filtroSelecionado.startsWith("reservatorio:")
  ) {
    analiseReservatorioAberta = false;
  }
  containerGrid.hidden =
    categoriaBoletimAtiva !== null || analiseReservatorioAberta;
  resumoOperacional.hidden = analiseReservatorioAberta;
  painelAnaliseReservatorio.hidden = !analiseReservatorioAberta;
  containerGrid.classList.toggle(
    "has-selected-reservoir",
    filtroSelecionado.startsWith("reservatorio:"),
  );
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
  const datas = banco.datasDisponiveis;
  const indiceData = datas.indexOf(dataSelecionada);
  const dataAnterior = indiceData > 0 ? datas[indiceData - 1] : null;
  const dadosDiaAnterior = dataAnterior ? banco.historico[dataAnterior] : null;
  const reservatoriosDiaAnterior = dadosDiaAnterior?.reservatorios ?? {};
  const baseComparacao = document.getElementById("seletor-base-vazao").value;
  const escopoOperacional = document.getElementById(
    "seletor-escopo-operacional",
  ).value;

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

  renderizarBoletimOperacional({
    dataSelecionada,
    dataAnterior,
    filtroSelecionado,
    reservatorios,
    reservatoriosDiaAnterior,
    horarios,
    banco,
    baseComparacao,
    escopoOperacional,
  });

  // Renderiza os cards
  chavesParaExibir.forEach((chave) => {
    const res = reservatorios[chave];
    const selecionado = filtroSelecionado === `reservatorio:${chave}`;
    const exibirGrafico = !visaoGeral;
    const cardHTML = criarCardHTML(
      res,
      chave,
      exibirGrafico,
      selecionado,
      horarios,
      banco,
      dataSelecionada,
      baseComparacao,
    );
    containerGrid.insertAdjacentHTML("beforeend", cardHTML);
    if (selecionado) {
      const painelAlarme = criarPainelInformativoAlarme(
        res,
        chave,
        horarios,
        banco,
        dataSelecionada,
        baseComparacao,
      );
      containerGrid.append(painelAlarme);
    }

    if (exibirGrafico && !analiseReservatorioAberta) {
      renderizarGrafico(res.nome, horarios, res.leituras);
      if (selecionado) {
        renderizarGrafico(res.nome, horarios, res.leituras, true);
      }
    }
    if (selecionado && analiseReservatorioAberta) {
      renderizarAnaliseGraficoReservatorio(
        painelAnaliseReservatorio,
        res,
        chave,
        dataSelecionada,
        horarios,
      );
    }
  });
}

function renderizarBoletimOperacional({
  dataSelecionada,
  dataAnterior,
  filtroSelecionado,
  reservatorios,
  reservatoriosDiaAnterior,
  horarios,
  banco,
  baseComparacao,
  escopoOperacional,
}) {
  const descricao = document.getElementById("operational-brief-description");
  const resumo = document.getElementById("operational-summary");
  const detalhes = document.getElementById("operational-details");
  const qualidadeDados = document.getElementById("operational-data-quality");
  const textoComparacao = [];
  if (escopoOperacional !== "vazao") {
    textoComparacao.push(
      `Nível comparado com a média diária de ${obterRotuloBaseComparacao(baseComparacao)}; atenção abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%, crítico abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}%.`,
    );
  }
  if (escopoOperacional !== "nivel") {
    textoComparacao.push(
      `Vazão mínima/máxima comparada com ${obterRotuloBaseComparacao(baseComparacao)}. Quedas ou aumentos de 20% geram atenção; acima de 35% são críticos.`,
    );
  }
  descricao.textContent = `Dados de ${dataSelecionada}. ${textoComparacao.join(" ")}`;

  const chavesAuditoria = new Set([
    ...Object.keys(reservatorios),
    ...Object.keys(reservatoriosDiaAnterior),
  ]);
  const chavesFiltradas = Array.from(chavesAuditoria).filter((chave) => {
    const atual = reservatorios[chave];
    const anterior = reservatoriosDiaAnterior[chave];
    if (filtroSelecionado.startsWith("grupo:")) {
      const grupo = filtroSelecionado.slice("grupo:".length);
      return (atual ?? anterior)?.grupo === grupo;
    }
    if (filtroSelecionado.startsWith("reservatorio:")) {
      return chave === filtroSelecionado.slice("reservatorio:".length);
    }
    return true;
  });

  const contagens = {
    normal: [],
    atencao: [],
    critico: [],
    incompletos: [],
    semRegistro: 0,
    leiturasAusentes: 0,
    leiturasEsperadas: 0,
  };
  const quantidadeSlots = horarios.length;

  chavesFiltradas.forEach((chave) => {
    const reservatorio = reservatorios[chave];
    const leituras = reservatorio?.leituras;
    const niveis = resumirLeiturasEstruturadas(leituras?.nivel, horarios);
    const vazoes = resumirLeiturasEstruturadas(leituras?.vazao, horarios);
    const esperadasPorVariavel = Math.max(
      quantidadeSlots,
      leituras?.nivel?.length ?? 0,
      leituras?.vazao?.length ?? 0,
    );
    const nivelAtivo = escopoOperacional !== "vazao";
    const vazaoAtiva = escopoOperacional !== "nivel";
    const nivelEsperadoHistoricamente = temLeiturasHistoricasHabituais(
      banco,
      chave,
      "nivel",
      dataSelecionada,
    );
    const vazaoEsperadaHistoricamente = temLeiturasHistoricasHabituais(
      banco,
      chave,
      "vazao",
      dataSelecionada,
    );
    const nivelEsperado = nivelAtivo && nivelEsperadoHistoricamente;
    const vazaoEsperada = vazaoAtiva && vazaoEsperadaHistoricamente;
    const ausentesNivel = obterLeiturasAusentes(
      { nivel: leituras?.nivel },
      esperadasPorVariavel,
      horarios,
      ["nivel"],
    );
    const ausentesVazao = obterLeiturasAusentes(
      { vazao: leituras?.vazao },
      esperadasPorVariavel,
      horarios,
      ["vazao"],
    );
    const ausentesSelecionadas = [
      ...(nivelEsperado ? ausentesNivel : []),
      ...(vazaoEsperada ? ausentesVazao : []),
    ];
    const esperadas =
      esperadasPorVariavel * (Number(nivelEsperado) + Number(vazaoEsperada));
    const validas =
      (nivelEsperado ? niveis.quantidade : 0) +
      (vazaoEsperada ? vazoes.quantidade : 0);

    contagens.leiturasEsperadas += esperadas;
    contagens.leiturasAusentes += esperadas - validas;
    const registro = {
      chave,
      reservatorio: reservatorio ?? reservatoriosDiaAnterior[chave],
      atual: reservatorio,
      anterior: reservatoriosDiaAnterior[chave],
      ausentes: ausentesSelecionadas,
      statusNivel: reservatorio
        ? avaliarStatusNivel(reservatorio.leituras?.nivel)
        : null,
      comparacaoNivel: reservatorio
        ? obterComparacaoNivel(
            banco,
            chave,
            dataSelecionada,
            baseComparacao,
            horarios,
            obterUltimaLeituraNivel(reservatorio.leituras?.nivel),
          )
        : null,
      alertaVazao: reservatorio
        ? avaliarAlertaVazao(
            reservatorio.leituras?.vazao,
            obterReferenciaVazao(
              banco,
              chave,
              dataSelecionada,
              baseComparacao,
              horarios,
            ),
            horarios,
          )
        : null,
    };
    if (!reservatorio) {
      if (!nivelEsperado && !vazaoEsperada) return;
      contagens.semRegistro += 1;
      contagens.incompletos.push(registro);
      return;
    }

    const statusNivelAtivo =
      nivelAtivo &&
      ["Normal", "Atenção", "Crítico"].includes(registro.statusNivel)
        ? registro.statusNivel
        : null;
    const statusVazaoAtivo =
      vazaoEsperada &&
      ["Normal", "Atenção", "Crítico"].includes(registro.alertaVazao?.status)
        ? registro.alertaVazao.status
        : null;
    const vazaoSemComparacao =
      vazaoEsperada && registro.alertaVazao?.status === "Sem comparação";
    const nivelSemDados =
      nivelAtivo && registro.statusNivel === "Sem Dados";
    const statusAtivos = [statusNivelAtivo, statusVazaoAtivo].filter(Boolean);
    if (statusAtivos.includes("Crítico")) contagens.critico.push(registro);
    else if (statusAtivos.includes("Atenção")) contagens.atencao.push(registro);
    else if (
      !vazaoSemComparacao &&
      !nivelSemDados &&
      statusAtivos.length > 0 &&
      statusAtivos.every((statusAtivo) => statusAtivo === "Normal")
    ) {
      contagens.normal.push(registro);
    }
    if (
      ausentesSelecionadas.length > 0 || nivelSemDados
    ) {
      contagens.incompletos.push(registro);
    }
  });

  const categorias = [
    {
      chave: "normal",
      rotulo: "Normais",
      classe: "",
      registros: contagens.normal,
    },
    {
      chave: "critico",
      rotulo: "Críticos",
      classe: "is-critical",
      registros: contagens.critico,
    },
    {
      chave: "atencao",
      rotulo: "Atenção",
      classe: "is-attention",
      registros: contagens.atencao,
    },
    {
      chave: "incompletos",
      rotulo: "Incompletos",
      classe: "is-incomplete",
      registros: contagens.incompletos,
    },
  ];
  resumo.replaceChildren(
    ...categorias.map(({ chave, rotulo, classe, registros }) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = `operational-summary-card ${classe}`.trim();
      botao.dataset.operationalCategory = chave;
      botao.setAttribute(
        "aria-pressed",
        String(categoriaBoletimAtiva === chave),
      );
      botao.setAttribute(
        "aria-expanded",
        String(categoriaBoletimAtiva === chave),
      );
      botao.setAttribute("aria-controls", "operational-details");

      const label = document.createElement("span");
      label.className = "operational-summary-label";
      label.textContent = rotulo;
      const total = document.createElement("strong");
      total.textContent = String(registros.length);
      botao.append(label, total);
      return botao;
    }),
  );
  renderizarDetalhesBoletim(
    detalhes,
    categorias.find(({ chave }) => chave === categoriaBoletimAtiva) ?? null,
    dataSelecionada,
    horarios,
    escopoOperacional,
    baseComparacao,
  );

  const ausencias = `${contagens.leiturasAusentes} de ${contagens.leiturasEsperadas} leituras selecionadas esperadas ausentes`;
  const registrosAusentes = contagens.semRegistro
    ? ` ${contagens.semRegistro} reservatório(s) sem registro em ${dataSelecionada}.`
    : "";
  qualidadeDados.textContent = `${ausencias}.${registrosAusentes}`;
  qualidadeDados.classList.toggle(
    "has-missing-data",
    contagens.leiturasAusentes > 0 || contagens.semRegistro > 0,
  );
}

function obterLeiturasAusentes(
  leituras,
  quantidadeSlots,
  horarios,
  tipos = ["nivel", "vazao"],
) {
  const ausentes = [];
  tipos.forEach((tipo) => {
    for (let indice = 0; indice < quantidadeSlots; indice += 1) {
      const valor = leituras?.[tipo]?.[indice];
      if (
        valor !== null &&
        valor !== undefined &&
        valor !== "" &&
        Number.isFinite(Number(valor))
      ) {
        continue;
      }
      ausentes.push({
        tipo: tipo === "nivel" ? "Nível" : "Vazão",
        horario: horarios[indice] ?? `Leitura ${indice + 1}`,
      });
    }
  });
  return ausentes;
}

function obterRotuloBaseComparacao(base) {
  const rotulos = {
    "7d-calendar": "últimos 7 dias corridos",
    "30d-calendar": "últimos 30 dias corridos",
    "same-weekday-4": "mesmo dia da semana nas últimas 4 semanas",
    global: "histórico global",
  };
  return rotulos[base] ?? rotulos["7d-calendar"];
}

function obterIdentificacaoReservatorio(chave) {
  return chave.match(/\b(?:R\d{1,3}(?:-[A-Z])?|ES\d{2})\b/i)?.[0] ?? chave;
}

function obterRotuloEscopo(escopo) {
  if (escopo === "nivel") return "nível";
  if (escopo === "vazao") return "vazão";
  return "nível e vazão";
}

function converterDataParaUTC(data) {
  const [dia, mes, ano] = data.split("/").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function obterDatasBaseComparacao(banco, dataSelecionada, base) {
  const datas = banco.datasDisponiveis;
  const indiceData = datas.indexOf(dataSelecionada);
  if (indiceData <= 0) return [];

  const dataAtualUTC = converterDataParaUTC(dataSelecionada);
  const diaSemanaAtual = new Date(dataAtualUTC).getUTCDay();
  return datas.slice(0, indiceData).filter((data) => {
    if (base === "global") return true;

    const diferencaDias =
      (dataAtualUTC - converterDataParaUTC(data)) / 86400000;
    if (base === "7d-calendar") return diferencaDias <= 7;
    if (base === "30d-calendar") return diferencaDias <= 30;
    if (base === "same-weekday-4") {
      return (
        diferencaDias <= 28 &&
        new Date(converterDataParaUTC(data)).getUTCDay() === diaSemanaAtual
      );
    }
    return false;
  });
}

function temLeiturasHistoricasHabituais(
  banco,
  chaveReservatorio,
  tipo,
  dataSelecionada,
) {
  const indiceData = banco.datasDisponiveis.indexOf(dataSelecionada);
  if (indiceData < 0) return false;

  const datasHistoricas = banco.datasDisponiveis.slice(0, indiceData + 1);
  const diasComLeitura = datasHistoricas.filter((data) => {
    const valores =
      banco.historico[data]?.reservatorios?.[chaveReservatorio]?.leituras?.[
        tipo
      ];
    return resumirLeiturasEstruturadas(valores, banco.historico[data]?.horarios)
      .quantidade > 0;
  }).length;

  return (
    diasComLeitura >= MINIMO_DIAS_HISTORICOS_PARA_ESPERAR_DADO &&
    diasComLeitura / datasHistoricas.length >= 0.5
  );
}

function obterComparacaoNivel(
  banco,
  chaveReservatorio,
  dataSelecionada,
  base,
  horarios,
  nivelAtual,
) {
  const resumos = obterDatasBaseComparacao(banco, dataSelecionada, base)
    .map((data) => {
      const reservatorio =
        banco.historico[data]?.reservatorios?.[chaveReservatorio];
      if (!reservatorio) return null;
      const resumo = resumirLeiturasEstruturadas(
        filtrarLeiturasNivelValidas(reservatorio.leituras?.nivel),
        banco.historico[data]?.horarios ?? horarios,
      );
      return resumo.media === null ? null : { data, media: resumo.media };
    })
    .filter(Boolean);
  const medias = resumos.map(({ media }) => media);
  const referencia =
    medias.length >= 2
      ? medias.reduce((soma, valor) => soma + valor, 0) / medias.length
      : null;

  return {
    nivelAtual,
    referencia,
    variacao:
      nivelAtual !== null && referencia !== null && referencia !== 0
        ? calcularVariacaoPercentual(nivelAtual, referencia)
        : null,
    quantidade: medias.length,
    datas: resumos.map(({ data }) => data),
  };
}

function obterReferenciaVazao(
  banco,
  chaveReservatorio,
  dataSelecionada,
  base,
  horarios,
) {
  const resumosDiarios = obterDatasBaseComparacao(
    banco,
    dataSelecionada,
    base,
  )
    .map((data) => {
      const reservatorio =
        banco.historico[data]?.reservatorios?.[chaveReservatorio];
      if (!reservatorio) return null;
      const resumo = resumirLeiturasEstruturadas(
        filtrarLeiturasVazaoValidas(reservatorio.leituras?.vazao),
        banco.historico[data]?.horarios ?? horarios,
      );
      return resumo.quantidade ? { data, ...resumo } : null;
    })
    .filter(Boolean);

  const obterMediaComMinimo = (campo) => {
    const valores = resumosDiarios
      .map((resumo) => resumo[campo])
      .filter((valor) => valor !== null);
    return {
      valor:
        valores.length >= 2
          ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length
          : null,
      quantidade: valores.length,
    };
  };
  const media = obterMediaComMinimo("media");
  const minimo = obterMediaComMinimo("minimo");
  const maximo = obterMediaComMinimo("maximo");

  return {
    media: media.valor,
    minimo: minimo.valor,
    maximo: maximo.valor,
    quantidade: resumosDiarios.length,
    datas: resumosDiarios.map(({ data }) => data),
    quantidades: {
      media: media.quantidade,
      minimo: minimo.quantidade,
      maximo: maximo.quantidade,
    },
  };
}

function avaliarAlertaVazao(leiturasAtuais, referencia, horarios) {
  const atual = resumirLeiturasEstruturadas(
    filtrarLeiturasVazaoValidas(leiturasAtuais),
    horarios,
  );
  const indicadores = [
    {
      rotulo: "Média",
      valorAtual: atual.media,
      valorAnterior: referencia?.media ?? null,
      quantidadeReferencia: referencia?.quantidades.media ?? 0,
      classificaAlerta: false,
    },
    {
      rotulo: "Mínima",
      valorAtual: atual.minimo,
      valorAnterior: referencia?.minimo ?? null,
      quantidadeReferencia: referencia?.quantidades.minimo ?? 0,
      classificaAlerta: true,
    },
    {
      rotulo: "Máxima",
      valorAtual: atual.maximo,
      valorAnterior: referencia?.maximo ?? null,
      quantidadeReferencia: referencia?.quantidades.maximo ?? 0,
      classificaAlerta: true,
    },
  ].map((indicador) => {
    const variacao =
      indicador.valorAtual !== null &&
      indicador.valorAnterior !== null &&
      indicador.valorAnterior > 0
        ? ((indicador.valorAtual - indicador.valorAnterior) /
            Math.abs(indicador.valorAnterior)) *
          100
        : null;
    const magnitude = variacao === null ? null : Math.abs(variacao);
    const direcao =
      variacao === null
        ? null
        : variacao < 0
          ? "baixa"
          : variacao > 0
            ? "alta"
            : "estável";
    const status =
      !indicador.classificaAlerta
        ? "Informativo"
        : magnitude === null
        ? "Sem comparação"
        : magnitude > LIMITE_CRITICO_VAZAO_PERCENTUAL + 1e-9
          ? "Crítico"
          : magnitude >= LIMITE_ATENCAO_VAZAO_PERCENTUAL - 1e-9
            ? "Atenção"
            : "Normal";
    return { ...indicador, variacao, direcao, status };
  });
  const indicadoresClassificaveis = indicadores.filter(
    (indicador) => indicador.classificaAlerta,
  );
  const status = ["Crítico", "Atenção", "Normal"].find((nivel) =>
    indicadoresClassificaveis.some((indicador) => indicador.status === nivel),
  ) ?? "Sem comparação";

  return { status, indicadores, referencia };
}

function renderizarDetalhesBoletim(
  container,
  categoria,
  dataSelecionada,
  horarios,
  escopoOperacional,
  baseComparacao,
) {
  container.replaceChildren();
  container.hidden = !categoria;
  if (!categoria) return;

  const heading = document.createElement("div");
  heading.className = "operational-details-heading";
  const titulo = document.createElement("h3");
  titulo.textContent = `${categoria.rotulo} (${categoria.registros.length})`;
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "operational-details-close";
  fechar.textContent = "Fechar boletim";
  fechar.setAttribute("aria-label", "Fechar detalhes do boletim e voltar ao resumo");
  fechar.addEventListener("click", () => {
    categoriaBoletimAtiva = null;
    renderizarDashboard();
  });
  heading.append(titulo, fechar);

  const descricao = document.createElement("p");
  descricao.className = "operational-details-description";
  descricao.textContent =
    categoria.chave === "incompletos"
      ? `Leituras de ${obterRotuloEscopo(escopoOperacional)} ausentes em ${dataSelecionada}. Reservatórios sem registro também aparecem aqui.`
      : `Reservatórios classificados como ${categoria.rotulo.toLowerCase()} em ${dataSelecionada}, considerando ${obterRotuloEscopo(escopoOperacional)}.`;

  const lista = document.createElement("div");
  lista.className = "operational-details-list";
  if (!categoria.registros.length) {
    const vazio = document.createElement("p");
    vazio.className = "operational-details-empty";
    vazio.textContent =
      "Nenhum reservatório nesta categoria para os filtros selecionados.";
    lista.append(vazio);
  }

  categoria.registros.forEach((registro) => {
    const card = document.createElement("article");
    card.className = "operational-detail-item";
    const topo = document.createElement("div");
    topo.className = "operational-detail-heading";
    const nome = document.createElement("h4");
    nome.textContent = obterIdentificacaoReservatorio(registro.chave);
    topo.append(nome);
    let statusNivel;
    if (escopoOperacional !== "vazao") {
      statusNivel = document.createElement("span");
      statusNivel.className = `badge-status ${obterClasseStatus(registro.statusNivel)}`;
      statusNivel.textContent = `Nível: ${registro.statusNivel ?? "Sem registro"}`;
    }
    let statusVazao;
    if (escopoOperacional !== "nivel") {
      statusVazao = document.createElement("span");
      const vazoesAtuais = resumirLeiturasEstruturadas(
        registro.atual?.leituras?.vazao,
        horarios,
      );
      const vazaoIndisponivel =
        !registro.atual || vazoesAtuais.quantidade === 0;
      const vazaoSemComparacao =
        registro.alertaVazao?.status === "Sem comparação";
      statusVazao.className = `badge-status ${obterClasseStatus(
        vazaoIndisponivel
          ? "Sem comparação"
          : registro.alertaVazao?.status,
      )}`;
      if (vazaoIndisponivel || vazaoSemComparacao) {
        statusVazao.classList.add("operational-detail-status-unavailable");
      }
      statusVazao.textContent = vazaoIndisponivel
        ? "Vazão: N/A"
        : `Vazão: ${registro.alertaVazao?.status ?? "Sem comparação"}`;
    }
    if (statusNivel) {
      const statusReservatorio = document.createElement("div");
      statusReservatorio.className = "card-statuses";
      statusReservatorio.append(statusNivel);
      topo.append(statusReservatorio);
    }
    if (statusVazao) topo.append(statusVazao);

    if (registro.atual) {
      const comparacaoNivel = registro.comparacaoNivel;
      const variacaoNivel = formatarVariacaoNivel(comparacaoNivel);
      const niveisAtuais = resumirLeiturasEstruturadas(
        filtrarLeiturasNivelValidas(registro.atual.leituras?.nivel),
        horarios,
      );
      const nivelNumerico = obterUltimaLeituraNivel(
        registro.atual.leituras?.nivel,
      );
      const nivelAtualFormatado =
        nivelNumerico === null ? "N/A" : `${nivelNumerico.toFixed(1)}%`;
      const explicacaoStatus =
        registro.statusNivel === "Crítico"
          ? `Classificação crítica: nível abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}% (${nivelAtualFormatado}).`
          : registro.statusNivel === "Atenção"
            ? `Classificação de atenção: nível abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}% (${nivelAtualFormatado}).`
            : registro.statusNivel === "Sem Dados"
              ? "Não há leituras válidas de nível nesta madrugada; incluído em Incompletos."
              : nivelNumerico === null
                ? "Não há leitura de nível válida para classificar o reservatório."
                : "";

      card.append(topo);

      const secaoNivel = document.createElement("section");
      secaoNivel.className = "operational-detail-section";
      const tituloNivel = document.createElement("h5");
      tituloNivel.textContent = "Nível do reservatório";
      const gradeNivel = document.createElement("div");
      gradeNivel.className = "operational-detail-metric-grid";
      gradeNivel.append(
        criarCelulaDetalhe("Nível atual", nivelAtualFormatado),
        criarCelulaDetalhe(
          "Mínimo / máximo",
          `${formatarMetrica(niveisAtuais.minimo, "%")} / ${formatarMetrica(niveisAtuais.maximo, "%")}`,
        ),
        criarCelulaDetalhe(
          "Variação (%)",
          variacaoNivel,
        ),
      );
      const datasReferenciaNivel =
        comparacaoNivel?.datas.length > 0
          ? ` Datas usadas: ${
              comparacaoNivel.datas.length <= 4
                ? comparacaoNivel.datas.join(", ")
                : `${comparacaoNivel.datas[0]} a ${comparacaoNivel.datas[comparacaoNivel.datas.length - 1]}`
            }.`
          : "";
      const descricaoReferenciaNivel = document.createElement("p");
      descricaoReferenciaNivel.className = "operational-detail-reason";
      descricaoReferenciaNivel.textContent = `Base: ${obterRotuloBaseComparacao(baseComparacao)} · média de ${comparacaoNivel?.quantidade ?? 0} dia(s) válidos. Referência diária média: ${formatarMetrica(comparacaoNivel?.referencia ?? null, "%")}.${datasReferenciaNivel}`;
      secaoNivel.append(tituloNivel, gradeNivel);
      secaoNivel.append(descricaoReferenciaNivel);
      if (explicacaoStatus) {
        const explicacao = document.createElement("p");
        explicacao.className = "operational-detail-reason";
        explicacao.textContent = explicacaoStatus;
        secaoNivel.append(explicacao);
      }
      if (escopoOperacional !== "vazao") card.append(secaoNivel);

      if (registro.alertaVazao && escopoOperacional !== "nivel") {
        const secaoVazao = document.createElement("section");
        secaoVazao.className = "operational-detail-section";
        const cabecalhoVazao = document.createElement("div");
        cabecalhoVazao.className = "operational-detail-flow-heading";
        const tituloVazao = document.createElement("h5");
        tituloVazao.textContent = "Vazão";
        const statusIndicadores = document.createElement("span");
        statusIndicadores.className = `badge-status ${obterClasseStatus(registro.alertaVazao.status)}`;
        statusIndicadores.textContent = registro.alertaVazao.status;
        cabecalhoVazao.append(tituloVazao, statusIndicadores);

        const referencia = registro.alertaVazao.referencia;
        const datasReferencia =
          referencia?.datas.length > 0
            ? ` Datas usadas: ${
                referencia.datas.length <= 4
                  ? referencia.datas.join(", ")
                  : `${referencia.datas[0]} a ${referencia.datas[referencia.datas.length - 1]}`
              }.`
            : "";
        const descricaoBase = document.createElement("p");
        descricaoBase.className = "operational-detail-reason";
        descricaoBase.textContent = `Base: ${obterRotuloBaseComparacao(baseComparacao)} · ${referencia?.quantidade ?? 0} dia(s) válidos.${datasReferencia} Para mínima e máxima, queda ou aumento de ${LIMITE_ATENCAO_VAZAO_PERCENTUAL}% gera atenção; acima de ${LIMITE_CRITICO_VAZAO_PERCENTUAL}% é crítico. Média exibida apenas como informação, sem gerar alerta.`;
        const gradeVazao = document.createElement("div");
        gradeVazao.className = "operational-flow-indicators";
        registro.alertaVazao.indicadores.forEach((indicador) => {
          const item = document.createElement("div");
          item.className = "operational-flow-indicator";
          const nomeIndicador = document.createElement("strong");
          nomeIndicador.textContent = indicador.rotulo;
          const valoresIndicador = document.createElement("span");
          valoresIndicador.textContent = `Atual ${formatarValorVazao(indicador.valorAtual)} L/s · Ref. ${formatarValorVazao(indicador.valorAnterior)} L/s`;
          const variacaoIndicador = document.createElement("span");
          variacaoIndicador.textContent =
            indicador.variacao === null && indicador.classificaAlerta
              ? indicador.valorAnterior === 0
                ? `Referência histórica zero (${indicador.quantidadeReferencia} dias); variação percentual não calculável`
                : `Sem base suficiente (${indicador.quantidadeReferencia} dias válidos)`
              : indicador.variacao === null
                ? "Sem comparação disponível"
              : !indicador.classificaAlerta
                ? `${formatarPercentual(indicador.variacao)} — informativo, não classifica alerta`
              : `${formatarPercentual(indicador.variacao)} — ${
                  indicador.direcao === "baixa"
                    ? "vazão baixa"
                    : indicador.direcao === "alta"
                      ? "vazão alta"
                      : "sem variação"
                }`;
          const statusIndicador = document.createElement("span");
          statusIndicador.className = indicador.classificaAlerta
            ? `badge-status ${obterClasseStatus(indicador.status)}`
            : "flow-indicator-note";
          statusIndicador.textContent = indicador.classificaAlerta
            ? indicador.status
            : "Informativo";
          item.append(
            nomeIndicador,
            valoresIndicador,
            variacaoIndicador,
            statusIndicador,
          );
          gradeVazao.append(item);
        });
        secaoVazao.append(cabecalhoVazao, descricaoBase, gradeVazao);
        card.append(secaoVazao);
      }
    } else {
      card.append(topo);
      const semRegistro = document.createElement("p");
      semRegistro.className = "operational-detail-missing";
      semRegistro.textContent = `Sem registro em ${dataSelecionada}. Último registro disponível: ${dataAnterior ?? "não disponível"}.`;
      card.append(semRegistro);
    }

    if (registro.ausentes.length) {
      const ausencias = document.createElement("p");
      ausencias.className = "operational-detail-missing";
      ausencias.textContent = `Ausentes: ${registro.ausentes
        .map(({ tipo, horario }) => `${tipo} às ${horario}`)
        .join(", ")}`;
      card.append(ausencias);
    } else if (!registro.atual) {
      const aviso = document.createElement("p");
      aviso.className = "operational-detail-missing";
      aviso.textContent =
        "Não foi possível verificar leituras: o registro diário está ausente.";
      card.append(aviso);
    }

    if (registro.atual) {
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "operational-detail-open";
      abrir.dataset.detailReservoir = registro.chave;
      abrir.textContent = "Abrir reservatório";
      card.append(abrir);
    }
    lista.append(card);
  });

  container.append(heading, descricao, lista);
}

function obterClasseStatus(status) {
  if (status === "Atenção") return "status-atencao";
  if (status === "Crítico") return "status-critico";
  if (status === "Sem Dados") return "status-sem-dados";
  if (status === "Sem comparação") return "status-sem-comparacao";
  return "status-normal";
}

function criarCelulaDetalhe(rotulo, valor) {
  const celula = document.createElement("div");
  celula.className = "operational-detail-metric";
  const label = document.createElement("span");
  label.textContent = rotulo;
  const valorElemento = document.createElement("strong");
  valorElemento.textContent = valor;
  celula.append(label, valorElemento);
  return celula;
}

function selecionarCard(card) {
  const chaveReservatorio = decodeURIComponent(card.dataset.reservatorio);
  const seletorFiltro = document.getElementById("seletor-filtro");
  seletorFiltro.value = `reservatorio:${chaveReservatorio}`;
  seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
}

function criarPainelInformativoAlarme(
  reservatorio,
  chave,
  horarios,
  banco,
  dataSelecionada,
  baseComparacao,
) {
  const painel = document.createElement("aside");
  painel.className = "reservoir-alarm-info";
  painel.setAttribute("aria-labelledby", "reservoir-alarm-info-title");

  const titulo = document.createElement("h3");
  titulo.id = "reservoir-alarm-info-title";
  titulo.textContent = "Informativo do alarme";
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "reservoir-alarm-info-close";
  fechar.textContent = "Fechar";
  fechar.addEventListener("click", () => {
    const seletorFiltro = document.getElementById("seletor-filtro");
    seletorFiltro.value = "TODOS";
    seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const cabecalho = document.createElement("div");
  cabecalho.className = "reservoir-alarm-info-heading";
  cabecalho.append(titulo, fechar);
  const identificacao = document.createElement("p");
  identificacao.className = "reservoir-alarm-info-id";
  identificacao.textContent = `${obterIdentificacaoReservatorio(chave)} · ${dataSelecionada}`;
  painel.append(cabecalho, identificacao);

  const nivel = obterUltimaLeituraNivel(reservatorio.leituras?.nivel);
  const statusNivel = avaliarStatusNivel(reservatorio.leituras?.nivel);
  const nivelSecao = document.createElement("section");
  nivelSecao.className = "reservoir-alarm-info-section";
  const nivelTitulo = document.createElement("h4");
  nivelTitulo.textContent = "Nível";
  const nivelStatus = document.createElement("span");
  nivelStatus.className = `badge-status ${obterClasseStatus(statusNivel)}`;
  nivelStatus.textContent = statusNivel;
  const nivelDetalhe = document.createElement("p");
  nivelDetalhe.textContent =
    nivel === null
      ? "Sem leitura de nível válida para avaliar o alarme."
      : `Última leitura: ${nivel.toFixed(1)}%. ${
          statusNivel === "Crítico"
            ? `Crítico: abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}%.`
            : statusNivel === "Atenção"
              ? `Atenção: abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%.`
              : `Normal: igual ou acima de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%.`
        }`;
  nivelSecao.append(nivelTitulo, nivelStatus, nivelDetalhe);
  painel.append(nivelSecao);

  const referencia = obterReferenciaVazao(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
  );
  const alertaVazao = avaliarAlertaVazao(
    reservatorio.leituras?.vazao,
    referencia,
    horarios,
  );
  const vazaoSecao = document.createElement("section");
  vazaoSecao.className = "reservoir-alarm-info-section";
  const vazaoTitulo = document.createElement("h4");
  vazaoTitulo.textContent = "Vazão";
  const vazaoStatus = document.createElement("span");
  vazaoStatus.className = `badge-status ${obterClasseStatus(alertaVazao.status)}`;
  vazaoStatus.textContent = alertaVazao.status;
  const vazaoRegra = document.createElement("p");
  vazaoRegra.textContent =
    `Comparação: ${obterRotuloBaseComparacao(baseComparacao)} ` +
    `(${referencia.quantidade} dia(s) válidos). Queda ou aumento de ` +
    `${LIMITE_ATENCAO_VAZAO_PERCENTUAL}% a ${LIMITE_CRITICO_VAZAO_PERCENTUAL}% ` +
    `gera atenção; acima de ${LIMITE_CRITICO_VAZAO_PERCENTUAL}% é crítico. ` +
    "A vazão média é informativa.";
  const indicadores = document.createElement("div");
  indicadores.className = "reservoir-alarm-indicators";

  alertaVazao.indicadores
    .filter((indicador) => indicador.classificaAlerta)
    .forEach((indicador) => {
      const item = document.createElement("div");
      item.className = "reservoir-alarm-indicator";
      const nome = document.createElement("strong");
      nome.textContent = indicador.rotulo;
      const valor = document.createElement("span");
      valor.textContent =
        `Atual ${formatarValorVazao(indicador.valorAtual)} L/s · ` +
        `Referência ${formatarValorVazao(indicador.valorAnterior)} L/s`;
      const variacao = document.createElement("span");
      variacao.textContent =
        indicador.variacao === null
          ? indicador.valorAnterior === 0
            ? "Referência histórica zero; variação não calculável."
            : `Sem base suficiente (${indicador.quantidadeReferencia} dia(s) válidos).`
          : `${formatarPercentual(indicador.variacao)} · ${
              indicador.direcao === "baixa"
                ? "vazão baixa"
                : indicador.direcao === "alta"
                  ? "vazão alta"
                  : "sem variação"
            }`;
      const status = document.createElement("span");
      status.className = `badge-status ${obterClasseStatus(indicador.status)}`;
      status.textContent = indicador.status;
      item.append(nome, valor, variacao, status);
      indicadores.append(item);
    });

  vazaoSecao.append(vazaoTitulo, vazaoStatus, vazaoRegra, indicadores);
  painel.append(vazaoSecao);

  const vazaoHistorica = obterExtremosHistoricosVazao(banco, chave);
  const historicoSecao = document.createElement("section");
  historicoSecao.className =
    "reservoir-alarm-info-section reservoir-alarm-history";
  const historicoTitulo = document.createElement("h4");
  historicoTitulo.textContent = "Extremos históricos da vazão";
  const extremosHistoricos = document.createElement("div");
  extremosHistoricos.className = "historical-flow-extremes";
  extremosHistoricos.setAttribute(
    "aria-label",
    "Extremos históricos de vazão",
  );
  [
    {
      rotulo: "Mín. hist.",
      valor: vazaoHistorica.minimo,
      data: vazaoHistorica.dataMinimo,
    },
    {
      rotulo: "Máx. hist.",
      valor: vazaoHistorica.maximo,
      data: vazaoHistorica.dataMaximo,
    },
  ].forEach((extremo) => {
    const item = document.createElement("span");
    const rotulo = document.createElement("strong");
    rotulo.textContent = extremo.rotulo;
    const valor = document.createElement("span");
    valor.textContent = `${formatarValorVazao(extremo.valor)} L/s`;
    const data = document.createElement("small");
    data.textContent = extremo.data ?? "—";
    item.append(rotulo, valor, data);
    extremosHistoricos.append(item);
  });
  historicoSecao.append(historicoTitulo, extremosHistoricos);
  painel.append(historicoSecao);

  return painel;
}

function criarCardHTML(
  res,
  chave,
  exibirGraficos,
  selecionado,
  horarios,
  banco,
  dataSelecionada,
  baseComparacao,
) {
  const niveis = resumirLeiturasEstruturadas(
    filtrarLeiturasNivelValidas(res.leituras?.nivel),
    horarios,
  );
  const nivelAtual = obterUltimaLeituraNivel(res.leituras?.nivel);
  const statusNivel = avaliarStatusNivel(res.leituras?.nivel);
  let statusClass = "status-normal";
  if (statusNivel === "Atenção") statusClass = "status-atencao";
  if (statusNivel === "Crítico") statusClass = "status-critico";
  if (statusNivel === "Sem Dados") statusClass = "status-sem-dados";
  const vazoes = resumirLeiturasEstruturadas(res.leituras?.vazao, horarios);
  const alertaVazao = avaliarAlertaVazao(
    res.leituras?.vazao,
    obterReferenciaVazao(
      banco,
      chave,
      dataSelecionada,
      baseComparacao,
      horarios,
    ),
    horarios,
  );
  const vazaoSemComparacao = alertaVazao.status === "Sem comparação";
  const comparacaoNivel = obterComparacaoNivel(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
    obterUltimaLeituraNivel(res.leituras?.nivel),
  );
  const comparacoesVazao = alertaVazao.indicadores
    .filter((indicador) => indicador.classificaAlerta)
    .map((indicador) => {
      const direcao =
        indicador.direcao === "baixa"
          ? "↓ Baixa"
          : indicador.direcao === "alta"
            ? "↑ Alta"
            : indicador.direcao === "estável"
              ? "Estável"
              : "Sem comparação";
      const variacao =
        indicador.variacao === null
          ? indicador.valorAnterior === 0
            ? "Ref. zero"
            : "Sem base"
          : formatarPercentual(indicador.variacao);

      return `<div class="card-comparison-metric ${obterClasseStatus(indicador.status)}">
        <span class="card-comparison-label">Vazão ${indicador.rotulo.toLowerCase()}</span>
        <strong>${variacao}</strong>
        <span class="card-comparison-status">${direcao} · ${indicador.status}</span>
      </div>`;
    })
    .join("");
  const variacaoNivel =
    comparacaoNivel.variacao === null
      ? "Sem comparação"
      : formatarPercentual(comparacaoNivel.variacao);
  const direcaoNivel =
    comparacaoNivel.variacao === null
      ? "Sem base"
      : comparacaoNivel.variacao < 0
        ? "↓ Baixou"
        : comparacaoNivel.variacao > 0
          ? "↑ Subiu"
          : "Estável";
  const comparacaoHTML = `<div class="card-comparison">
      <div class="card-comparison-heading">
        <span>Comparação</span>
      </div>
      <div class="card-comparison-grid">
        <div class="card-comparison-metric ${obterClasseStatus(statusNivel)}">
          <span class="card-comparison-label">Nível</span>
          <strong>${variacaoNivel}</strong>
          <span class="card-comparison-status">${direcaoNivel} · ${statusNivel}</span>
        </div>
        ${comparacoesVazao}
      </div>
    </div>`;
  const quantidadeSlots = Math.max(
    horarios.length,
    res.leituras?.nivel?.length ?? 0,
    res.leituras?.vazao?.length ?? 0,
  );
  const leiturasValidas = niveis.quantidade + vazoes.quantidade;
  const leiturasAusentes = quantidadeSlots * 2 - leiturasValidas;
  const qualidadeHTML = `<div class="card-data-quality${
    leiturasAusentes > 0 ? " has-missing-data" : ""
  }">
    ${leiturasValidas}/${quantidadeSlots * 2} leituras válidas${
      leiturasAusentes > 0 ? ` · ${leiturasAusentes} ausentes` : ""
    }
  </div>`;
  const idCanvas = `chart-${res.nome.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const nivelMedio = formatarMetrica(niveis.media, "%");
  const vazaoMedia = formatarMetrica(vazoes.media, " L/s");
  const classeRoscaNivel =
    statusNivel === "Normal"
      ? "status-normal"
      : statusNivel === "Atenção"
        ? "status-atencao"
        : statusNivel === "Crítico"
          ? "status-critico"
          : "status-sem-dados";
  const indicadorNivelHTML = selecionado
    ? `<div
      class="kpi-box kpi-level-gauge"
      role="meter"
      aria-label="Nível atual"
      aria-valuemin="0"
      aria-valuemax="100"
      ${nivelAtual === null ? "" : `aria-valuenow="${Math.min(nivelAtual, 100)}"`}
    >
      <span
        class="level-gauge ${classeRoscaNivel}"
        style="--nivel-atual: ${Math.min(Math.max(nivelAtual ?? 0, 0), 100)}%"
      >
        <span class="level-gauge-content">
          <strong>${nivelAtual === null ? "N/A" : `${nivelAtual.toFixed(1)}%`}</strong>
          <small>Nível atual</small>
        </span>
      </span>
    </div>`
    : `<div class="kpi-box">
      <span class="kpi-label">Nível Atual</span>
      <span class="kpi-value">${
        nivelAtual === null ? "N/A" : `${nivelAtual.toFixed(1)}%`
      }</span>
    </div>`;
  const kpiHTML = selecionado
    ? `<div class="kpi-container kpi-container-selected">
      <div class="kpi-box kpi-level-range">
        <span class="kpi-label">Nível Mín/Máx</span>
        <span class="kpi-value">${formatarMetrica(niveis.minimo, "%")} / ${formatarMetrica(niveis.maximo, "%")}</span>
        <span class="kpi-detail">Mín. ${niveis.horarioMinimo ?? "--"} · Máx. ${niveis.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box kpi-level-average">
        <span class="kpi-label">Nível médio</span>
        <span class="kpi-value">${nivelMedio}</span>
        <span class="kpi-detail">Média das leituras da madrugada</span>
      </div>
      ${indicadorNivelHTML}
      <div class="kpi-box kpi-flow-range">
        <span class="kpi-label">Vazão Mín/Máx (dia)</span>
        <span class="kpi-value">${formatarMetrica(vazoes.minimo, " L/s")} / ${formatarMetrica(vazoes.maximo, " L/s")}</span>
        <span class="kpi-detail">Mín. ${vazoes.horarioMinimo ?? "--"} · Máx. ${vazoes.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box kpi-flow-average">
        <span class="kpi-label">Vazão média</span>
        <span class="kpi-value">${vazaoMedia}</span>
        <span class="kpi-detail">Média das leituras da madrugada</span>
      </div>
    </div>`
    : `<div class="kpi-container">
      ${indicadorNivelHTML}
      <div class="kpi-box">
        <span class="kpi-label">Nível Mín/Máx</span>
        <span class="kpi-value">${formatarMetrica(niveis.minimo, "%")} / ${formatarMetrica(niveis.maximo, "%")}</span>
        <span class="kpi-detail">Mín. ${niveis.horarioMinimo ?? "--"} · Máx. ${niveis.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">Vazão Mín/Máx (dia)</span>
        <span class="kpi-value">${formatarMetrica(vazoes.minimo, " L/s")} / ${formatarMetrica(vazoes.maximo, " L/s")}</span>
        <span class="kpi-detail">Mín. ${vazoes.horarioMinimo ?? "--"} · Máx. ${vazoes.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">Vazão Média</span>
        <span class="kpi-value">${vazaoMedia}</span>
      </div>
    </div>`;
  const graficoHTML = analiseReservatorioAberta
    ? ""
    : selecionado
    ? `<button class="reservoir-analysis-open" type="button" data-open-reservoir-analysis>
      <span aria-hidden="true">↗</span> Abrir análise detalhada
      </button>
      <div class="reservoir-charts">
      <section class="reservoir-chart-panel">
        <h3>Leituras da madrugada</h3>
        <div class="chart-box"><canvas id="${idCanvas}" role="img" aria-label="Leituras horárias de nível e vazão"></canvas></div>
      </section>
      <section class="reservoir-chart-panel">
        <h3>Leituras + médias da madrugada</h3>
        <div class="chart-box"><canvas id="${idCanvas}-medias" role="img" aria-label="Leituras horárias de nível e vazão com médias da madrugada"></canvas></div>
      </section>
    </div>`
    : exibirGraficos
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
        <span class="card-title">${obterIdentificacaoReservatorio(chave)}</span>
        <span class="card-statuses">
          <span class="badge-status ${statusClass}">Nível: ${statusNivel}</span>
          <span class="badge-status ${obterClasseStatus(alertaVazao.status)}${
            vazaoSemComparacao ? " card-flow-unavailable" : ""
          }"${
            vazaoSemComparacao
              ? ' aria-label="Vazão: N/A, sem comparação" title="Vazão: sem comparação disponível"'
              : ""
          }>
            ${vazaoSemComparacao ? "Vazão: N/A" : `Vazão: ${alertaVazao.status}`}
          </span>
        </span>
      </div>

      ${kpiHTML}

      ${comparacaoHTML}
      ${qualidadeHTML}
      ${graficoHTML}
    </div>
  `;
}

function obterUltimaLeitura(valores) {
  if (!Array.isArray(valores)) return null;
  for (let indice = valores.length - 1; indice >= 0; indice -= 1) {
    const valor = valores[indice];
    if (valor !== null && valor !== undefined && valor !== "") {
      const numero = Number(valor);
      if (Number.isFinite(numero)) return numero;
    }
  }
  return null;
}

function filtrarLeiturasNivelValidas(valores) {
  if (!Array.isArray(valores)) return [];
  return valores.map((valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && numero <= 110
      ? numero
      : null;
  });
}

function filtrarLeiturasVazaoValidas(valores) {
  if (!Array.isArray(valores)) return [];
  return valores.map((valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : null;
  });
}

function obterExtremosHistoricosVazao(banco, chaveReservatorio) {
  let minimo = null;
  let maximo = null;
  let dataMinimo = null;
  let dataMaximo = null;

  banco.datasDisponiveis.forEach((data) => {
    const leituras =
      banco.historico[data]?.reservatorios?.[chaveReservatorio]?.leituras
        ?.vazao;
    const valores = filtrarLeiturasVazaoValidas(leituras).filter(
      (valor) => valor !== null,
    );
    if (!valores.length) return;

    const minimoDiario = Math.min(...valores);
    const maximoDiario = Math.max(...valores);
    if (minimo === null || minimoDiario < minimo) {
      minimo = minimoDiario;
      dataMinimo = data;
    }
    if (maximo === null || maximoDiario > maximo) {
      maximo = maximoDiario;
      dataMaximo = data;
    }
  });

  return { minimo, maximo, dataMinimo, dataMaximo };
}

function obterUltimaLeituraNivel(valores) {
  return obterUltimaLeitura(filtrarLeiturasNivelValidas(valores));
}

function avaliarStatusNivel(valores) {
  const nivelAtual = obterUltimaLeituraNivel(valores);
  if (nivelAtual === null) return "Sem Dados";
  if (nivelAtual < LIMITE_CRITICO_NIVEL_PERCENTUAL) return "Crítico";
  if (nivelAtual < LIMITE_ATENCAO_NIVEL_PERCENTUAL) return "Atenção";
  return "Normal";
}

function calcularVariacaoPercentual(atual, anterior) {
  return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
}

function formatarVariacaoNivel(comparacao) {
  if (comparacao.quantidade < 2) {
    return `sem base suficiente (${comparacao.quantidade} dia(s) válido(s))`;
  }
  if (comparacao.variacao === null) {
    return "sem comparação disponível";
  }
  return formatarPercentual(comparacao.variacao);
}

function formatarPercentual(valor) {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(valor)}%`;
}

function formatarValorVazao(valor) {
  return valor === null
    ? "N/A"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }).format(valor);
}

function renderizarAnaliseGraficoReservatorio(
  painel,
  reservatorio,
  chave,
  data,
  horarios,
) {
  painel.replaceChildren();
  const nivelAtual = obterUltimaLeituraNivel(reservatorio.leituras?.nivel);
  const niveis = resumirLeiturasEstruturadas(
    filtrarLeiturasNivelValidas(reservatorio.leituras?.nivel),
    horarios,
  );
  const vazoes = resumirLeiturasEstruturadas(
    filtrarLeiturasVazaoValidas(reservatorio.leituras?.vazao),
    horarios,
  );

  const cabecalho = document.createElement("div");
  cabecalho.className = "reservoir-analysis-heading";
  const tituloBloco = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "analysis-eyebrow";
  eyebrow.textContent = "ANÁLISE OPERACIONAL";
  const titulo = document.createElement("h2");
  titulo.id = "reservoir-analysis-title";
  titulo.textContent = `Análise do reservatório ${obterIdentificacaoReservatorio(chave)}`;
  const contexto = document.createElement("p");
  contexto.className = "analysis-description";
  contexto.textContent = `${data} · ${horarios.length} horário(s) previstos · ` +
    `Nível médio: ${formatarMetrica(niveis.media, "%")} · ` +
    `Vazão média: ${formatarMetrica(vazoes.media, " L/s")}`;
  tituloBloco.append(eyebrow, titulo, contexto);

  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "reservoir-analysis-back";
  voltar.dataset.closeReservoirAnalysis = "";
  voltar.textContent = "Voltar ao reservatório";
  cabecalho.append(tituloBloco, voltar);

  const graficoCard = document.createElement("section");
  graficoCard.className = "reservoir-analysis-card";
  const graficoCabecalho = document.createElement("div");
  graficoCabecalho.className = "reservoir-analysis-chart-heading";
  const graficoTitulo = document.createElement("h3");
  graficoTitulo.textContent = "Leituras da madrugada";
  const modosGrafico = document.createElement("div");
  modosGrafico.className = "reservoir-analysis-chart-modes";
  modosGrafico.setAttribute("role", "group");
  modosGrafico.setAttribute("aria-label", "Modo de visualização do gráfico");
  [
    { modo: "readings", rotulo: "Leituras" },
    { modo: "averages", rotulo: "Com médias" },
  ].forEach(({ modo, rotulo }) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "reservoir-analysis-mode";
    botao.dataset.analysisChartMode = modo;
    botao.textContent = rotulo;
    botao.setAttribute(
      "aria-pressed",
      String(graficoAnaliseComMedias === (modo === "averages")),
    );
    modosGrafico.append(botao);
  });
  graficoCabecalho.append(graficoTitulo, modosGrafico);
  const grafico = document.createElement("div");
  grafico.className = "reservoir-analysis-chart";
  const canvas = document.createElement("canvas");
  const sufixoGrafico = graficoAnaliseComMedias ? "-medias" : "";
  canvas.id =
    `chart-${reservatorio.nome.replace(/[^a-zA-Z0-9]/g, "_")}${sufixoGrafico}`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Leituras horárias de nível e vazão de ${obterIdentificacaoReservatorio(chave)}`,
  );
  grafico.append(canvas);
  graficoCard.append(graficoCabecalho, grafico);

  const matrizCard = document.createElement("section");
  matrizCard.className = "reservoir-analysis-card";
  const matrizTitulo = document.createElement("h3");
  matrizTitulo.textContent = "Matriz analítica por horário";
  const observacao = document.createElement("p");
  observacao.className = "reservoir-analysis-note";
  observacao.textContent =
    "As diferenças são comparadas às médias válidas desta madrugada. " +
    "Os alertas de vazão são avaliados pelos extremos diários frente ao histórico.";
  const tabelaWrap = document.createElement("div");
  tabelaWrap.className = "reservoir-analysis-table-wrap";
  const tabela = document.createElement("table");
  tabela.className = "reservoir-analysis-table";
  const cabecalhoTabela = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  [
    "Horário",
    "Nível",
    "Dif. média",
    "Status nível",
    "Vazão",
    "Dif. média",
    "Qualidade vazão",
  ].forEach((rotulo) => {
    const celula = document.createElement("th");
    celula.scope = "col";
    celula.textContent = rotulo;
    linhaCabecalho.append(celula);
  });
  cabecalhoTabela.append(linhaCabecalho);
  const corpoTabela = document.createElement("tbody");
  const leiturasNivel = reservatorio.leituras?.nivel ?? [];
  const leiturasVazao = reservatorio.leituras?.vazao ?? [];
  const quantidadeLinhas = Math.max(
    horarios.length,
    leiturasNivel.length,
    leiturasVazao.length,
  );

  for (let indice = 0; indice < quantidadeLinhas; indice += 1) {
    const linha = document.createElement("tr");
    const leituraNivel = obterLeituraAnalitica(leiturasNivel[indice]);
    const leituraVazao = obterLeituraAnalitica(leiturasVazao[indice]);
    const statusNivel =
      leituraNivel.valor === null
        ? leituraNivel.estado
        : leituraNivel.valor < 0 || leituraNivel.valor > 110
          ? "Inválido"
          : leituraNivel.valor < LIMITE_CRITICO_NIVEL_PERCENTUAL
            ? "Crítico"
            : leituraNivel.valor < LIMITE_ATENCAO_NIVEL_PERCENTUAL
              ? "Atenção"
              : "Normal";
    const statusVazao =
      leituraVazao.valor === null
        ? leituraVazao.estado
        : leituraVazao.valor < 0
          ? "Inválida"
          : "Válida";
    if (statusNivel === "Crítico") linha.className = "is-critical";
    else if (statusNivel === "Atenção") linha.className = "is-attention";
    else if (statusNivel === "Inválido" || statusVazao === "Inválida") {
      linha.className = "has-invalid-reading";
    }

    const diferencaNivel =
      leituraNivel.valor === null ||
      leituraNivel.valor < 0 ||
      leituraNivel.valor > 110 ||
      niveis.media === null
        ? "—"
        : formatarDiferencaNivel(leituraNivel.valor - niveis.media);
    const variacaoVazao =
      leituraVazao.valor === null ||
      leituraVazao.valor < 0 ||
      vazoes.media === null
        ? "—"
        : formatarVariacaoAnalitica(
            calcularVariacaoPercentual(leituraVazao.valor, vazoes.media),
          );

    [
      horarios[indice] ?? `Leitura ${indice + 1}`,
      formatarLeituraAnalitica(leituraNivel.valor, "%"),
      diferencaNivel,
      statusNivel,
      formatarLeituraAnalitica(leituraVazao.valor, " L/s"),
      variacaoVazao,
      statusVazao,
    ].forEach((valor) => {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.append(celula);
    });
    corpoTabela.append(linha);
  }

  tabela.append(cabecalhoTabela, corpoTabela);
  tabelaWrap.append(tabela);
  matrizCard.append(matrizTitulo, observacao, tabelaWrap);
  painel.append(cabecalho, graficoCard, matrizCard);
  renderizarGrafico(
    reservatorio.nome,
    horarios,
    reservatorio.leituras,
    graficoAnaliseComMedias,
  );
}

function obterLeituraAnalitica(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return { valor: null, estado: "Ausente" };
  }
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? { valor: numero, estado: "Inválido" }
    : { valor: null, estado: "Inválido" };
}

function formatarLeituraAnalitica(valor, unidade) {
  if (valor === null) return "—";
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(valor)}${unidade}`;
}

function formatarDiferencaNivel(diferenca) {
  const sinal = diferenca > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(diferenca)} p.p.`;
}

function formatarVariacaoAnalitica(variacao) {
  return variacao === null ? "—" : formatarPercentual(variacao);
}

function renderizarGrafico(
  nomeReservatorio,
  horarios,
  leituras,
  incluirMedias = false,
) {
  const sufixo = incluirMedias ? "-medias" : "";
  const idCanvas =
    `chart-${nomeReservatorio.replace(/[^a-zA-Z0-9]/g, "_")}${sufixo}`;
  const ctx = document.getElementById(idCanvas);

  if (!ctx) return;

  const datasets = [
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
  ];
  if (incluirMedias) {
    const mediaNivel = calcularMediaValida(
      filtrarLeiturasNivelValidas(leituras.nivel),
    );
    const mediaVazao = calcularMediaValida(
      filtrarLeiturasVazaoValidas(leituras.vazao),
    );
    if (mediaNivel !== null) {
      datasets.push(
        {
          label: `Nível médio (${formatarMetrica(mediaNivel, "%")})`,
          data: horarios.map(() => mediaNivel),
          borderColor: "#8dd7fa",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 5],
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          yAxisID: "yNivel",
          tension: 0,
        },
      );
    }
    if (mediaVazao !== null) {
      datasets.push(
        {
          label: `Vazão média (${formatarMetrica(mediaVazao, " L/s")})`,
          data: horarios.map(() => mediaVazao),
          borderColor: "#ffc28b",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 5],
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          yAxisID: "yVazao",
          tension: 0,
        },
      );
    }
  }

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: horarios,
      datasets,
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

  instanciasGraficos[`${nomeReservatorio}${sufixo}`] = chart;
}

function obterVariavelCSS(nome) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
}
