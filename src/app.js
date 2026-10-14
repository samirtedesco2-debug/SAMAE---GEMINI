// app.js - Lógica principal, orquestração e funções auxiliares com carregamento assíncrono modular

let instanciasGraficos = {};
let graficosAnaliticos = {};
let graficosEngenharia = {};
let categoriaBoletimAtiva = null;
let analiseReservatorioAberta = false;
let graficoAnaliseComMedias = false;
let graficoAnaliseComHistorico = false;
const seriesAnaliseOcultas = new Set();
const TAMANHO_PAGINA_ENGENHARIA = 100;
const MINIMO_DIAS_HISTORICOS_PARA_ESPERAR_DADO = 4;

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

// Inicialização Assíncrona Carregando Todos os Meses Históricos via ApiClient
async function inicializarBancoAssincrono() {
  try {
    window.bancoDeDados = await window.ApiClient.inicializarBanco();
    inicializarTema();
    inicializarDashboard();
  } catch (erro) {
    console.error("Erro ao inicializar dados:", erro);
    const grid = document.getElementById("grid-reservatorios");
    if (grid) {
      grid.innerHTML =
        "<p style='color: #8e8e8e;'>Erro ao carregar dados históricos. Verifique os arquivos JSON.</p>";
    }
  }
}

async function carregarMesPorData(dataStr) {
  const partes = dataStr.split("/");
  if (partes.length === 3) {
    const anoMes = `${partes[2]}_${partes[1]}`;
    const dadosMes = await window.ApiClient.carregarMes(anoMes);
    if (dadosMes && dadosMes.dias) {
      Object.assign(window.bancoDeDados.historico, dadosMes.dias);
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  inicializarBancoAssincrono();
});

function inicializarTema() {
  const botaoTema = document.getElementById("theme-toggle");
  if (!botaoTema) return;
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

  const ultimaDataDoBanco =
    banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const lblAtualizacao = document.getElementById("lbl-atualizacao");
  if (lblAtualizacao) {
    lblAtualizacao.textContent = ultimaDataDoBanco;
  }
  const dadosUltimoDia = banco.historico[ultimaDataDoBanco];
  const lblBoletimDataHora = document.getElementById("lbl-boletim-data-hora");
  if (lblBoletimDataHora && dadosUltimoDia) {
    lblBoletimDataHora.textContent = dadosUltimoDia.ultimaAtualizacao || `${ultimaDataDoBanco} 05:15`;
  }

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
      graficoAnaliseComHistorico = false;
      seriesAnaliseOcultas.clear();
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
      return;
    }
    const opcaoHistorico = e.target.closest("[data-analysis-history]");
    if (opcaoHistorico) {
      graficoAnaliseComHistorico = opcaoHistorico.checked;
      renderizarDashboard();
    }
  });

  painelAnaliseReservatorio.addEventListener("change", (e) => {
    const controleSerie = e.target.closest("[data-analysis-series]");
    if (!controleSerie) return;

    const canvas = painelAnaliseReservatorio.querySelector(
      ".reservoir-analysis-chart canvas",
    );
    const chart = canvas ? Chart.getChart(canvas) : null;
    const indiceSerie = Number(controleSerie.dataset.analysisSeries);
    if (!chart || !Number.isInteger(indiceSerie)) return;

    chart.setDatasetVisibility(indiceSerie, controleSerie.checked);
    const nomeSerie = chart.data.datasets[indiceSerie]?.label;
    if (nomeSerie) {
      const chaveSerie = obterChaveSerieAnalise(nomeSerie);
      if (controleSerie.checked) seriesAnaliseOcultas.delete(chaveSerie);
      else seriesAnaliseOcultas.add(chaveSerie);
    }
    chart.update();
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

  renderizarDashboard();

  seletorData.addEventListener("change", async (e) => {
    //await carregarMesPorData(e.target.value);
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

async function inicializarAnalises() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const seletorInicio = document.getElementById("analise-inicio");
  const seletorFim = document.getElementById("analise-fim");
  const seletorGrupo = document.getElementById("analise-grupo");
  const seletorReservatorios = document.getElementById("analise-reservatorios");

  if (!seletorInicio || !seletorFim) return;

  seletorInicio.innerHTML = "";
  seletorFim.innerHTML = "";
  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
  seletorFim.value = datas[datas.length - 1];

  // Garante carregamento dos meses do período selecionado nas análises
  await garantirPeriodoCarregado(seletorInicio.value, seletorFim.value);

  seletorGrupo.innerHTML = "";
  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));

  const ultimaData = datas[datas.length - 1];
  const ultimoDia = banco.historico[ultimaData];
  if (ultimoDia && ultimoDia.reservatorios) {
    const grupos = new Set(
      Object.values(ultimoDia.reservatorios).map(
        (reservatorio) => reservatorio.grupo,
      ),
    );
    grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));
  }

  preencherReservatoriosAnalise("TODOS", []);

  seletorInicio.removeEventListener("change", acaoMudancaAnalise);
  seletorInicio.addEventListener("change", acaoMudancaAnalise);

  seletorFim.removeEventListener("change", acaoMudancaAnalise);
  seletorFim.addEventListener("change", acaoMudancaAnalise);

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

