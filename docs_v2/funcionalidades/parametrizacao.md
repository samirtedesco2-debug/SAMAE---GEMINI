# Parametrização e Regras de Alarme

O módulo de parametrização permite configurar parâmetros operacionais granulares para cada reservatório do sistema.

## Parâmetros Disponíveis por Reservatório

1. **Capacidade Útil (`capacidadeUtil`)**: Volume útil do reservatório em metros cúbicos ($m^3$). Utilizado para cálculos volumétricos e de autonomia.
2. **Medição de Vazão (`possuiMedicaoVazao`)**: Ativa ou desativa o uso de dados de vazão. Se desativado, o sistema aplica fallback utilizando apenas a variação do nível ao longo do tempo.
3. **Limites de Alerta de Nível**:
   - Nível de Atenção (%)
   - Nível Crítico (%)
4. **Limites de Alerta de Vazão e Desvios (%)**:
   - Desvio de Entrada (Atenção / Crítico)
   - Desvio de Saída (Atenção / Crítico)
   - Desvio Média (Atenção / Crítico)
5. **Horizontes de Tempo (Minutos)**:
   - Limiar de tempo para alerta de atenção e crítico.
6. **Modo Manutenção (`emManutencao`)**: Coloca o reservatório em estado de manutenção, suspendendo alertas operacionais.
