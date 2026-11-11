# Contexto completo: Plano de Crescimento 2027 (Tintomax)

Documento para você (outro chat, com acesso ao dashboard) construir tudo dentro do painel RH existente (v72, Apps Script ligado à planilha "Painel RH robô"). Tudo abaixo já foi decidido com a usuária. Os pontos ainda em aberto estão na seção 12. Nada foi criado nem alterado em nenhum arquivo até agora.

## 1. Objetivo
Substituir o planejamento atual (planilha manual, difícil de editar) por algo que os gestores editem no próprio painel:
- Plano de crescimento **mês a mês** (quem entra, quem passa de nível, quem é efetivado, quem migra para cooperativa), com custo calculado automaticamente contra o valor autorizado do setor.
- Nomes e fotos das pessoas vindos do **Bitrix**, sem digitação.
- **Metas x realidade** de Acuracidade, Inadimplência, Faturamento, Bitrix e Raio X dos orçamentos, por loja, setor e rede.
- **Checklist mensal** (feito / não feito, com data).
- Hoje os gestores só **olham** o painel. Falta um botão "Editar plano" que abra uma página de edição, restrita ao setor/loja de cada um.

## 2. Arquivos de referência (Drive)
| Arquivo | Para quê | ID |
|---|---|---|
| Painel RH robô (Google Sheets) | Base de dados do painel: Quadro atual, Custos, Movimentos (Fonte Bitrix), Lojas, Vagas, Plano (JSON), Faturamento setor, Fotos etc. | `1Q-N-3wjyI34fXLjaaq70BGq1rNs9RtzdWmD5YIPEawo` |
| Cargos e Salarios - Gestores (.xlsx) | Tabela de salários por cargo/nível/vínculo, com colunas por vigência | `1x2W-mANXA1CDgnE7e8g-3CVHSbPzaftY` |
| Despesas - Admissão e Rescisão (.xlsb) | Pacotes de custo de entrada (conteúdo transcrito na seção 5) | `15gcwMnolhT5ZaT6jYqbFpX6BOIEq6gB4` |
| Plano estratégico Setor Comercial (.xlsx) | Exemplo de como o plano é feito hoje (referência, não será mantido) | `1EWjJUSkU31UJ4DB1IDKpABiHRgnORhDi` |

Observações:
- Os dois arquivos de cargos e despesas são **Excel** (.xlsx/.xlsb). O Apps Script não lê esses formatos direto. **Converter para Planilhas Google** e manter só a versão Google como oficial.
- O painel publicado (v72) está em `https://tinyurl.com/rhtintomax`. Eu não consegui abri-lo daqui. Você tem acesso, então parta do código dele.
- **Segurança:** a planilha Painel RH robô tem uma aba "Senhas (apagar)" com usuário e senha em texto puro. Remover a aba (e o histórico de versões) e migrar o login para a conta Google.

## 3. Como o plano é feito hoje (exemplo)
- Uma aba por setor (Sul-Joinville, Sul-Praias, Norte, Nordeste, Litoral, Sudeste), lojas lado a lado, janelas de 3, 6, 9 e 12 meses.
- Cada linha é um movimento com um valor (ex.: "1 apoio comercial nível 1 (nome)": R$ 9.608).
- Totais por loja e por setor, comparados com o "valor autorizado" do setor. Meta mensal de avanço de 8,33%.
- Problemas: nomes dentro do texto, mesma pessoa repetida em várias janelas, `#DIV/0!`, ano embutido.

## 4. Fonte dos salários e reajustes
Tabela "Cargos e Salarios - Gestores":
- **CLT:** colunas por vigência `5/1/2025`, `5/1/2026`, `5/1/2027`... A coluna **5/1/2026 é a vigente** (maio/2026 a abril/2027). Dissídio: 6,5% (2025), 5,5% (2026). A coluna 5/1/2027 está igual à de 2026 por enquanto.
- **Cooperativa:** colunas `Nov-25`, `Nov-26`, `Nov-27`... (IPCA 4,68% em 2025).
- **Estágio:** valores fixos, sem reajuste.
- **Regra de vigência:** o app usa, em cada mês, o valor da última coluna cuja data já começou. O dissídio é **a diferença entre as colunas**, não um percentual separado. Se a coluna de 2027 estiver vazia ou igual à de 2026, mantém o valor de 2026 e avisa "sem reajuste previsto".
- A tabela deve estar **ligada** ao app: ao atualizar a tabela, todo o plano se recalcula.