async function acaoMudancaAnalise() {
  const seletorInicio = document.getElementById("analise-inicio");
  const seletorFim = document.getElementById("analise-fim");
  await garantirPeriodoCarregado(seletorInicio.value, seletorFim.value);
  renderizarAnalises();
}

async function garantirPeriodoCarregado(inicioStr, fimStr) {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const iInicio = datas.indexOf(inicioStr);
  const iFim = datas.indexOf(fimStr);
  if (iInicio < 0 || iFim < 0) return;

  const periodo = datas.slice(
    Math.min(iInicio, iFim),
    Math.max(iInicio, iFim) + 1,
  );
  for (const data of periodo) {
    if (!banco.historico[data]) {
      await carregarMesPorData(data);
    }
  }
}

async function inicializarEngenharia() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const ultimaData = datas[datas.length - 1];

  if (!banco.historico[ultimaData]) {
    await carregarMesPorData(ultimaData);
  }

  const reservatorios = banco.historico[ultimaData]?.reservatorios || {};
  const seletorInicio = document.getElementById("engenharia-inicio");
  const seletorFim = document.getElementById("engenharia-fim");
  const seletorGrupo = document.getElementById("engenharia-grupo");

  if (!seletorInicio || !seletorFim) return;

  seletorInicio.innerHTML = "";
  seletorFim.innerHTML = "";
  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
  seletorFim.value = ultimaData;

  await garantirPeriodoCarregadoEngenharia(
    seletorInicio.value,
    seletorFim.value,
  );

  seletorGrupo.innerHTML = "";
  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));
  const grupos = new Set(
    Object.values(reservatorios).map((reservatorio) => reservatorio.grupo),
  );
  grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));
  preencherReservatoriosEngenharia("TODOS", []);

  seletorInicio.removeEventListener("change", acaoMudancaEngenharia);
  seletorInicio.addEventListener("change", acaoMudancaEngenharia);
  seletorFim.removeEventListener("change", acaoMudancaEngenharia);
  seletorFim.addEventListener("change", acaoMudancaEngenharia);

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

async function acaoMudancaEngenharia() {
  const seletorInicio = document.getElementById("engenharia-inicio");
  const seletorFim = document.getElementById("engenharia-fim");
  await garantirPeriodoCarregadoEngenharia(
    seletorInicio.value,
    seletorFim.value,
  );
  renderizarEngenharia();
}

async function garantirPeriodoCarregadoEngenharia(inicioStr, fimStr) {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const iInicio = datas.indexOf(inicioStr);
  const iFim = datas.indexOf(fimStr);
  if (iInicio < 0 || iFim < 0) return;

  const periodo = datas.slice(
    Math.min(iInicio, iFim),
    Math.max(iInicio, iFim) + 1,
  );
  for (const data of periodo) {
    if (!banco.historico[data]) {
      await carregarMesPorData(data);
    }
  }
}

