// regrasNegocio.js - Centraliza cálculos e regras operacionais

const LIMITE_ATENCAO_NIVEL_PERCENTUAL = 60;
const LIMITE_CRITICO_NIVEL_PERCENTUAL = 50;
const LIMITE_ATENCAO_VAZAO_PERCENTUAL = 20;
const LIMITE_CRITICO_VAZAO_PERCENTUAL = 35;

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
    const status = !indicador.classificaAlerta
      ? "Informativo"
      : magnitude === null
        ? "Sem comparação"
        : indicador.somenteAcimaDaReferencia && variacao <= 0
          ? "Normal"
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
  const status =
    ["Crítico", "Atenção", "Normal"].find((nivel) =>
      indicadoresClassificaveis.some((indicador) => indicador.status === nivel),
    ) ?? "Sem comparação";

  return { status, indicadores, referencia };
}
