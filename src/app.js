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

  if (window.CcoSync) {
    window.CcoSync.inicializarCanal();
    window.CcoSync.inicializarModoCCO();
  }

  // Central de Notificações Popover
  const btnNotificacoes = document.getElementById("btn-notificacoes");
  const popoverNotificacoes = document.getElementById("notificacoes-popover");
  const btnFecharNotificacoes = document.getElementById("btn-fechar-notificacoes");

  if (btnNotificacoes && popoverNotificacoes) {
    btnNotificacoes.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverNotificacoes.hidden = !popoverNotificacoes.hidden;
      atualizarListaNotificacoes();
    });
  }

  if (btnFecharNotificacoes && popoverNotificacoes) {
    btnFecharNotificacoes.addEventListener("click", () => {
      popoverNotificacoes.hidden = true;
    });
  }

  document.addEventListener("click", (e) => {
    if (popoverNotificacoes && !popoverNotificacoes.hidden && !popoverNotificacoes.contains(e.target) && e.target !== btnNotificacoes) {
      popoverNotificacoes.hidden = true;
    }
  });

  // Tratamento Global de Erros Assíncronos
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("Aviso assíncrono capturado:", event.reason);
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'exceccoes') {
    setTimeout(() => {
      const tabExceccoes = document.getElementById("tab-exceccoes");
      if (tabExceccoes) tabExceccoes.click();
    }, 400);
  }
});

