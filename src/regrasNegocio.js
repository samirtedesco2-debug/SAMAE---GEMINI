// regrasNegocio.js - Centraliza cálculos e regras operacionais

const LIMITE_ATENCAO_NIVEL_PERCENTUAL = 60;
const LIMITE_CRITICO_NIVEL_PERCENTUAL = 50;
const LIMITE_ATENCAO_VAZAO_PERCENTUAL = 20;
const LIMITE_CRITICO_VAZAO_PERCENTUAL = 35;

function obterConfiguracaoReservatorio(idReservatorio) {
  try {
    const salvos = JSON.parse(localStorage.getItem("samai_reservatorios_config") || "{}");
    const arquivoConfig = window.bancoDeDados?.configuracoes || {};
    const config = salvos[idReservatorio] !== undefined && salvos[idReservatorio] !== null && Object.keys(salvos[idReservatorio]).length > 0
      ? salvos[idReservatorio]
      : arquivoConfig[idReservatorio];

    return {
      nivelAtencao: config?.nivelAtencao !== undefined && config?.nivelAtencao !== "" && !isNaN(config.nivelAtencao) ? Number(config.nivelAtencao) : LIMITE_ATENCAO_NIVEL_PERCENTUAL,
      nivelCritico: config?.nivelCritico !== undefined && config?.nivelCritico !== "" && !isNaN(config.nivelCritico) ? Number(config.nivelCritico) : LIMITE_CRITICO_NIVEL_PERCENTUAL,
      nivelMedioAtencao: config?.nivelMedioAtencao !== undefined && config?.nivelMedioAtencao !== "" && !isNaN(config.nivelMedioAtencao) ? Number(config.nivelMedioAtencao) : 15,
      nivelMedioCritico: config?.nivelMedioCritico !== undefined && config?.nivelMedioCritico !== "" && !isNaN(config.nivelMedioCritico) ? Number(config.nivelMedioCritico) : 25,
      vazaoEntradaAtencao: config?.vazaoEntradaAtencao !== undefined && config?.vazaoEntradaAtencao !== "" && !isNaN(config.vazaoEntradaAtencao) ? Number(config.vazaoEntradaAtencao) : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoEntradaCritico: config?.vazaoEntradaCritico !== undefined && config?.vazaoEntradaCritico !== "" && !isNaN(config.vazaoEntradaCritico) ? Number(config.vazaoEntradaCritico) : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoSaidaAtencao: config?.vazaoSaidaAtencao !== undefined && config?.vazaoSaidaAtencao !== "" && !isNaN(config.vazaoSaidaAtencao) ? Number(config.vazaoSaidaAtencao) : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoSaidaCritico: config?.vazaoSaidaCritico !== undefined && config?.vazaoSaidaCritico !== "" && !isNaN(config.vazaoSaidaCritico) ? Number(config.vazaoSaidaCritico) : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoMediaAtencao: config?.vazaoMediaAtencao !== undefined && config?.vazaoMediaAtencao !== "" && !isNaN(config.vazaoMediaAtencao) ? Number(config.vazaoMediaAtencao) : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoMediaCritico: config?.vazaoMediaCritico !== undefined && config?.vazaoMediaCritico !== "" && !isNaN(config.vazaoMediaCritico) ? Number(config.vazaoMediaCritico) : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      alertaNivelAtivo: config?.alertaNivelAtivo !== undefined ? Boolean(config.alertaNivelAtivo) : true,
      alertaNivelMedioAtivo: config?.alertaNivelMedioAtivo !== undefined ? Boolean(config.alertaNivelMedioAtivo) : true,
      alertaVazaoEntradaAtivo: config?.alertaVazaoEntradaAtivo !== undefined ? Boolean(config.alertaVazaoEntradaAtivo) : true,
      alertaVazaoSaidaAtivo: config?.alertaVazaoSaidaAtivo !== undefined ? Boolean(config.alertaVazaoSaidaAtivo) : true,
      alertaVazaoMediaAtivo: config?.alertaVazaoMediaAtivo !== undefined ? Boolean(config.alertaVazaoMediaAtivo) : true,
      possuiMedicaoVazao: config?.possuiMedicaoVazao !== undefined ? Boolean(config.possuiMedicaoVazao) : false,
      capacidadeUtil: config?.capacidadeUtil ?? "",
      emManutencao: Boolean(config?.emManutencao),
      tempoAtencaoMinutos: config?.tempoAtencaoMinutos !== undefined && config?.tempoAtencaoMinutos !== "" && !isNaN(config.tempoAtencaoMinutos) ? Number(config.tempoAtencaoMinutos) : 180,
      tempoCriticoMinutos: config?.tempoCriticoMinutos !== undefined && config?.tempoCriticoMinutos !== "" && !isNaN(config.tempoCriticoMinutos) ? Number(config.tempoCriticoMinutos) : 180,
      nivelAlertaTempoAtencao: config?.nivelAlertaTempoAtencao !== undefined && config?.nivelAlertaTempoAtencao !== "" && !isNaN(config.nivelAlertaTempoAtencao) ? Number(config.nivelAlertaTempoAtencao) : 40,
      nivelAlertaTempoCritico: config?.nivelAlertaTempoCritico !== undefined && config?.nivelAlertaTempoCritico !== "" && !isNaN(config.nivelAlertaTempoCritico) ? Number(config.nivelAlertaTempoCritico) : 30
    };
  } catch (e) {
    return {
      nivelAtencao: LIMITE_ATENCAO_NIVEL_PERCENTUAL,
      nivelCritico: LIMITE_CRITICO_NIVEL_PERCENTUAL,
      nivelMedioAtencao: 15,
      nivelMedioCritico: 25,
      vazaoEntradaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoEntradaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoSaidaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoSaidaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoMediaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoMediaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      alertaNivelAtivo: true,
      alertaNivelMedioAtivo: true,
      alertaVazaoEntradaAtivo: true,
      alertaVazaoSaidaAtivo: true,
      alertaVazaoMediaAtivo: true,
      capacidadeUtil: "",
      emManutencao: false,
      tempoAtencaoMinutos: 180,
      tempoCriticoMinutos: 180,
      nivelAlertaTempoAtencao: 40,
      nivelAlertaTempoCritico: 30
    };
  }
}

