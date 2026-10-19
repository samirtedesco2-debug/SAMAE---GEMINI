// ui.js - Funções de renderização de interface, cards e tabelas

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

function renderizarListaReservatorios(
  container,
  disponiveis,
  selecionados,
  idDica,
) {
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

function atualizarContagemReservatorios(container, idDica) {
  const selecionados = obterReservatoriosSelecionados(container).length;
  const disponiveis = container.querySelectorAll(
    'input[type="checkbox"]',
  ).length;
  const elementoDica = document.getElementById(idDica);
  if (elementoDica) {
    elementoDica.textContent =
      `${selecionados} de ${disponiveis} reservatório(s) selecionado(s). ` +
      "Marque os itens desejados.";
  }
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
    chave,
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
  const statusNivel = avaliarStatusNivel(res.leituras?.nivel, chave, comparacaoNivel?.referencia);
  let statusClass = "status-normal";
  if (statusNivel === "Atenção") statusClass = "status-atencao";
  if (statusNivel === "Crítico") statusClass = "status-critico";
  if (statusNivel === "Sem Dados") statusClass = "status-sem-dados";

  const comparacoesVazao = alertaVazao.indicadores
    .filter((indicador) => indicador.classificaAlerta && indicador.rotulo !== "Média")
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

  const predicao = calcularAutonomiaEProjecao(res, chave);
  const predicaoHTML = predicao && predicao.statusPreditivo !== "Normal"
    ? `<div style="background: rgba(227,93,106,0.1); border: 1px solid var(--status-critico-color, #e35d6a); border-radius: 6px; padding: 6px 10px; margin-top: 10px; font-size: 0.8rem; color: var(--status-critico-color, #e35d6a); display: flex; align-items: center; gap: 6px;">
        <span>⏳</span> <strong>Autonomia:</strong> ${predicao.mensagemPreditiva}
       </div>`
    : "";

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
      ${predicaoHTML}
      ${graficoHTML}
    </div>
  `;
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

  const comparacaoNivel = obterComparacaoNivel(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
    obterUltimaLeituraNivel(reservatorio.leituras?.nivel),
  );
  const nivel = obterUltimaLeituraNivel(reservatorio.leituras?.nivel);
  const statusNivel = avaliarStatusNivel(reservatorio.leituras?.nivel, chave, comparacaoNivel?.referencia);
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
    chave,
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
    `(${referencia.quantidade} dia(s) válidos). Na vazão mínima, desvios para ` +
    `cima ou para baixo de ${LIMITE_ATENCAO_VAZAO_PERCENTUAL}% a ` +
    `${LIMITE_CRITICO_VAZAO_PERCENTUAL}% geram atenção; acima de ` +
    `${LIMITE_CRITICO_VAZAO_PERCENTUAL}% são críticos. Na máxima, somente ` +
    `aumentos em relação à referência geram alarme. ` +
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
          : indicador.rotulo === "Máxima" && indicador.variacao <= 0
            ? `${formatarPercentual(indicador.variacao)} · igual ou abaixo da referência, sem alarme`
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
  extremosHistoricos.setAttribute("aria-label", "Extremos históricos de vazão");
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
  fechar.setAttribute(
    "aria-label",
    "Fechar detalhes do boletim e voltar ao resumo",
  );
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

    const btnInfo = document.createElement("button");
    btnInfo.type = "button";
    btnInfo.className = "operational-detail-info-btn";
    btnInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> <span>Base</span>`;
    btnInfo.title = "Ver dados da base de comparação e referências";

    btnInfo.addEventListener("click", () => {
      const bases = card.querySelectorAll(".operational-detail-base-desc");
      const isHidden = bases[0]?.hidden ?? true;
      bases.forEach(b => { b.hidden = !isHidden; });
      btnInfo.classList.toggle("is-active", isHidden);
      btnInfo.innerHTML = isHidden
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> <span>Ocultar</span>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> <span>Base</span>`;
    });

    const nomeContainer = document.createElement("div");
    nomeContainer.className = "operational-detail-title-wrap";
    nomeContainer.append(nome, btnInfo);
    topo.append(nomeContainer);
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
        vazaoIndisponivel ? "Sem comparação" : registro.alertaVazao?.status,
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
        criarCelulaDetalhe("Variação (%)", variacaoNivel),
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
      descricaoReferenciaNivel.className = "operational-detail-reason operational-detail-base-desc";
      descricaoReferenciaNivel.hidden = true;
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
        descricaoBase.className = "operational-detail-reason operational-detail-base-desc";
        descricaoBase.hidden = true;
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

function renderizarAnaliseGraficoReservatorio(
  painel,
  reservatorio,
  chave,
  data,
  horarios,
) {
  painel.replaceChildren();
  const niveis = resumirLeiturasEstruturadas(
    filtrarLeiturasNivelValidas(reservatorio.leituras?.nivel),
    horarios,
  );
  const vazoes = resumirLeiturasEstruturadas(
    filtrarLeiturasVazaoValidas(reservatorio.leituras?.vazao),
    horarios,
  );
  const estatisticasHistoricas = graficoAnaliseComHistorico
    ? obterEstatisticasHistoricasPorHorario(
        window.bancoDeDados,
        chave,
        horarios,
      )
    : null;

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
  contexto.textContent =
    `${data} · ${horarios.length} horário(s) previstos · ` +
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
  const controlesGrafico = document.createElement("div");
  controlesGrafico.className = "reservoir-analysis-chart-controls";
  controlesGrafico.append(modosGrafico);
  const rotuloHistorico = document.createElement("label");
  rotuloHistorico.className = "reservoir-analysis-history-toggle";
  const controleHistorico = document.createElement("input");
  controleHistorico.type = "checkbox";
  controleHistorico.dataset.analysisHistory = "";
  controleHistorico.checked = graficoAnaliseComHistorico;
  const textoHistorico = document.createElement("span");
  textoHistorico.textContent = "Histórico (mín., média, máx.)";
  rotuloHistorico.append(controleHistorico, textoHistorico);
  const seletorSeries = document.createElement("details");
  seletorSeries.className = "reservoir-analysis-series-selector";
  const tituloSeries = document.createElement("summary");
  tituloSeries.textContent = "Séries visíveis";
  const listaSeries = document.createElement("div");
  listaSeries.className = "reservoir-analysis-series-list";
  listaSeries.dataset.analysisSeriesList = "";
  seletorSeries.append(tituloSeries, listaSeries);
  controlesGrafico.append(rotuloHistorico, seletorSeries);
  graficoCabecalho.append(graficoTitulo, controlesGrafico);
  const grafico = document.createElement("div");
  grafico.className = "reservoir-analysis-chart";
  const canvas = document.createElement("canvas");
  const sufixoGrafico = graficoAnaliseComMedias ? "-medias" : "";
  canvas.id = `chart-${reservatorio.nome.replace(/[^a-zA-Z0-9]/g, "_")}${sufixoGrafico}`;
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
  if (estatisticasHistoricas) {
    observacao.textContent +=
      " As estatísticas históricas por horário usam todas as datas disponíveis.";
  }
  const tabelaWrap = document.createElement("div");
  tabelaWrap.className = "reservoir-analysis-table-wrap";
  const tabela = document.createElement("table");
  tabela.className = "reservoir-analysis-table";
  const cabecalhoTabela = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  const colunasTabela = [
    "Horário",
    "Nível",
    "Dif. nível",
    "Status nível",
    ...(estatisticasHistoricas
      ? ["Nível hist. mín.", "Nível hist. média", "Nível hist. máx."]
      : []),
    "Vazão",
    "Dif. vazão",
    "Qualidade vazão",
    ...(estatisticasHistoricas
      ? ["Vazão hist. mín.", "Vazão hist. média", "Vazão hist. máx."]
      : []),
  ];
  colunasTabela.forEach((rotulo) => {
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

    const valoresLinha = [
      horarios[indice] ?? `Leitura ${indice + 1}`,
      formatarLeituraAnalitica(leituraNivel.valor, "%"),
      diferencaNivel,
      statusNivel,
      ...(estatisticasHistoricas
        ? [
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.minimo[indice] ?? null,
              "%",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.media[indice] ?? null,
              "%",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.maximo[indice] ?? null,
              "%",
            ),
          ]
        : []),
      formatarLeituraAnalitica(leituraVazao.valor, " L/s"),
      variacaoVazao,
      statusVazao,
      ...(estatisticasHistoricas
        ? [
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.minimo[indice] ?? null,
              " L/s",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.media[indice] ?? null,
              " L/s",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.maximo[indice] ?? null,
              " L/s",
            ),
          ]
        : []),
    ];
    valoresLinha.forEach((valor) => {
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
    estatisticasHistoricas,
    data,
  );
}

function formatarLeituraOriginal(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toFixed(1) : String(valor);
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
  }).format(diferenca)}%`;
}

function formatarVariacaoAnalitica(variacao) {
  return variacao === null ? "—" : formatarPercentual(variacao);
}

function obterClasseStatus(status) {
  if (status === "Atenção") return "status-atencao";
  if (status === "Crítico") return "status-critico";
  if (status === "Sem Dados") return "status-sem-dados";
  if (status === "Sem comparação") return "status-sem-comparacao";
  if (status === "Manutenção") return "status-normal";
  return "status-normal";
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

function formatarMetrica(valor, unidade) {
  return valor === null ? "Sem dados" : `${valor.toFixed(1)}${unidade}`;
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

function obterIdentificacaoReservatorio(chave) {
  return chave.match(/\b(?:R\d{1,3}(?:-[A-Z])?|ES\d{2})\b/i)?.[0] ?? chave;
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
  const alertasPreditivos = [];
  const quantidadeSlots = horarios.length;

  chavesFiltradas.forEach((chave) => {
    const reservatorio = reservatorios[chave];
    const predicao = reservatorio ? calcularAutonomiaEProjecao(reservatorio, chave) : null;
    if (predicao && predicao.statusPreditivo !== "Normal") {
      alertasPreditivos.push({ chave, nome: reservatorio.nome || chave, ...predicao });
    }

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
    const comparacaoNivel = reservatorio
      ? obterComparacaoNivel(
          banco,
          chave,
          dataSelecionada,
          baseComparacao,
          horarios,
          obterUltimaLeituraNivel(reservatorio.leituras?.nivel),
        )
      : null;
    const registro = {
      chave,
      reservatorio: reservatorio ?? reservatoriosDiaAnterior[chave],
      atual: reservatorio,
      anterior: reservatoriosDiaAnterior[chave],
      ausentes: ausentesSelecionadas,
      statusNivel: reservatorio
        ? avaliarStatusNivel(reservatorio.leituras?.nivel, chave, comparacaoNivel?.referencia)
        : null,
      comparacaoNivel,
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
            chave,
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
    const nivelSemDados = nivelAtivo && registro.statusNivel === "Sem Dados";
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
    if (ausentesSelecionadas.length > 0 || nivelSemDados) {
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

  const bannerPreditivo = document.getElementById("global-predictive-banner");
  if (bannerPreditivo) {
    if (alertasPreditivos.length > 0) {
      bannerPreditivo.hidden = false;
      bannerPreditivo.innerHTML = `
        <div style="background: var(--surface-bg); border: 1px solid var(--status-critico-color, #e35d6a); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--status-critico-color, #e35d6a);">
            <span>⏳ Alerta Preditivo de Autonomia (CCO)</span>
            <span style="font-size: 0.8rem; background: rgba(227,93,106,0.15); padding: 2px 8px; border-radius: 12px;">${alertasPreditivos.length} reservatório(s) em risco</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${alertasPreditivos.map(p => `
              <button type="button" data-detail-reservoir="${p.chave}" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; text-align: left; font-size: 0.85rem; color: var(--text-color);">
                <strong>${p.nome}</strong>: <span style="color: var(--status-critico-color, #e35d6a);">${p.mensagemPreditiva}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `;
    } else {
      bannerPreditivo.hidden = false;
      bannerPreditivo.innerHTML = `
        <div style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--muted-color);">
          <span>⏳ <strong>Autonomia Preditiva:</strong> Todos os reservatórios com autonomia segura (> 3h nos limites configurados).</span>
        </div>
      `;
    }
  }

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
      
      // === ADICIONE ESTA VERIFICAÇÃO AQUI ===
      if (chave === "critico" && registros.length > 0) {
        botao.classList.add("animar-pulso");
      }
      // ======================================

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
