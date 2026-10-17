// regrasNegocio.js - Centraliza cálculos e regras operacionais

const LIMITE_ATENCAO_NIVEL_PERCENTUAL = 60;
const LIMITE_CRITICO_NIVEL_PERCENTUAL = 50;
const LIMITE_ATENCAO_VAZAO_PERCENTUAL = 20;
const LIMITE_CRITICO_VAZAO_PERCENTUAL = 35;

function obterConfiguracaoReservatorio(idReservatorio) {
  try {
    const salvos = JSON.parse(localStorage.getItem("samai_reservatorios_config") || "{}");
    const config = salvos[idReservatorio];
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
      capacidadeUtil: config?.capacidadeUtil ?? "",
      emManutencao: Boolean(config?.emManutencao)
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
      emManutencao: false
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