function obterUltimaLeituraValida(valores) {
  if (!Array.isArray(valores)) return null;
  for (let i = valores.length - 1; i >= 0; i--) {
    const v = valores[i];
    if (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function avaliarStatusNivel(valores, idReservatorio, referenciaMedia) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  if (config.emManutencao) return "Manutenção";

  let statusInstantaneo = "Normal";
  if (config.alertaNivelAtivo) {
    const nivelAtual = obterUltimaLeituraValida(valores);
    if (nivelAtual !== null) {
      if (nivelAtual < config.nivelCritico) statusInstantaneo = "Crítico";
      else if (nivelAtual < config.nivelAtencao) statusInstantaneo = "Atenção";
    } else {
      statusInstantaneo = "Sem Dados";
    }
  }

  let statusMedio = "Normal";
  if (config.alertaNivelMedioAtivo && referenciaMedia !== null && referenciaMedia !== undefined && referenciaMedia > 0 && Array.isArray(valores)) {
    const mediaAtual = calcularMediaValida(filtrarLeiturasNivelValidas(valores));
    if (mediaAtual !== null) {
      const variacao = ((mediaAtual - referenciaMedia) / Math.abs(referenciaMedia)) * 100;
      const magnitude = Math.abs(variacao);
      if (magnitude > config.nivelMedioCritico + 1e-9) statusMedio = "Crítico";
      else if (magnitude >= config.nivelMedioAtencao - 1e-9) statusMedio = "Atenção";
    }
  }

  if (statusInstantaneo === "Crítico" || statusMedio === "Crítico") return "Crítico";
  if (statusInstantaneo === "Atenção" || statusMedio === "Atenção") return "Atenção";
  if (statusInstantaneo === "Sem Dados" && statusMedio === "Sem Dados") return "Sem Dados";
  return "Normal";
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

function avaliarAlertaVazao(leiturasAtuais, referencia, horarios, idReservatorio) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  if (config.emManutencao) {
    return { status: "Manutenção", indicadores: [], referencia };
  }
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
      classificaAlerta: true,
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
      somenteAcimaDaReferencia: true,
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

    let limAtencao = config.vazaoEntradaAtencao;
    let limCritico = config.vazaoEntradaCritico;
    let ativo = config.alertaVazaoEntradaAtivo;

    if (indicador.rotulo === "Mínima") {
      limAtencao = config.vazaoSaidaAtencao;
      limCritico = config.vazaoSaidaCritico;
      ativo = config.alertaVazaoSaidaAtivo;
    } else if (indicador.rotulo === "Média") {
      limAtencao = config.vazaoMediaAtencao;
      limCritico = config.vazaoMediaCritico;
      ativo = config.alertaVazaoMediaAtivo;
    } else if (indicador.rotulo === "Máxima") {
      ativo = config.alertaVazaoEntradaAtivo;
    }

    const status = !ativo || !indicador.classificaAlerta
      ? "Normal"
      : magnitude === null
        ? "Sem comparação"
        : indicador.somenteAcimaDaReferencia && variacao <= 0
          ? "Normal"
          : magnitude > limCritico + 1e-9
            ? "Crítico"
            : magnitude >= limAtencao - 1e-9
              ? "Atenção"
              : "Normal";
    return { ...indicador, variacao, direcao, status };
  });
  const indicadoresClassificaveis = indicadores.filter(
    (indicador) => indicador.classificaAlerta,
  );
  const status =
    ["Crítico", "Atenção", "Normal"].find((nivel) =>
      indicadoresClassificaveis.some((indicador) => indicador.status === nivel),
    ) ?? "Sem comparação";

  return { status, indicadores, referencia };
}

