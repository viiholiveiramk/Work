# Passagem de bastão (ler primeiro)

Projeto: painel de RH automático da Tintomax em Google Sheets (Apps Script). A usuária (RH, não técnica) quer
que tudo seja feito por você, em português simples, gastando poucos tokens, sem pedir passos técnicos a ela.
Nunca peça para ela colar chaves no chat: chaves entram só pelo menu da planilha (RH → Guardar ...).

## Onde está cada coisa
- Código: `apps-script/*.gs` (regras, Bitrix, Factorial, Solicitações, Análise, Painel). Testes: `node tests/<nome>.test.js`.
- Arquivo único para o Google: `dist/PainelRH.gs` (gerar com `node tools/build.js`).
- Planilha do painel (script já enviado com clasp): "Painel RH robô", id `1Q-N-3wjyI34fXLjaaq70BGq1rNs9RtzdWmD5YIPEawo`,
  scriptId `1pIObI83pkSmjg376WIgURldFnv5luIpgfR0BoEjn9CHAfSSsDHIZ7JXm`, conta tintomax991488419@gmail.com.
- Forms (histórico) id `15yjXwlvkEfoywBbtVdQA4-BTu-PrMj1yHWnFSMANivA`; planilha provisória do Factorial `1FBVF3TDpLy6bVlcONxvzpgdzBpjrTMQ61oZZMUYwct4`
  (só 9 colunas, sem CPF/salário); diagnóstico da API do Factorial `1J4L1TTkJ-PsLMQXp_voJQg91D9eWcUAItANaFBnejgU`.
- Enviar código ao Google: `clasp login` (local, abre o navegador) e `clasp push -f` na pasta do projeto do script. A API do Apps Script já está ligada na conta.

## Estado (06/10/2026)
- Funciona e foi visto no Google: abas Painel, Análise, Conferir, Fotos até ago/26 (números batem com as apresentações: Nordeste 8,0%, Litoral 18,4%).
- Menu RH: ★ Fazer tudo agora, Atualizar painel agora, Guardar endereço do Bitrix, Guardar chave do Factorial, Explorar Factorial.
- A chave do Factorial já foi guardada e a API respondeu 200 em employees, teams, memberships, contract_versions, legal_entities.
- Painel ainda mostra o formato antigo ("mar./26"): falta ela clicar em ★ Fazer tudo agora (precisa ser ela; o Google não deixa rodar de fora).
  Esse clique também liga o gatilho diário (7h) e grava a planilha de diagnóstico do Factorial.
- Sem o webhook do Bitrix o painel só fecha até ago/26 (constante ULTIMO_MES_SEM_BITRIX). Webhook: criar em
  https://tintomax.bitrix24.com.br/devops/edit/in-hook/ (admin, permissão CRM) e colar em RH → Guardar endereço do Bitrix.
  Processo 1114, funil 159 (só etapas de sucesso).

## Próximo trabalho
1. Ler a planilha de diagnóstico do Factorial e escrever o leitor automático (`carregarFactorial` modo `api`):
   employees (100 por página; descobrir paginação via `meta`; descobrir como trazer desligados), teams/memberships (equipes),
   contract_versions (starts_on/ends_on, job_title veio vazio: cargo deve estar no catálogo `job_catalog_*`), legal_entities (empresa/cooperativa).
   Mapear para o mesmo formato de `normalizarPessoaFactorial` (nome, sobrenome, inicio, desligamento, nascimento, cargo, equipe, empresa, motivo).
2. Bitrix pelo webhook; mês parcial diário.
3. Faturamento por custo (planilha mensal manual, abas mudam de formato), frequência (fonte indefinida), oxigenação, "Criando Responsáveis".

## Regras e decisões (do documento de contexto e das conversas)
- Rotatividade = ((saídas+entradas)/2) / quadro; quadro = média do início e do fim do mês (bateu com ago/26).
- Efetivação (estágio→efetivo) e mudança de contrato não são entrada/saída. Promoção de estágio = efetivação. Cooperado só é promoção se o salário mudou.
- Fonte de entradas/saídas/promoções: Forms (até 16/09/26) + Bitrix, sem duplicar; Factorial dá quadro, tempo de casa, idade, setor.
- Sul sempre dividido em Sul Joinville e Sul Praias. "Loja 30" nos pedidos = Arauco Construções = Base. Pessoa de várias equipes: mesmo setor vale; misturado = Base.
- Ignorar a Fernanda do DP (sobrenome "Contabilidade DP") e perfis de teste. Meses fechados a partir do dia 5 do mês seguinte e nunca recalculados.
- Total de saídas de ago/26: Forms 12 vs apresentação 11 (não explicado).

## Privacidade
Nunca versionar dados de colaboradores (o `.gitignore` bloqueia xlsx/csv). Chaves só nas Propriedades do script.