function atualizarListaNotificacoes() {
  const lista = document.getElementById("notificacoes-lista");
  if (!lista) return;

  const logs = window.samaeIncidentsLog || [];
  if (logs.length === 0) {
    lista.innerHTML = `<p class="notificacao-vazia">Nenhuma notificação recente no sistema.</p>`;
    return;
  }

  lista.innerHTML = logs.slice(-10).reverse().map(log => `
    <div class="notificacao-item">
      <span class="notificacao-item-time">${new Date(log.timestamp).toLocaleTimeString("pt-BR")}</span>
      <strong>${log.nome || log.chave}</strong>
      <span>Ação: ${log.acao} (${log.severidade || 'Info'})</span>
    </div>
  `).join("");
}

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
  inicializarConfiguracoes();

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
    exibindoEsquemaAutonomia = false;
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

  const btnCopiarResumo = document.getElementById("btn-copiar-resumo");
  const btnCopiarPlantaoCCO = document.getElementById("btn-copiar-plantao-cco");

  const executarCopiaResumo = (botaoAlvo) => {
    const dataSelecionada = document.getElementById("seletor-data").value;
    const banco = window.bancoDeDados;
    const dadosDoDia = banco?.historico?.[dataSelecionada];
    if (!dadosDoDia) {
      alert("Nenhum dado carregado para gerar o resumo.");
      return;
    }

    const baseComparacao = document.getElementById("seletor-base-vazao")?.value || "same-weekday-4";
    const escopoOperacional = document.getElementById("seletor-escopo-operacional")?.value || "ambos";

    const criticos = [];
    const atencao = [];
    const incompletos = [];
    const horarios = dadosDoDia.horarios || [];
    const quantidadeSlots = horarios.length;

    Object.entries(dadosDoDia.reservatorios || {}).forEach(([chave, res]) => {
      const nomeRes = res.nome || chave;
      const tagMatch = nomeRes.match(/\b(?:R\d{1,3}(?:-[A-Z])?|ES\d{2}|EAT\s+R\d{1,3}|ETA\s+[A-Z0-9\s-]+)\b/i);
      const tagLimpa = tagMatch ? tagMatch[0].trim() : nomeRes.replace(/\s*\(.*?\)/g, '').split('-')[0].trim();
      const restoNome = nomeRes.includes('-') ? nomeRes.split('-').slice(1).join('-').trim() : '';
      const rotuloFormatado = restoNome ? `${tagLimpa} - ${restoNome}` : tagLimpa;

      const nivelAtual = obterUltimaLeituraNivel(res.leituras?.nivel);
      const qualidade = avaliarQualidadeLeituras(res.leituras?.nivel, res.leituras?.vazao, quantidadeSlots);
      
      const nivelAtencaoVal = escopoOperacional !== "vazao";
      const vazaoAtivaVal = escopoOperacional !== "nivel";

      const comparacaoNivel = obterComparacaoNivel(
        banco,
        chave,
        dataSelecionada,
        baseComparacao,
        horarios,
        nivelAtual,
      );
      const statusNivel = avaliarStatusNivel(res.leituras?.nivel, chave, comparacaoNivel?.referencia);
      const alertaVazao = avaliarAlertaVazao(
        res.leituras?.vazao,
        obterReferenciaVazao(banco, chave, dataSelecionada, baseComparacao, horarios),
        horarios,
        chave,
      );

      const statusNivelAtivo = nivelAtencaoVal && ["Normal", "Atenção", "Crítico"].includes(statusNivel) ? statusNivel : null;
      const statusVazaoAtivo = vazaoAtivaVal && ["Normal", "Atenção", "Crítico"].includes(alertaVazao?.status) ? alertaVazao.status : null;
      const statusAtivos = [statusNivelAtivo, statusVazaoAtivo].filter(Boolean);

      let statusGeral = "Normal";
      if (statusAtivos.includes("Crítico")) statusGeral = "Crítico";
      else if (statusAtivos.includes("Atenção")) statusGeral = "Atenção";

      const diagTexto = statusNivel === "Crítico" ? `Nível Crítico (${nivelAtual !== null ? nivelAtual + '%' : 'N/A'})` : statusNivel === "Atenção" ? `Nível Atenção (${nivelAtual !== null ? nivelAtual + '%' : 'N/A'})` : `Vazão: ${alertaVazao?.status}`;
      const info = `- ${rotuloFormatado}: Nível ${nivelAtual !== null ? nivelAtual + '%' : 'N/A'} [Diagnóstico: ${diagTexto}]`;

      if (statusGeral === "Crítico") criticos.push(info);
      else if (statusGeral === "Atenção") atencao.push(info);

      if (qualidade.nivelAusente > 0 || qualidade.vazaoAusente > 0 || statusNivel === "Sem Dados" || statusNivel === "Inconsistente") {
        const razaoIncompleto = statusNivel === "Inconsistente" ? "leitura(s) inconsistente(s)" : `${qualidade.nivelAusente + qualidade.vazaoAusente} leitura(s) ausente(s)`;
        incompletos.push(`- ${rotuloFormatado}: ${razaoIncompleto} [Falha de Telemetria / Sem Dados]`);
      }
    });

    let textoResumo = `📋 RESUMO DE PASSAGEM DE PLANTÃO - CCO SAMAE\n`;
    textoResumo += `📅 Boletim: ${dataSelecionada} (${dadosDoDia.ultimaAtualizacao || '05:15'})\n\n`;

    if (criticos.length > 0) {
      textoResumo += `🔴 CRÍTICOS (${criticos.length}):\n` + criticos.join("\n") + `\n\n`;
    } else {
      textoResumo += `🔴 CRÍTICOS: Nenhum\n\n`;
    }

    if (atencao.length > 0) {
      textoResumo += `🟡 ATENÇÃO (${atencao.length}):\n` + atencao.join("\n") + `\n\n`;
    } else {
      textoResumo += `🟡 ATENÇÃO: Nenhum\n\n`;
    }

    if (incompletos.length > 0) {
      textoResumo += `⚠️ INCOMPLETOS / AUSENTES (${incompletos.length}):\n` + incompletos.join("\n") + `\n\n`;
    } else {
      textoResumo += `⚠️ INCOMPLETOS: Nenhum\n\n`;
    }

    textoResumo += `*(Gerado automaticamente pelo Sistema de Monitoramento CCO)*`;

    navigator.clipboard.writeText(textoResumo).then(() => {
      const alvo = botaoAlvo || btnCopiarResumo;
      if (!alvo) return;
      const textoOriginal = alvo.innerHTML;
      alvo.innerHTML = `<span>✓ Resumo Copiado!</span>`;
      setTimeout(() => {
        alvo.innerHTML = textoOriginal;
      }, 3000);
    }).catch(err => {
      console.error("Erro ao copiar resumo:", err);
      alert("Não foi possível copiar o resumo para a área de transferência.");
    });
  };

  if (btnCopiarResumo) {
    btnCopiarResumo.addEventListener("click", () => executarCopiaResumo(btnCopiarResumo));
  }
  if (btnCopiarPlantaoCCO) {
    btnCopiarPlantaoCCO.addEventListener("click", () => executarCopiaResumo(btnCopiarPlantaoCCO));
  }

  const btnExportarCSV = document.getElementById("btn-exportar-csv");
  if (btnExportarCSV) {
    btnExportarCSV.addEventListener("click", () => {
      const banco = window.bancoDeDados;
      const dataSelecionada = document.getElementById("seletor-data").value;
      const exceccoes = typeof obterReservatoriosComAlertaOuExcecao === 'function' ? obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada) : [];
      
      let csvContent = "\uFEFFData;Chave;Reservatório;Severidade;Diagnóstico;Tendência\n";
      exceccoes.forEach(exc => {
        const diag = (exc.mensagens || []).join(" | ").replace(/;/g, ",");
        csvContent += `${dataSelecionada};${exc.chave};"${exc.nome}";${exc.severidade};"${diag}";"${exc.predicao?.tendencia || 'N/A'}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_alarmes_cco_${dataSelecionada}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnExportarHTML = document.getElementById("btn-exportar-html");
  if (btnExportarHTML) {
    btnExportarHTML.addEventListener("click", () => {
      const banco = window.bancoDeDados;
      const dataSelecionada = document.getElementById("seletor-data").value;
      const exceccoes = typeof obterReservatoriosComAlertaOuExcecao === 'function' ? obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada) : [];

      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Alertas CCO - ${dataSelecionada}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; color: #333; background: #fff; }
  h1 { color: #0877b9; border-bottom: 2px solid #0877b9; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.9rem; }
  th { background: #f4f6f8; color: #17212b; }
  .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; text-transform: uppercase; }
  .critico { background: rgba(242,73,73,0.2); color: #b42318; border: 1px solid #b42318; }
  .atencao { background: rgba(255,153,0,0.2); color: #8a4b00; border: 1px solid #8a4b00; }
  .incompleto { background: rgba(59,130,246,0.2); color: #1d4ed8; border: 1px solid #1d4ed8; }
</style>
</head>
<body>
  <h1>Centro de Controle Operacional - Relatório de Alertas Ativos</h1>
  <p><strong>Data de Referência:</strong> ${dataSelecionada}</p>
  <p><strong>Total de Ocorrências:</strong> ${exceccoes.length}</p>
  <table>
    <thead>
      <tr>
        <th>TAG / Reservatório</th>
        <th>Chave</th>
        <th>Severidade</th>
        <th>Diagnósticos e Mensagens</th>
        <th>Tendência</th>
      </tr>
    </thead>
    <tbody>
      ${exceccoes.map(exc => `
        <tr>
          <td><strong>${exc.nome}</strong></td>
          <td>${exc.chave}</td>
          <td><span class="badge ${exc.severidade === 'Crítico' ? 'critico' : exc.severidade === 'Atenção' ? 'atencao' : 'incompleto'}">${exc.severidade}</span></td>
          <td>${(exc.mensagens || []).join("<br>")}</td>
          <td>${exc.predicao?.tendencia || 'N/A'} (${exc.predicao?.iconeTendencia || '→'})</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <footer style="margin-top: 30px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
    Gerado automaticamente pelo Sistema CCO SAMAE - Data/Hora: ${new Date().toLocaleString("pt-BR")}
  </footer>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_cco_${dataSelecionada}.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

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
    "tab-exceccoes": document.getElementById("painel-exceccoes"),
  };

  function ativarAba(abaAtiva) {
    document.body.classList.toggle("is-cco-fullscreen-active", abaAtiva.id === "tab-exceccoes");
    abas.forEach((aba) => {
      const ativa = aba === abaAtiva;
      aba.classList.toggle("is-active", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      paineis[aba.id].hidden = !ativa;
    });

    if (abaAtiva.id === "tab-analitico") renderizarAnalises();
    if (abaAtiva.id === "tab-engenharia") renderizarEngenharia();
    if (abaAtiva.id === "tab-exceccoes") {
      window.veioDeAlertasCCO = false;
      renderizarDashboardExceccoes();
    }
  }

  const btnNotificacoes = document.getElementById("btn-notificacoes");
  if (btnNotificacoes) {
    btnNotificacoes.addEventListener("click", () => {
      // Reservado para Central de Notificações / futuras atualizações CCO
    });
  }

  const btnVoltarPrincipal = document.getElementById("btn-voltar-tela-principal");
  if (btnVoltarPrincipal) {
    btnVoltarPrincipal.addEventListener("click", () => {
      try {
        window.close();
      } catch (e) {}
      const tabOp = document.getElementById("tab-operacional");
      if (tabOp) tabOp.click();
    });
  }

  function atualizarRelogioCCO() {
    const relogio = document.getElementById("cco-clock-display");
    if (relogio) {
      const agora = new Date();
      relogio.textContent = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR");
    }
  }
  setInterval(atualizarRelogioCCO, 1000);
  atualizarRelogioCCO();

  abas.forEach((aba) => {
    aba.addEventListener("click", (e) => {
      if (aba.id === "tab-exceccoes") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('view') !== 'exceccoes') {
          e.preventDefault();
          if (window.ccoMuralWindow && !window.ccoMuralWindow.closed) {
            window.ccoMuralWindow.focus();
          } else {
            window.ccoMuralWindow = window.open('?view=exceccoes', 'ccoMuralWindow', 'width=1200,height=800');
          }
          return;
        }
      }
      ativarAba(aba);
    });
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

  if (typeof atualizarBadgeAlarmes === "function") {
    atualizarBadgeAlarmes();
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

  if (typeof atualizarHeaderEnxutoInvestigacao === "function") {
    atualizarHeaderEnxutoInvestigacao(painelOperacional, filtroSelecionado, reservatorios);
  }
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

      const painelAutonomia = criarPainelAutonomiaPreditiva(
        res,
        chave,
        horarios,
        banco,
        dataSelecionada,
        baseComparacao,
      );
      containerGrid.append(painelAutonomia);
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

let reservatorioConfigSelecionado = null;

function inicializarConfiguracoes() {
  const btnConfig = document.getElementById("btn-modo-configuracao");
  const painelConfig = document.getElementById("painel-configuracoes");
  const abas = Array.from(document.querySelectorAll(".view-tab"));
  const paineis = [
    document.getElementById("painel-operacional"),
    document.getElementById("painel-analitico"),
    document.getElementById("painel-engenharia"),
  ];

  if (!btnConfig || !painelConfig) return;

  btnConfig.addEventListener("click", () => {
    const estaAtivo = !painelConfig.hidden;
    if (estaAtivo) {
      painelConfig.hidden = true;
      const painelOp = document.getElementById("painel-operacional");
      if (painelOp) painelOp.hidden = false;
      abas.forEach((aba) => {
        const ativa = aba.id === "tab-operacional";
        aba.classList.toggle("is-active", ativa);
        aba.setAttribute("aria-selected", String(ativa));
      });
    } else {
      paineis.forEach((p) => { if (p) p.hidden = true; });
      painelConfig.hidden = false;
      abas.forEach((aba) => {
        aba.classList.remove("is-active");
        aba.setAttribute("aria-selected", "false");
      });
      renderizarPainelConfiguracoes();
    }
  });

  abas.forEach((aba) => {
    aba.addEventListener("click", () => {
      painelConfig.hidden = true;
    });
  });

  const btnVincularConfig = document.getElementById("btn-vincular-config");
  if (btnVincularConfig) {
    btnVincularConfig.addEventListener("click", vincularArquivoConfiguracao);
  }
  verificarHandleSalvo();
}

let configFileHandle = null;

async function salvarHandleNoIndexedDB(handle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SamaeConfigDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction("handles", "readwrite");
      const store = transaction.objectStore("handles");
      store.put(handle, "configFile");
      transaction.oncomplete = () => resolve();
      transaction.onerror = (err) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

async function carregarHandleDoIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SamaeConfigDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction("handles", "readonly");
      const store = transaction.objectStore("handles");
      const req = store.get("configFile");
      req.onsuccess = () => resolve(req.result);
      req.onerror = (err) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

async function verificarHandleSalvo() {
  try {
    const handle = await carregarHandleDoIndexedDB();
    if (handle) {
      configFileHandle = handle;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        atualizarVisualBotaoVinculado();
      } else {
        const btn = document.getElementById("btn-vincular-config");
        if (btn) {
          btn.style.borderColor = "var(--accent-color)";
          btn.innerHTML = "🔄 Reativar Vínculo de Config";
        }
      }
    }
  } catch (e) {
    console.warn("Erro ao verificar handle salvo:", e);
  }
}

function atualizarVisualBotaoVinculado() {
  const btn = document.getElementById("btn-vincular-config");
  if (btn) {
    btn.style.borderColor = "var(--status-normal-color)";
    btn.innerHTML = "✅ Arquivo Vinculado";
  }
}

async function vincularArquivoConfiguracao() {
  try {
    if (configFileHandle) {
      try {
        const perm = await configFileHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          atualizarVisualBotaoVinculado();
          const msg = document.getElementById("configuracao-mensagem");
          if (msg) {
            msg.textContent = "Vínculo com config_reservatorios.json reativado com sucesso!";
            msg.classList.remove("has-alerts");
            setTimeout(() => { msg.textContent = ""; }, 5000);
          }
          return;
        }
      } catch (e) {
        // Se falhar o pedido de permissão, prossegue para abrir o seletor normal
      }
    }

    if (!window.showOpenFilePicker) {
      alert("Seu navegador não suporta salvamento direto de arquivos. Utilize Google Chrome ou Microsoft Edge.");
      return;
    }
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Configuration',
        accept: { 'application/json': ['.json'] }
      }],
      multiple: false
    });
    configFileHandle = handle;
    await salvarHandleNoIndexedDB(handle);
    atualizarVisualBotaoVinculado();

    const msg = document.getElementById("configuracao-mensagem");
    if (msg) {
      msg.textContent = "Arquivo config_reservatorios.json vinculado com sucesso! As alterações serão salvas diretamente.";
      msg.classList.remove("has-alerts");
      setTimeout(() => { msg.textContent = ""; }, 5000);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("Erro ao vincular arquivo:", err);
      alert("Erro ao vincular o arquivo.");
    }
  }
}

