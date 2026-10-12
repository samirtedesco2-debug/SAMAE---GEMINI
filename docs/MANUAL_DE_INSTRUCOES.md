# Manual do operador — Monitoramento dos reservatórios

## Escopo e situação do sistema

Este manual orienta a consulta da página principal e da aba **Visão
operacional**. As abas **Análises** e **Engenharia** estão em produção e ainda
não fazem parte deste procedimento.

> **Atenção:** a própria Visão operacional ainda está em desenvolvimento e
> não está concluída. Indicadores e alertas são um apoio à avaliação. Confira
> a data e a qualidade dos dados, valide os alertas com a equipe e siga os
> procedimentos internos antes de qualquer decisão. O painel não substitui
> verificação em campo nem os procedimentos de segurança do SAMAE.

As imagens deste manual são ilustrações da interface. Valores e nomes exibidos
nelas são exemplos, não representam medições reais.

## 1. Abrir e conferir a página

![Ilustração da página inicial, com os filtros de grupo/reservatório e data e as abas do painel.](manual-imagens/pagina-principal.svg)

1. Abra o painel no navegador e confirme que a página carregou sem mensagem
   de erro.
2. Confira **Última data disponível** no cabeçalho. Ela indica o registro mais
   recente carregado, mas não comprova, por si só, que a atualização da manhã
   foi concluída.
3. Use o seletor **Data** para escolher o dia que deseja consultar. O boletim
   e os cards acompanham essa seleção.
4. Antes de avaliar um alerta, confirme que a data exibida corresponde ao
   monitoramento que deseja verificar.

Se a data esperada não estiver disponível ou houver dúvida sobre a
atualização, não conclua a avaliação com dados antigos: solicite a verificação
à pessoa responsável pelo sistema.

## 2. Escolher o que consultar

No seletor **Grupo / Reservatório**:

- **Todos os grupos e reservatórios** mostra todos os cards.
- **Grupo: ...** filtra os reservatórios daquele grupo.
- O nome de um reservatório mostra somente aquele equipamento.

Para voltar à lista completa, selecione **Todos os grupos e reservatórios**.
Quando um grupo ou reservatório estiver filtrado, a tecla **Esc** também
retorna à lista completa.

O botão de sol/lua alterna entre os temas claro e escuro; isso muda somente a
aparência da tela.

## 3. Ler o boletim operacional

![Ilustração do boletim com os filtros de indicadores e base de comparação, os cartões de categorias e o aviso de dados ausentes.](manual-imagens/boletim-operacional.svg)

O **Boletim operacional da madrugada** resume os reservatórios para a data
selecionada:

- **Normais:** sem alerta pelos critérios atuais e com comparação utilizável.
- **Atenção:** desvio que requer verificação.
- **Críticos:** desvio mais expressivo; priorize a verificação conforme os
  procedimentos internos.
- **Incompletos:** faltam leituras esperadas, dados válidos suficientes ou
  comparação para classificar o indicador selecionado.

Clique em uma categoria para abrir a lista de reservatórios e os motivos da
classificação. Clique novamente na categoria ou em **Fechar boletim** para
fechar os detalhes. Dentro dos detalhes, **Abrir reservatório** leva ao card
da unidade.

O texto de qualidade informa quantas leituras esperadas estão ausentes e,
quando aplicável, quantos reservatórios não tiveram registro na data. A
ausência de vazão só é considerada falha quando aquela unidade costuma ter
esse tipo de leitura no histórico; unidades sem rotina histórica de vazão não
devem ser tratadas como incompletas somente por não apresentar vazão.

## 4. Ajustar indicadores e base de comparação

**Indicadores exibidos** controla quais dados entram na classificação:

- **Nível e vazão:** considera os dois indicadores.
- **Somente nível:** considera apenas nível.
- **Somente vazão:** considera apenas vazão.

Categorias, detalhes e contagem de leituras ausentes acompanham essa seleção.
Um indicador não selecionado não participa da classificação atual.