**Mapa de cargos (plano → tabela)**
- Apoio logístico/comercial/administrativo nível 1 a 6 → bloco "Crescimento interno": nível 1 = Auxiliar 1, 2 = Auxiliar 2, 3 = Assistente 1, 4 = Assistente 2, 5 = Analista 1, 6 = Analista 2.
- Estágio base / nível 1 / nível 2 → "Estágio nível base / 1 / 2" (também há ADM e "com conhecimento técnico").
- Consultor júnior / pleno / sênior → blocos da cooperativa (Comercial).
- Motorista e Expansão → mesmos nomes nas duas tabelas.
- Os cargos disponíveis também vêm da **planilha de fechamento** que o painel já lê.

## 5. Pacotes de custo de entrada (planilha de despesas)
Cada perfil é um pacote: **mês 1** (inclui itens únicos) e **mensal** (recorrente).

**Estágio de caixa:** curso técnico 899,90; VT 350,00; bolsa 1.100,00; exame admissional 16,15; camisa polo 140,80; suporte 0,48; crachá 5,20; corda 5,00; integração 7,15; Wellhub 55,00. **Mês 1 = 2.579,68. Mensal = 1.505,00** (bolsa + VT + Wellhub).

**Estágio de expedição:** curso técnico 899,90; VT 350,00; bolsa 1.100,00; exame 16,15; camisa polo 140,80; calça 99,80; bermuda 66,00; sapatão 60,40; suporte 0,48; crachá 5,20; presilha 0,50; integração 7,15; Wellhub 55,00. **Mês 1 = 2.801,38. Mensal = 1.505,00.**

**Efetivo CLT** (salário S da tabela, ex.: Auxiliar nível 1 = 2.285): encargos sobre S: INSS patronal 20%, RAT 1%, Terceiros/Sistemas 5,8%, FGTS 8%, multa 40% do FGTS 3,2%, aviso prévio 9,166%, férias + 1/3 11,11%, 13º 8,33%. Fixos: exame admissional (~0,76% de S), VT 221,60, Wellhub 55,00, kit (camisa 140,80; suporte 0,48; crachá 5,20; corda 5,00 ou calça/bermuda/sapatão/presilha no masculino; integração 7,15).

**Efetivo TMX (motorista ou expansão):** mesma estrutura, S = 2.318 (Motorista nível 1), com vale alimentação 624,20 e plano de saúde 350,00 no lugar do VT.

**Estágio para efetivo** (a efetivação, após 3 meses de experiência): diferença de salário (S − bolsa atual) + os mesmos encargos sobre S + fixos.

**INSS do colaborador: REMOVER do custo.** A planilha original o somava (+205,65 no bloco de efetivação) ou subtraía (−182,88 nos blocos de efetivo). O INSS do empregado (tabela progressiva: 7,5% até R$ 1.518 e 9% sobre o excedente até a faixa seguinte, que dá exatamente 182,88 para R$ 2.285) é descontado do salário bruto e **não é custo da empresa**. Guardar faixas e percentuais numa tabela com data de vigência, pois mudam todo ano.

## 6. Regras de cálculo (motor)
O custo é calculado **por mês**, e cada efeito vale **do mês informado até dezembro** (ou até a saída da pessoa).

**custo do mês = custo da posição planejada − custo da posição original, ambos com a tabela vigente naquele mês.** Assim o dissídio sobe os dois lados e não conta como crescimento.

| Movimento | Custo |
|---|---|
| Entrada de estágio | Pacote: mês 1 completo; meses seguintes = mensal |
| Passagem de nível do estágio | **+R$ 150 por mês**, do mês informado até a efetivação (cumulativo se houver mais de uma passagem). Meses antes da passagem não contam |
| Efetivação | Pacote CLT (salário + encargos + fixos) menos o custo atual da pessoa. O salário atual (bolsa do nível em que ela estava), o VT e o Wellhub vêm da **planilha de custos do painel**. Vale todos os meses até dezembro |
| Mudança de nível / promoção CLT | **Só diferença de salário** (tabela), sem encargos |
| Migração CLT → cooperativa | Salário de cooperativa do nível novo − salário CLT do nível atual, sem encargos, a partir do mês informado |
| Desligamento | **Sem custo**. Cancela os movimentos futuros da pessoa. Os meses já passados ficam como realizado |
| Substituição | Mesmo cargo e nível: custo zero. Nível maior: soma só a diferença. Menor: diferença negativa |
| Vaga nova | Custo cheio do pacote |

- **Não mostrar economia de cooperativa em lugar nenhum.** A usuária decidiu manter só a diferença de salário.
- Encargos: deixar uma tabela de percentual por vínculo (estágio, cooperativa, CLT) para um futuro ajuste, mas os percentuais do pacote CLT acima já valem.
- Mês fechado (já passado) não pode mais ser alterado pelo gestor. Registrar quem alterou, quando e o motivo.