function renderizarPainelConfiguracoes() {
  const listaContainer = document.getElementById("config-lista-reservatorios");
  if (!listaContainer) return;

  const banco = window.bancoDeDados;
  if (!banco || !banco.datasDisponiveis || banco.datasDisponiveis.length === 0) return;

  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const dadosDia = banco.historico[ultimaData];
  const reservatorios = dadosDia?.reservatorios || {};

  let sidebarWrapper = listaContainer.parentElement;
  let filtroBar = sidebarWrapper.querySelector(".config-sidebar-filters");
  if (!filtroBar) {
    filtroBar = document.createElement("div");
    filtroBar.className = "config-sidebar-filters";
    filtroBar.style.cssText = "margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;";
    filtroBar.innerHTML = `
      <input type="text" id="config-busca-tag" placeholder="Filtrar por TAG..." style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-bg); color: var(--text-color); font-size: 0.85rem;">
      <select id="config-filtro-grupo" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-bg); color: var(--text-color); font-size: 0.85rem;">
        <option value="TODOS">Todos os Grupos Hidráulicos</option>
      </select>
    `;
    sidebarWrapper.insertBefore(filtroBar, listaContainer);

    const inputBusca = filtroBar.querySelector("#config-busca-tag");
    const selectGrupo = filtroBar.querySelector("#config-filtro-grupo");

    const grupos = new Set();
    Object.values(reservatorios).forEach(r => { if (r.grupo) grupos.add(r.grupo); });
    grupos.forEach(g => {
      selectGrupo.add(new Option(g, g));
    });

    inputBusca.oninput = () => renderizarPainelConfiguracoes();
    selectGrupo.onchange = () => renderizarPainelConfiguracoes();
  }

  const filtroTexto = (sidebarWrapper.querySelector("#config-busca-tag")?.value || "").toLowerCase();
  const grupoSelecionado = sidebarWrapper.querySelector("#config-filtro-grupo")?.value || "TODOS";

  listaContainer.innerHTML = "";
  const chaves = Object.keys(reservatorios).filter(chave => {
    const res = reservatorios[chave];
    const nome = (res.nome || chave).toLowerCase();
    const grupo = res.grupo || "Geral";
    const matchTexto = nome.includes(filtroTexto) || chave.toLowerCase().includes(filtroTexto);
    const matchGrupo = grupoSelecionado === "TODOS" || grupo === grupoSelecionado;
    return matchTexto && matchGrupo;
  });

  if (chaves.length === 0) {
    listaContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--muted-color); padding: 10px;">Nenhum reservatório encontrado.</p>`;
    return;
  }

  if (!reservatorioConfigSelecionado || !reservatorios[reservatorioConfigSelecionado] || !chaves.includes(reservatorioConfigSelecionado)) {
    reservatorioConfigSelecionado = chaves[0];
  }

  chaves.forEach((chave) => {
    const res = reservatorios[chave];
    const item = document.createElement("button");
    item.type = "button";
    item.className = `config-reservoir-item ${chave === reservatorioConfigSelecionado ? "is-active" : ""}`;
    item.innerHTML = `
      <strong>${res.nome || chave}</strong>
      <span>Grupo: ${res.grupo || "Geral"} (${chave})</span>
    `;
    item.addEventListener("click", () => {
      reservatorioConfigSelecionado = chave;
      renderizarPainelConfiguracoes();
    });
    listaContainer.appendChild(item);
  });

  renderizarFormularioConfiguracao(reservatorioConfigSelecionado, reservatorios[reservatorioConfigSelecionado]);
}