**Base de comparação** define as datas históricas usadas para comparar nível
e vazão:

- **Últimos 7 dias corridos:** datas anteriores dentro dos sete dias de
  calendário.
- **Últimos 30 dias corridos:** datas anteriores dentro dos trinta dias de
  calendário.
- **Mesmo dia da semana (últimas 4 semanas):** os mesmos dias da semana nas
  quatro semanas anteriores.
- **Histórico global:** todas as datas anteriores disponíveis.

A base inicial é **Mesmo dia da semana (últimas 4 semanas)**. O dia selecionado
não é usado como data de referência do boletim. Nos detalhes, confira a
quantidade e o período da base utilizados.

## 5. Entender os critérios dos alertas

### Nível

- A classificação usa a última leitura válida de nível.
- Abaixo de **60%**: Atenção.
- Abaixo de **50%**: Crítico.
- Leituras negativas ou acima de **110%** são inválidas para classificar o
  nível.

### Vazão

- A vazão mínima e máxima do dia são comparadas, respectivamente, às médias
  históricas das mínimas e das máximas.
- São necessários pelo menos dois dias históricos válidos por indicador. Sem
  base suficiente ou com referência igual a zero, não há comparação
  percentual confiável.
- **Vazão mínima:** variações para cima ou para baixo de 20% a 35% geram
  Atenção; acima de 35% em qualquer direção gera Crítico.
- **Vazão máxima:** somente aumentos geram alerta; de 20% a 35% geram Atenção
  e acima de 35% gera Crítico. Valor igual ou abaixo da referência não gera
  alerta de máxima.
- **Vazão média** é informativa e não participa da classificação.

O status geral considera o indicador selecionado de maior gravidade. Uma
classificação **Normal** significa apenas que os critérios configurados não
identificaram alerta e havia comparação utilizável; não garante o
funcionamento do equipamento.

## 6. Ler e abrir o card de um reservatório

![Ilustração de um card individual, com os indicadores de nível e vazão, o nível atual, a comparação e os gráficos.](manual-imagens/card-reservatorio.svg)

Na visão geral, os cards mostram um resumo diário. Clique em um card ou
selecione o reservatório no filtro para abrir a visualização individual.
Conforme os dados disponíveis, o card pode apresentar:

- nível mínimo, máximo e médio da madrugada;
- vazão mínima, máxima e média;
- horários associados aos extremos;
- rosca do nível atual e gráficos horários;
- informativo de comparação e histórico.

Na visão geral, os gráficos dos cards ficam escondidos para facilitar a
leitura; aparecem ao filtrar por grupo ou reservatório. Use **Fechar** no
informativo para recolher o painel de alerta.

No card aberto, **Abrir análise detalhada** mostra o gráfico ampliado e uma
matriz por horário:

- **Leituras** mostra as leituras da data selecionada.
- **Com médias** acrescenta ao gráfico as médias da madrugada.
- **Histórico (mín., média, máx.)** acrescenta estatísticas históricas por
  horário ao gráfico e à matriz.
- **Séries visíveis** permite ocultar ou exibir linhas individualmente. A
  legenda também alterna a visibilidade das séries.
- Ao passar o mouse sobre uma leitura de nível ou vazão, o balão mostra o
  horário e o dia/mês da data selecionada.
- **Voltar ao reservatório** retorna ao card.

As diferenças horárias na matriz são informativas e comparadas com a média
da madrugada selecionada; não devem ser confundidas com os critérios de
alerta do boletim. A opção de estatísticas históricas considera todas as datas
disponíveis, inclusive a data selecionada, e ignora leituras ausentes ou
inválidas.

## 7. Outras abas

**Análises** e **Engenharia** estão em produção. Seus recursos ainda estão
sendo desenvolvidos e não estão cobertos por este manual operacional. Para
avaliar a situação diária, utilize a página principal e a Visão operacional,
considerando a ressalva de que esta última ainda não está concluída.
