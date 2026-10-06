# Painel de RH automático (Tintomax)

Robô em Google Apps Script que lê Factorial e Bitrix e preenche o painel de indicadores de RH no Google Sheets.

## Regra de ouro
**Nenhum dado real de colaborador vai para este repositório** (nome, CPF, salário, planilhas exportadas).
O `.gitignore` bloqueia `.xlsx`, `.xls`, `.csv` e chaves. As chaves do Factorial e do Bitrix ficam só nas
*Propriedades do script* do Google (nunca no código, nunca no chat).

## O que já existe
- `apps-script/Regras.gs`: as regras do documento "Contexto - RH Analytics Tintomax" em código
  (setor por loja com Sul dividido, quadro, rotatividade, tempo de casa, faixa etária, promoções).
- `tests/regras.test.js`: testes com pessoas inventadas. Rodar: `node tests/regras.test.js`.

## O que ainda falta (ordem)
1. Leitura do Factorial (API com a chave) e do Bitrix (webhook) + histórico do Forms até ago/26.
2. Gravar o resultado de cada mês fechado (uma "foto" por mês) e montar as abas do painel com gráficos.
3. Texto de análise automático por indicador, no estilo das apresentações A>R.
4. Faturamento por custo (precisa de uma sessão separada: as abas mudam de formato a cada mês).
5. Frequência (ainda sem fonte definida) e "Criando Responsáveis".

## Pontos conhecidos que precisam de decisão
- O Factorial mostra efetivação como saída + entrada. Pela regra do documento isso é promoção, então
  entradas e saídas devem vir das solicitações (Forms/Bitrix), não só do Factorial.
- Os números das apresentações não são 100% reproduzíveis só com os arquivos de hoje (o Factorial muda
  retroativamente). Por isso cada mês fechado deve ser gravado e não recalculado.
- O campo "Tipo de contrato" do Factorial vem vazio. Inferido por cargo (estágio) e empresa (cooperativa).