async function renderizarDashboard() {
  const banco = window.bancoDeDados;
  const dataSelecionada = document.getElementById("seletor-data").value;
  const filtroSelecionado = document.getElementById("seletor-filtro").value;

  if (!banco.historico[dataSelecionada]) {
    await carregarMesPorData(dataSelecionada);
  }

  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;

  if (!dadosDoDia) {
    console.error(`Dados não encontrados para a data ${dataSelecionada}`);
    return;
  }

  const lblBoletimDataHora = document.getElementById("lbl-boletim-data-hora");
  if (lblBoletimDataHora) {
    lblBoletimDataHora.textContent = dadosDoDia.ultimaAtualizacao || `${dataSelecionada} 05:15`;
  }

  const containerGrid = document.getElementById("grid-reservatorios");
  const painelOperacional = document.getElementById("painel-operacional");
  const resumoOperacional =
    painelOperacional.querySelector(".operational-brief");
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

  if (dataAnterior && !banco.historico[dataAnterior]) {
    await carregarMesPorData(dataAnterior);
  }

  const dadosDiaAnterior = dataAnterior ? banco.historico[dataAnterior] : null;
  const reservatoriosDiaAnterior = dadosDiaAnterior?.reservatorios ?? {};
  const baseComparacao = document.getElementById("seletor-base-vazao").value;
  const escopoOperacional = document.getElementById(
    "seletor-escopo-operacional",
  ).value;

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
  const botaoCarregarMais = document.getElementById("engenharia-carregar-mais");

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
    window.bancoDeDados.historico[datas[datas.length - 1]]?.reservatorios || {};
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
        estatisticasHistoricas: null,
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
    registrosVisiveis.textContent = `Exibindo ${quantidadeExibida} de ${registrosTabela.length} registros.`;
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

  if (!resumo || !corpoTabela) return;

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
  const catalogo = banco.historico[ultimaData]?.reservatorios || {};
  const reservatorios = chavesSelecionadas
    .filter((chave) => catalogo[chave])
    .map((chave) => ({ chave, ...catalogo[chave] }));

  if (!reservatorios.length) {
    mensagem.classList.remove("has-alerts");
    mensagem.textContent =
      "Selecione pelo menos um reservatório para visualizar as análises.";
    return;
  }

  // --- DOWNSAMPLING INTELIGENTE (Agregação se período > 7 dias) ---
  const usarDownsampling = datasPeriodo.length > 7;

  const series = reservatorios.map((reservatorio, index) => {
    const alertas = {
      nivelAcimaDe100: 0,
      nivelAcimaDe110: 0,
      nivelNegativo: 0,
      vazaoNegativa: 0,
    };

    const leiturasPorData = datasPeriodo.map((data) => {
      const regDia = banco.historico[data]?.reservatorios?.[reservatorio.chave];
      const leituras = regDia?.leituras;

      if (usarDownsampling && regDia?.kpis) {
        const kpis = regDia.kpis;
        const nMed =
          kpis.nivelMedio !== "N/A" ? parseFloat(kpis.nivelMedio) : null;
        const nMin = kpis.nivelMin !== "N/A" ? parseFloat(kpis.nivelMin) : null;
        const nMax = kpis.nivelMax !== "N/A" ? parseFloat(kpis.nivelMax) : null;
        const vMed =
          kpis.vazaoMedia !== "N/A" ? parseFloat(kpis.vazaoMedia) : null;
        const vMin = kpis.vazaoMin !== "N/A" ? parseFloat(kpis.vazaoMin) : null;
        const vMax = kpis.vazaoMax !== "N/A" ? parseFloat(kpis.vazaoMax) : null;

        return {
          nivel: nMed,
          nivelMin: nMin,
          nivelMax: nMax,
          vazao: vMed,
          vazaoMin: vMin,
          vazaoMax: vMax,
          vazaoMinHorario: null,
          vazaoMaxHorario: null,
        };
      } else {
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
      }
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

function selecionarCard(card) {
  const chaveReservatorio = decodeURIComponent(card.dataset.reservatorio);
  const seletorFiltro = document.getElementById("seletor-filtro");
  seletorFiltro.value = `reservatorio:${chaveReservatorio}`;
  seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
}

function obterChaveSerieAnalise(rotulo) {
  return rotulo.replace(/ \([^)]*\)$/, "");
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

function obterRotuloBaseComparacao(base) {
  const rotulos = {
    "7d-calendar": "últimos 7 dias corridos",
    "30d-calendar": "últimos 30 dias corridos",
    "same-weekday-4": "mesmo dia da semana nas últimas 4 semanas",
    global: "histórico global",
  };
  return rotulos[base] ?? rotulos["7d-calendar"];
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
    return (
      resumirLeiturasEstruturadas(valores, banco.historico[data]?.horarios)
        .quantidade > 0
    );
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
  const resumosDiarios = obterDatasBaseComparacao(banco, dataSelecionada, base)
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

function obterUltimaLeituraNivel(valores) {
  return obterUltimaLeitura(filtrarLeiturasNivelValidas(valores));
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

function obterEstatisticasHistoricasPorHorario(
  banco,
  chaveReservatorio,
  horarios,
) {
  const amostras = {
    nivel: horarios.map(() => []),
    vazao: horarios.map(() => []),
  };

  banco.datasDisponiveis.forEach((data) => {
    const dadosDoDia = banco.historico[data];
    const leituras = dadosDoDia?.reservatorios?.[chaveReservatorio]?.leituras;
    if (!leituras) return;

    const indicesPorHorario = new Map(
      (dadosDoDia.horarios ?? []).map((horario, indice) => [horario, indice]),
    );
    horarios.forEach((horario, indiceAtual) => {
      const indiceHistorico = indicesPorHorario.get(horario) ?? -1;
      if (indiceHistorico < 0) return;

      const nivel = obterLeituraAnalitica(leituras.nivel?.[indiceHistorico]);
      if (nivel.valor !== null && nivel.valor >= 0 && nivel.valor <= 110) {
        amostras.nivel[indiceAtual].push(nivel.valor);
      }

      const vazao = obterLeituraAnalitica(leituras.vazao?.[indiceHistorico]);
      if (vazao.valor !== null && vazao.valor >= 0) {
        amostras.vazao[indiceAtual].push(vazao.valor);
      }
    });
  });

  const resumir = (leiturasPorHorario) => ({
    minimo: leiturasPorHorario.map((valores) =>
      valores.length
        ? valores.reduce((menor, valor) => Math.min(menor, valor))
        : null,
    ),
    media: leiturasPorHorario.map((valores) => calcularMediaValida(valores)),
    maximo: leiturasPorHorario.map((valores) =>
      valores.length
        ? valores.reduce((maior, valor) => Math.max(maior, valor))
        : null,
    ),
  });

  return {
    nivel: resumir(amostras.nivel),
    vazao: resumir(amostras.vazao),
  };
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
    alertas: { acimaDe100, acimaDe110, negativo: negativos },
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

document.addEventListener("DOMContentLoaded", () => {
  const btnCCO = document.getElementById("btn-modo-cco");

  // Definição dos dois ícones em formato profissional de traço
  const iconeCCO = `<svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`;
  const iconePadrao = `<svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

  if (btnCCO) {
    btnCCO.addEventListener("click", () => {
      document.body.classList.toggle("modo-cco-ativo");

      if (document.body.classList.contains("modo-cco-ativo")) {
        btnCCO.innerHTML = iconePadrao;
        btnCCO.title = "Modo Padrão";
        btnCCO.style.borderColor = "var(--accent-color)"; // Dá um destaque sutil em azul quando ativo
        
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } else {
        btnCCO.innerHTML = iconeCCO;
        btnCCO.title = "Modo CCO";
        btnCCO.style.borderColor = "var(--border-color)";
        
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("modo-cco-ativo");
        btnCCO.innerHTML = iconeCCO;
        btnCCO.style.borderColor = "var(--border-color)";
        btnCCO.title = "Modo CCO";
      }
    });
  }
});