function renderizarFormularioConfiguracao(chave, res) {
  const container = document.getElementById("config-detalhe-container");
  if (!container || !res) return;

  const config = obterConfiguracaoReservatorio(chave);

  container.innerHTML = `
    <form id="form-config-reservatorio" class="config-detail-form">
      <div class="config-form-header">
        <h3>Editando: ${res.nome || chave}</h3>
        <span class="config-reservoir-badge">ID: ${chave} · Grupo: ${res.grupo || "Geral"}</span>
      </div>

      <!-- Secção 1: Geral / Capacidade -->
      <fieldset class="config-fieldset">
        <legend>Informações Gerais</legend>
        <div class="config-field-row">
          <div class="config-field">
            <label for="cfg-capacidade">Capacidade Útil (m³)</label>
            <input type="number" step="any" id="cfg-capacidade" value="${config.capacidadeUtil !== undefined ? config.capacidadeUtil : ""}" placeholder="Ex: 5000">
          </div>
          <div class="config-field config-checkbox-field">
            <label>
              <input type="checkbox" id="cfg-manutencao" ${config.emManutencao ? "checked" : ""}>
              Reservatório em Manutenção
            </label>
          </div>
          <div class="config-field config-checkbox-field">
            <label>
              <input type="checkbox" id="cfg-possui-vazao" ${config.possuiMedicaoVazao ? "checked" : ""}>
              Possui Medição de Vazão
            </label>
          </div>
        </div>
      </fieldset>

      <!-- Seção Bilateral Independente: Formulário I & Formulário II -->
      <div class="config-category-block" style="margin-top: 30px; border-top: 2px dashed var(--border-color); padding-top: 20px;">
        <h4 class="config-category-title" style="color: var(--accent-color);">Parâmetros Globais Bilaterais (Automação & Relatórios)</h4>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 16px;">
          
          <!-- FORMULÁRIO I (Resumo de Passagem de Plantão) -->
          <fieldset class="config-fieldset" style="background: var(--surface-bg);">
            <legend>FORMULÁRIO I (Passagem de Plantão)</legend>
            <div class="config-field" style="margin-bottom: 12px;">
              <label for="cfg-emails-plantao">E-mails de Destino (separados por vírgula)</label>
              <input type="text" id="cfg-emails-plantao" value="${config.emailsPlantao || 'plantao.cco@samae.sc.gov.br'}" placeholder="cco@samae.sc.gov.br">
            </div>
            <div class="config-field" style="margin-bottom: 12px;">
              <label>Grade de Timers (Disparos Diários Agendados)</label>
              <div id="cfg-timers-grade-container" style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <div style="display: flex; gap: 8px;">
                  <input type="time" class="cfg-timer-input" value="${config.timer1 || '05:00'}" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
                  <input type="time" class="cfg-timer-input" value="${config.timer2 || '13:00'}" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
                  <input type="time" class="cfg-timer-input" value="${config.timer3 || '21:00'}" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
                </div>
              </div>
            </div>
            <div class="config-field">
              <label for="cfg-caminho-local">Caminho Físico de Diretório Local</label>
              <input type="text" id="cfg-caminho-local" value="${config.caminhoLocal || 'C:/Samae/Relatorios/Plantao'}" placeholder="C:/Samae/Relatorios/Plantao">
            </div>
          </fieldset>

          <!-- FORMULÁRIO II (Log de Erros e SLA Técnico) -->
          <fieldset class="config-fieldset" style="background: var(--surface-bg);">
            <legend>FORMULÁRIO II (Log de Erros e SLA)</legend>
            <div class="config-field" style="margin-bottom: 12px;">
              <label for="cfg-emails-manutencao">E-mails Analíticos da Manutenção</label>
              <input type="text" id="cfg-emails-manutencao" value="${config.emailsManutencao || 'manutencao.telemetria@samae.sc.gov.br'}" placeholder="manutencao@samae.sc.gov.br">
            </div>
            <div class="config-field-row" style="margin-bottom: 12px;">
              <div class="config-field" style="flex: 1;">
                <label for="cfg-cron-dia">Dia da Semana (Cron)</label>
                <select id="cfg-cron-dia" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
                  <option value="diario" ${config.cronDia === 'diario' ? 'selected' : ''}>Diário (Todos os dias)</option>
                  <option value="util" ${config.cronDia === 'util' ? 'selected' : ''}>Dias Úteis (Seg-Sex)</option>
                  <option value="fimdesemana" ${config.cronDia === 'fimdesemana' ? 'selected' : ''}>Finais de Semana</option>
                </select>
              </div>
              <div class="config-field" style="flex: 1;">
                <label for="cfg-cron-hora">Horário Cron</label>
                <input type="time" id="cfg-cron-hora" value="${config.cronHora || '05:30'}" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
              </div>
            </div>
            <div class="config-field-row" style="margin-bottom: 12px;">
              <div class="config-field" style="flex: 1;">
                <label for="cfg-sla-minutos">Tempo Limite SLA (min)</label>
                <input type="number" id="cfg-sla-minutos" value="${config.slaMinutos !== undefined ? config.slaMinutos : 15}" min="1" max="120">
              </div>
              <div class="config-field" style="flex: 1;">
                <label for="cfg-tolerancia-ruido">Tolerância de Ruído (%)</label>
                <input type="number" step="any" id="cfg-tolerancia-ruido" value="${config.toleranciaRuido !== undefined ? config.toleranciaRuido : 2.5}" min="0">
              </div>
            </div>
            <div class="config-field">
              <label for="cfg-caminho-hdd">Caminho de Disco Rígido Alternativo (HDD)</label>
              <input type="text" id="cfg-caminho-hdd" value="${config.caminhoHdd || 'D:/Backup_CCO/Incidentes'}" placeholder="D:/Backup_CCO/Incidentes">
            </div>
          </fieldset>

        </div>
      </div>

      <!-- Categoria: Nível -->
      <div class="config-category-block">
        <h4 class="config-category-title">Nível</h4>
        <fieldset class="config-fieldset">
          <legend>Nível (%)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme Instantâneo</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Nível</span>
              <input type="checkbox" id="cfg-alerta-nivel-ativo" ${config.alertaNivelAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-nivel-atencao">Limite de Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-atencao" value="${config.nivelAtencao}" min="0" max="100">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-critico">Limite Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-critico" value="${config.nivelCritico}" min="0" max="100">
            </div>
          </div>

          <div class="config-section-header config-sub-header">
            <span class="config-section-label">Desvio de Média (Madrugada)</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Média</span>
              <input type="checkbox" id="cfg-alerta-nivel-medio-ativo" ${config.alertaNivelMedioAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-nivel-medio-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-medio-atencao" value="${config.nivelMedioAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-medio-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-medio-critico" value="${config.nivelMedioCritico}" min="0">
            </div>
          </div>
        </fieldset>
      </div>

      <!-- Categoria: Vazão -->
      <div class="config-category-block">
        <h4 class="config-category-title">Vazão</h4>
        <fieldset class="config-fieldset">
          <legend>Vazão de Entrada (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão de Entrada</span>
              <input type="checkbox" id="cfg-alerta-vazao-entrada-ativo" ${config.alertaVazaoEntradaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-entrada-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-entrada-atencao" value="${config.vazaoEntradaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-entrada-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-entrada-critico" value="${config.vazaoEntradaCritico}" min="0">
            </div>
          </div>
        </fieldset>

        <fieldset class="config-fieldset">
          <legend>Vazão de Saída (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão de Saída</span>
              <input type="checkbox" id="cfg-alerta-vazao-saida-ativo" ${config.alertaVazaoSaidaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-saida-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-saida-atencao" value="${config.vazaoSaidaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-saida-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-saida-critico" value="${config.vazaoSaidaCritico}" min="0">
            </div>
          </div>
        </fieldset>

        <fieldset class="config-fieldset">
          <legend>Vazão Média (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão Média</span>
              <input type="checkbox" id="cfg-alerta-vazao-media-ativo" ${config.alertaVazaoMediaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-media-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-media-atencao" value="${config.vazaoMediaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-media-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-media-critico" value="${config.vazaoMediaCritico}" min="0">
            </div>
          </div>
        </fieldset>
      </div>

      <!-- Categoria: Autonomia Preditiva -->
      <div class="config-category-block">
        <h4 class="config-category-title">Autonomia Preditiva (Baseada em Tempo)</h4>
        <fieldset class="config-fieldset">
          <legend>Parâmetros de Alerta Temporal (Minutos)</legend>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-tempo-atencao">Tempo Atenção (min)</label>
              <input type="number" step="any" id="cfg-tempo-atencao" value="${config.tempoAtencaoMinutos}" min="1">
            </div>
            <div class="config-field">
              <label for="cfg-tempo-critico">Tempo Crítico (min)</label>
              <input type="number" step="any" id="cfg-tempo-critico" value="${config.tempoCriticoMinutos}" min="1">
            </div>
          </div>
          <div class="config-field-row" style="margin-top: 12px;">
            <div class="config-field">
              <label for="cfg-nivel-atencao-tempo">Nível Alerta Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-atencao-tempo" value="${config.nivelAlertaTempoAtencao}" min="0" max="100">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-critico-tempo">Nível Alerta Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-critico-tempo" value="${config.nivelAlertaTempoCritico}" min="0" max="100">
            </div>
          </div>
        </fieldset>
      </div>

      <div class="config-form-actions">
        <button type="submit" class="btn-guardar-config">Guardar Configuração</button>
      </div>

      <!-- Categoria: Simulação de Alarme CCO (Teste) -->
      <div class="config-category-block" style="margin-top: 24px;">
        <h4 class="config-category-title">Simulação de Alarme CCO (Teste Visual)</h4>
        <p style="font-size: 0.8rem; color: var(--muted-color); margin-bottom: 12px;">
          Clique nos botões abaixo para forçar o aparecimento do banner de alarme preditivo no topo da tela e testar o sistema.
        </p>
        <div class="config-field-row" style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" id="btn-simular-critico" class="btn-guardar-config" style="background-color: var(--status-critical-color); color: #fff; border: none;">Simular Alarme Crítico</button>
          <button type="button" id="btn-simular-atencao" class="btn-guardar-config" style="background-color: var(--status-attention-color); color: #fff; border: none;">Simular Alarme Atenção</button>
          <button type="button" id="btn-limpar-simulacao" class="btn-guardar-config" style="background-color: var(--muted-color); color: #fff; border: none;">Limpar Simulação</button>
        </div>
      </div>
    </form>
  `;

  const form = document.getElementById("form-config-reservatorio");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    salvarConfiguracaoReservatorio(chave);
  });

  const btnCritico = document.getElementById("btn-simular-critico");
  const btnAtencao = document.getElementById("btn-simular-atencao");
  const btnLimpar = document.getElementById("btn-limpar-simulacao");

  if (btnCritico) btnCritico.onclick = () => simularAlarmeCCO("Crítico");
  if (btnAtencao) btnAtencao.onclick = () => simularAlarmeCCO("Atenção");
  if (btnLimpar) btnLimpar.onclick = () => limparSimulacaoCCO();
}