## 7. Casos de teste (conferem com o plano manual)
- Estágio de caixa, janela de 3 meses: 2.579,68 + 2 × 1.505 = **5.589,68** (plano manual: 5.589). Com 2 passagens de nível (2 × 150 = 300): **5.889** (plano manual: 5.889).
- Estágio de expedição, 3 meses: 2.801,38 + 2 × 1.505 = **5.811,38**; com 300: **6.111** (plano manual: 5.811 e 6.111).
- Efetivação (plano manual R$ 9.608): reproduz-se com 3 × 3.202,86, onde 3.202,86 é o mês-1 do bloco "Estágio para efetivo" com **S = 2.280** (a coluna de 2025) e o INSS 9% somado. Com a tabela vigente (S = 2.285) e a regra nova (sem INSS do colaborador), o mês 1 cai para ~3.006,00 e os seguintes ~2.983,55, antes de descontar VT/Wellhub já existentes. **Mostrar à usuária o resultado e validar contra o caso de 9.608.**
- Diferença Auxiliar nível 2 → Assistente nível 1 com a coluna 2026: 2.900 − 2.600 = **300** por mês. O plano manual usa 266 × 3 = 798, valor de uma tabela antiga.
- Migração Auxiliar 1: coop 2.874 − CLT 2.285 = **589 por mês**.

## 8. Bitrix e notificações
- Integração por **webhook de entrada (REST)** do Bitrix. A chave fica em *Propriedades do script*, nunca no código nem no chat. A usuária cadastra a chave.
- Dados que vêm do Bitrix: nome, **foto**, cargo, departamento (loja/setor). A foto do Bitrix pode exigir login, então guardar uma cópia no Drive e servir por lá.
- Rotina diária: compara Bitrix + "Quadro atual" + "Movimentos" com o plano.
- **Entrada de alguém:** criar **tarefa no Bitrix** (`tasks.task.add`) para o gestor do setor/loja, com prazo e link para a pessoa na página de edição. O gestor define o próximo passo (mês das passagens de nível, efetivação prevista). A tarefa conclui sozinha quando ele salva. Se o prazo vencer, o aviso sobe para o Admin.
- **Saída:** automática, a partir do registro da rescisão. Cancela o futuro, mantém o realizado, abre pendência de reposição ("substituição / vaga nova / fora do plano" com justificativa).
- Mesmo mecanismo cria uma tarefa mensal para o gestor preencher a realidade dos indicadores.

## 9. Acesso e permissões
- Login pela **conta Google** (sem senha própria). Aba "Acessos": e-mail, perfil, setor, loja.
- Perfis: Admin (rede), Gestor de setor (edita o próprio setor, vê a rede), Gerente de loja (edita a própria loja), Leitura.
- Gestores **não veem a tabela de salários inteira**, só os valores do plano do seu setor.

## 10. Metas x realidade
- Indicadores: **Acuracidade, Inadimplência, Faturamento, Bitrix, Raio X dos orçamentos**.
- Níveis: **loja, setor, setor da rede e rede toda**.
- No começo do ano o gestor preenche as **metas mensais**. Todo mês preenche a **realidade** de Inadimplência, Bitrix e Raio X (manual). Faturamento e Acuracidade: puxar dos dados existentes (aba "Faturamento setor", "Vendas do dia") se der; confirmar com a usuária.
- Mostrar meta, realidade, diferença, % atingido e semáforo (verde, amarelo, vermelho). **Inadimplência é o contrário: menor é melhor.**

## 11. Checklist mensal
Por setor e mês: ação, feito (sim/não), **data em que foi feito**, quem marcou, observação, com histórico das alterações. Ainda não está definido se as ações são iguais para todos os setores (perguntar).

## 12. Pendências
1. Confirmação do DP/contador sobre os percentuais (RAT e Terceiros dependem do enquadramento) e se férias e 13º devem ter encargos sobre a provisão (a planilha não inclui).
2. Percentual/valores do dissídio de maio/2027 e do IPCA da cooperativa: a usuária preenche a coluna da tabela quando souber.
3. De onde vem a realidade de Faturamento e Acuracidade.
4. As ações do checklist são fixas ou por setor?
5. E-mails dos gestores e o setor/loja de cada um.
6. Endereço do portal Bitrix e criação do webhook (feito pela usuária).

## 13. Como trabalhar
- Não alterar planilhas existentes sem confirmar. Criar abas novas (Acessos, Metas, Realidade, Checklist, Movimentos do plano, Parâmetros).
- Entregar primeiro o **motor de cálculo** com os casos de teste da seção 7 e mostrar à usuária. Depois a tela de edição, as notificações e as metas.
- Nunca colocar chaves, senhas ou webhooks no código ou nesta conversa.