function calcularAutonomiaEProjecao(reservatorio, idReservatorio) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  const capacidade = config.capacidadeUtil !== "" && !isNaN(config.capacidadeUtil) ? Number(config.capacidadeUtil) : 5000;
  
  const niveisRaw = reservatorio?.leituras?.nivel;
  const nivelAtual = obterUltimaLeituraValida(niveisRaw);
  if (nivelAtual === null || nivelAtual === undefined) {
    return { statusPreditivo: "Normal", tendencia: "Sem Dados", iconeTendencia: "→", minutosAteCritico: null, minutosAteAtencao: null, minutosAteNormal: null, possuiMedicaoVazao: config.possuiMedicaoVazao, fallbackUsoApenasNivel: false };
  }

  // Tendência última hora
  const niveisValidos = (Array.isArray(niveisRaw) ? niveisRaw : [])
    .map(v => (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null))
    .filter(v => v !== null);

  let tendencia = "Estável";
  let iconeTendencia = "→";
  if (niveisValidos.length >= 2) {
    const ultimo = niveisValidos[niveisValidos.length - 1];
    const penultimo = niveisValidos[niveisValidos.length - 2];
    if (ultimo > penultimo) {
      tendencia = "Subindo";
      iconeTendencia = "↑";
    } else if (ultimo < penultimo) {
      tendencia = "Descendo";
      iconeTendencia = "↓";
    }
  }

  const vazoes = reservatorio?.leituras?.vazao;
  const vazaoAtual = obterUltimaLeituraValida(vazoes);
  const temDadosVazao = vazaoAtual !== null && vazaoAtual !== undefined && Array.isArray(vazoes) && vazoes.some(v => v !== null && v !== undefined && v !== "");

  let fallbackUsoApenasNivel = false;
  let mensagemFallback = null;

  let vazaoLiquidaM3h = 0;
  let vazaoLiquidaLs = 0;

  if (config.possuiMedicaoVazao && temDadosVazao) {
    const saida = vazaoAtual > 0 ? vazaoAtual : 0; 
    const entrada = 0;
    vazaoLiquidaLs = saida - entrada; // Positivo = esvaziando, Negativo = enchendo
    vazaoLiquidaM3h = vazaoLiquidaLs * 3.6;
  } else {
    if (config.possuiMedicaoVazao && !temDadosVazao) {
      fallbackUsoApenasNivel = true;
      mensagemFallback = "O cálculo passou a usar temporariamente somente o nível (dados de vazão ausentes).";
    }
    // Calculo baseado na variação percentual do nível ao longo do tempo em relação à capacidade útil
    if (niveisValidos.length >= 2) {
      const deltaNivelPorHora = niveisValidos[niveisValidos.length - 1] - niveisValidos[niveisValidos.length - 2];
      const taxaVolumeM3h = capacidade * (Math.abs(deltaNivelPorHora) / 100);
      if (deltaNivelPorHora > 0) {
        vazaoLiquidaM3h = -taxaVolumeM3h;
        vazaoLiquidaLs = -taxaVolumeM3h / 3.6;
      } else {
        vazaoLiquidaM3h = taxaVolumeM3h;
        vazaoLiquidaLs = taxaVolumeM3h / 3.6;
      }
    }
  }

  const volumeAtualM3 = capacidade * (nivelAtual / 100);

  let statusPreditivo = "Normal";
  let mensagemPreditiva = "";
  let minutosAteCritico = null;
  let minutosAteAtencao = null;
  let minutosAteNormal = null;

  if (vazaoLiquidaM3h < 0 && nivelAtual < 60) {
    const volNormal = capacidade * (60 - nivelAtual) / 100;
    const taxaEnchimentoM3h = Math.abs(vazaoLiquidaM3h);
    if (taxaEnchimentoM3h > 0) {
      const horasNormal = volNormal / taxaEnchimentoM3h;
      minutosAteNormal = Math.round(horasNormal * 60);
      mensagemPreditiva = `Nível subindo (${iconeTendencia}). Estimativa para normalizar (60%): ~${minutosAteNormal} min`;
    }
  } else if (vazaoLiquidaM3h > 0) {
    const volAtencao = capacidade * (config.nivelAlertaTempoAtencao / 100);
    const volCritico = capacidade * (config.nivelAlertaTempoCritico / 100);

    const horasAteAtencao = volumeAtualM3 > volAtencao ? (volumeAtualM3 - volAtencao) / vazaoLiquidaM3h : 0;
    const horasAteCritico = volumeAtualM3 > volCritico ? (volumeAtualM3 - volCritico) / vazaoLiquidaM3h : 0;

    minutosAteAtencao = Math.round(horasAteAtencao * 60);
    minutosAteCritico = Math.round(horasAteCritico * 60);

    const limiteCriticoMin = config.tempoCriticoMinutos;
    const limiteAtencaoMin = config.tempoAtencaoMinutos;

    if (minutosAteCritico <= limiteCriticoMin && nivelAtual >= config.nivelCritico) {
      statusPreditivo = "Crítico";
      mensagemPreditiva = `Risco de atingir nível crítico (<${config.nivelAlertaTempoCritico}%) em ~${minutosAteCritico} min (${iconeTendencia})`;
    } else if (minutosAteAtencao <= limiteAtencaoMin && nivelAtual >= config.nivelAtencao) {
      statusPreditivo = "Atenção";
      mensagemPreditiva = `Risco de atingir nível atenção (<${config.nivelAlertaTempoAtencao}%) em ~${minutosAteAtencao} min (${iconeTendencia})`;
    }
  }

  return {
    statusPreditivo,
    mensagemPreditiva,
    tendencia,
    iconeTendencia,
    minutosAteCritico,
    minutosAteAtencao,
    minutosAteNormal,
    vazaoLiquidaLs,
    vazaoLiquidaM3h,
    possuiMedicaoVazao: config.possuiMedicaoVazao,
    fallbackUsoApenasNivel,
    mensagemFallback
  };
}