let alarmeSimuladoCCO = null;

function simularAlarmeCCO(status) {
  alarmeSimuladoCCO = {
    chave: "simulado-01",
    nome: "Reservatório Setor B (Simulado)",
    statusPredicao: status,
    tempoEstimadoHoras: status === "Crítico" ? 1.5 : 3.2,
    tendenciaUltimaHora: -4.2
  };
  ccoAlertaReconhecido = false;
  atualizarAnunciadorAlarmesCCO();
  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = `Alarme preditivo (${status}) simulado com sucesso! Verifique o banner no topo da tela.`;
    msg.classList.remove("has-alerts");
    setTimeout(() => { msg.textContent = ""; }, 4000);
  }
}

function limparSimulacaoCCO() {
  alarmeSimuladoCCO = null;
  ccoAlertaReconhecido = false;
  atualizarAnunciadorAlarmesCCO();
  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = "Simulação de alarme limpa com sucesso.";
    msg.classList.remove("has-alerts");
    setTimeout(() => { msg.textContent = ""; }, 3000);
  }
}

function atualizarAnunciadorAlarmesCCO() {
  const banner = document.getElementById("cco-alarm-banner");
  const msgSpan = document.getElementById("cco-banner-msg");
  const btnAck = document.getElementById("cco-banner-ack");
  if (!banner || !msgSpan) return;

  const banco = window.bancoDeDados;
  const dataSelecionada = document.getElementById("seletor-data")?.value;
  if (!banco || !dataSelecionada || !banco.historico[dataSelecionada]) {
    banner.hidden = true;
    banner.style.display = "none";
    return;
  }

  const dadosDia = banco.historico[dataSelecionada];
  const reservatorios = dadosDia.reservatorios || {};
  let alertaCriticoEncontrado = null;
  let alertaAtencaoEncontrado = null;

  if (alarmeSimuladoCCO) {
    if (alarmeSimuladoCCO.statusPredicao === "Crítico") {
      alertaCriticoEncontrado = alarmeSimuladoCCO;
    } else {
      alertaAtencaoEncontrado = alarmeSimuladoCCO;
    }
  } else {
    Object.entries(reservatorios).forEach(([chave, res]) => {
      const config = obterConfiguracaoReservatorio(chave);
      const predicao = avaliarAlarmePreditivo(res, config, dadosDia.horarios || []);
      if (predicao.statusPredicao === "Crítico") {
        alertaCriticoEncontrado = { chave, nome: res.nome || chave, ...predicao };
      } else if (predicao.statusPredicao === "Atenção" && !alertaCriticoEncontrado) {
        alertaAtencaoEncontrado = { chave, nome: res.nome || chave, ...predicao };
      }
    });
  }

  const alertaAtivo = alertaCriticoEncontrado || alertaAtencaoEncontrado;

  if (alertaAtivo && !ccoAlertaReconhecido) {
    banner.hidden = false;
    banner.style.display = "block";
    banner.className = `cco-alarm-banner cco-banner-${alertaCriticoEncontrado ? 'critico' : 'atencao'}`;
    msgSpan.textContent = `Reservatório ${alertaAtivo.nome} atingirá nível de ${alertaAtivo.statusPredicao.toLowerCase()} em ~${alertaAtivo.tempoEstimadoHoras.toFixed(1)}h (Tendência: ${alertaAtivo.tendenciaUltimaHora.toFixed(1)}%).`;
  } else {
    banner.hidden = true;
    banner.style.display = "none";
  }

  if (btnAck && !btnAck.dataset.bound) {
    btnAck.dataset.bound = "true";
    btnAck.addEventListener("click", () => {
      ccoAlertaReconhecido = true;
      banner.hidden = true;
      banner.style.display = "none";
      setTimeout(() => { ccoAlertaReconhecido = false; }, 60000);
    });
  }
}

