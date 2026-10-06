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

- `apps-script/Bitrix.gs`: leitura do Bitrix (processo 1114, funil 159), só "Bem sucedido".
- `apps-script/Solicitacoes.gs`: junta Forms + Bitrix sem duplicar, liga ao Factorial por nome parecido,
  monta a "foto" do mês (quadro, rotatividade por setor, tempo de casa, idade, lista "conferir").
- Testes: `node tests/regras.test.js && node tests/bitrix.test.js && node tests/solicitacoes.test.js`.
- Validação com dados reais de ago/26 (fora do repositório): Nordeste 8,0% (igual), Litoral 18,4% (apres. 18,2%),
  Sul 1 saída/1 entrada (igual), Sudeste 0 saídas (igual).

- `apps-script/Analise.gs`: texto de análise automático (regras fixas, sem IA, não gasta nada ao rodar).
- `apps-script/Painel.gs`: abas Painel, Análise, Conferir e Fotos + menu RH. Parte do Google ainda não testada no Google.
- `dist/PainelRH.gs`: tudo num arquivo só (gerado por `node tools/build.js`). Instalação: `docs/INSTALACAO.md`.

## O que ainda falta (ordem)
1. Leitura do Factorial (API com a chave) e do Bitrix (webhook) + histórico do Forms até ago/26.
2. Gravar o resultado de cada mês fechado (uma "foto" por mês) e montar as abas do painel com gráficos.
3. Texto de análise automático por indicador, no estilo das apresentações A>R.
4. Faturamento por custo (precisa de uma sessão separada: as abas mudam de formato a cada mês).
5. Frequência (ainda sem fonte definida) e "Criando Responsáveis".

## Pontos conhecidos que precisam de decisão
- "Loja 30" nos pedidos é a Arauco Construções (equipe de Expansão no Factorial): tratada como Base. Não existe loja 30 comercial ainda.
- Pessoa com várias equipes no Factorial (ex.: RH que atende todas as lojas): se as lojas são do mesmo setor vale esse setor; se misturam setores, conta como Base.
- O Factorial mostra efetivação como saída + entrada. Pela regra do documento isso é promoção, então
  entradas e saídas devem vir das solicitações (Forms/Bitrix), não só do Factorial.
- Os números das apresentações não são 100% reproduzíveis só com os arquivos de hoje (o Factorial muda
  retroativamente). Por isso cada mês fechado deve ser gravado e não recalculado.
- Correção: o Forms recebeu solicitações até 16/09/26 (16 envios em set/26), então a troca para o Bitrix
  não foi em 1º/09. Ler SEMPRE as duas fontes e remover duplicadas (mesmo nome + tipo + data).
  Set/26 no Bitrix (só "Bem sucedido"): 7 saídas, 2 entradas, 5 promoções, 7 sem data (6 promoções e 1 admissão).
  Forms em set/26: 10 admissões, 4 rescisões. Factorial: 16 contratos iniciados (9 estágio).
- Bitrix: processo 1114, funil 159 (endereço .../page/rh/solicitacoes_rh/type/1114/list/category/159/).
  Loja = campo "Estabelecimento". Efetivação = promoção de quem é estágio.
- Decisão (ago/26): entradas e saídas vêm das solicitações (Forms + Bitrix). O Factorial
  confirma e dá quadro, tempo de casa e idade. Rescisão sem pessoa correspondente no Factorial vai para a
  lista "conferir" (a ligação é por nome; o Forms costuma escrever o nome mais curto, então usar nome parecido).
- Validação com a apresentação de agosto/26: Sul 1 saída e 1 entrada (igual), Sudeste 0 saídas (igual),
  Nordeste 8,0% (igual usando a média do quadro do início e do fim do mês) e Litoral 18,4% (apresentado 18,2%).
  Total de saídas: Forms tem 12, a apresentação tem 11 (diferença não explicada; usar o Forms).
- O campo "Tipo de contrato" do Factorial vem vazio. Inferido por cargo (estágio) e empresa (cooperativa).
