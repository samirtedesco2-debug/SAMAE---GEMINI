# Módulo: regrasNegocio.js

O arquivo `src/regrasNegocio.js` é o núcleo lógico do sistema CCO SAMAE.

## Principais Funções
1. **`obterConfiguracaoReservatorio(id)`**: Recupera parâmetros de configuração (capacidade útil, limites de atenção/crítico, desvios de vazão) com suporte a personalizações salvas no `localStorage` ou banco local.
2. **`calcularMediaMovel(valores, janela)`**: Suaviza dados temporais (janela ajustada para 1 na transição para dados reais).
3. **`calcularAutonomiaEProjecao(reservatorio, id)`**:
   - Calcula tendência (Subindo, Descendo, Estável).
   - Calcula balanço hidráulico (**Net Flow**): vazão de saída vs. vazão de entrada (`vazaoEntradaLs`).
   - Projeta minutos até níveis críticos ou de atenção.
4. **`avaliarStatusNivel` / `avaliarAlertaVazao`**: Classifica o estado operacional em Normal, Atenção, Crítico, Sem Dados ou Manutenção.