async function salvarConfiguracaoReservatorio(chave) {
  const capacidadeUtil = document.getElementById("cfg-capacidade").value;
  const nivelAtencao = document.getElementById("cfg-nivel-atencao").value;
  const nivelCritico = document.getElementById("cfg-nivel-critico").value;
  const nivelMedioAtencao = document.getElementById("cfg-nivel-medio-atencao").value;
  const nivelMedioCritico = document.getElementById("cfg-nivel-medio-critico").value;
  const vazaoEntradaAtencao = document.getElementById("cfg-vazao-entrada-atencao").value;
  const vazaoEntradaCritico = document.getElementById("cfg-vazao-entrada-critico").value;
  const vazaoSaidaAtencao = document.getElementById("cfg-vazao-saida-atencao").value;
  const vazaoSaidaCritico = document.getElementById("cfg-vazao-saida-critico").value;
  const vazaoMediaAtencao = document.getElementById("cfg-vazao-media-atencao").value;
  const vazaoMediaCritico = document.getElementById("cfg-vazao-media-critico").value;
  const tempoAtencaoMinutos = document.getElementById("cfg-tempo-atencao")?.value;
  const tempoCriticoMinutos = document.getElementById("cfg-tempo-critico")?.value;
  const nivelAlertaTempoAtencao = document.getElementById("cfg-nivel-atencao-tempo")?.value;
  const nivelAlertaTempoCritico = document.getElementById("cfg-nivel-critico-tempo")?.value;

  const alertaNivelAtivo = document.getElementById("cfg-alerta-nivel-ativo").checked;
  const alertaNivelMedioAtivo = document.getElementById("cfg-alerta-nivel-medio-ativo").checked;
  const alertaVazaoEntradaAtivo = document.getElementById("cfg-alerta-vazao-entrada-ativo").checked;
  const alertaVazaoSaidaAtivo = document.getElementById("cfg-alerta-vazao-saida-ativo").checked;
  const alertaVazaoMediaAtivo = document.getElementById("cfg-alerta-vazao-media-ativo").checked;
  const emManutencao = document.getElementById("cfg-manutencao").checked;
  const possuiMedicaoVazao = document.getElementById("cfg-possui-vazao").checked;

  const salvos = JSON.parse(localStorage.getItem("samai_reservatorios_config") || "{}");
  salvos[chave] = {
    capacidadeUtil,
    nivelAtencao: nivelAtencao !== "" ? Number(nivelAtencao) : 60,
    nivelCritico: nivelCritico !== "" ? Number(nivelCritico) : 50,
    nivelMedioAtencao: nivelMedioAtencao !== "" ? Number(nivelMedioAtencao) : 15,
    nivelMedioCritico: nivelMedioCritico !== "" ? Number(nivelMedioCritico) : 25,
    vazaoEntradaAtencao: vazaoEntradaAtencao !== "" ? Number(vazaoEntradaAtencao) : 20,
    vazaoEntradaCritico: vazaoEntradaCritico !== "" ? Number(vazaoEntradaCritico) : 35,
    vazaoSaidaAtencao: vazaoSaidaAtencao !== "" ? Number(vazaoSaidaAtencao) : 20,
    vazaoSaidaCritico: vazaoSaidaCritico !== "" ? Number(vazaoSaidaCritico) : 35,
    vazaoMediaAtencao: vazaoMediaAtencao !== "" ? Number(vazaoMediaAtencao) : 20,
    vazaoMediaCritico: vazaoMediaCritico !== "" ? Number(vazaoMediaCritico) : 35,
    alertaNivelAtivo,
    alertaNivelMedioAtivo,
    alertaVazaoEntradaAtivo,
    alertaVazaoSaidaAtivo,
    alertaVazaoMediaAtivo,
    emManutencao,
    possuiMedicaoVazao,
    tempoAtencaoMinutos: tempoAtencaoMinutos !== "" ? Number(tempoAtencaoMinutos) : 180,
    tempoCriticoMinutos: tempoCriticoMinutos !== "" ? Number(tempoCriticoMinutos) : 180,
    nivelAlertaTempoAtencao: nivelAlertaTempoAtencao !== "" ? Number(nivelAlertaTempoAtencao) : 40,
    nivelAlertaTempoCritico: nivelAlertaTempoCritico !== "" ? Number(nivelAlertaTempoCritico) : 30
  };

  localStorage.setItem("samai_reservatorios_config", JSON.stringify(salvos));

  if (configFileHandle) {
    try {
      const writable = await configFileHandle.createWritable();
      await writable.write(JSON.stringify(salvos, null, 2));
      await writable.close();
    } catch (err) {
      console.error("Erro ao gravar diretamente no arquivo vinculado:", err);
    }
  }

  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = `Configuração do reservatório ${chave} guardada${configFileHandle ? ' e salva no arquivo' : ''} com sucesso!`;
    msg.classList.remove("has-alerts");
    setTimeout(() => {
      msg.textContent = "";
    }, 4000);
  }
}
