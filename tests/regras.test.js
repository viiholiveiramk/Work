// Testes com pessoas INVENTADAS. Rodar: node tests/regras.test.js
const assert = require('node:assert/strict');
const R = require('../apps-script/Regras.gs');

const d = (s) => new Date(s + 'T00:00:00Z');
let ok = 0;
function t(nome, fn) { fn(); ok++; console.log('ok -', nome); }

t('Sul e dividido em Joinville e Praias', () => {
  assert.equal(R.setorDaEquipe('Loja 07'), 'Sul Joinville');
  assert.equal(R.setorDaEquipe('Loja 12'), 'Sul Praias');
  assert.equal(R.setorDaEquipe('Loja 3'), 'Litoral');
  assert.equal(R.setorDaEquipe('Financeiro'), 'Base');
  assert.equal(R.setorDaEquipe(''), 'Base');
  assert.equal(R.setorDaEquipe('Loja 99'), 'Loja sem setor');
});

t('varias equipes: mesmo setor vale o setor; setores misturados viram Base; Loja 30 e Arauco', () => {
  assert.equal(R.setorDaEquipe('Loja 03, Loja 14, Zeladoria'), 'Litoral');
  assert.equal(R.setorDaEquipe('Loja 07, Zeladoria'), 'Sul Joinville');
  assert.equal(R.setorDaEquipe('Recursos Humanos, Loja 02, Loja 03, Loja 04, CDT'), 'Base');
  assert.equal(R.setorDaEquipe('Loja 30'), 'Base');
  assert.equal(R.setorDaEquipe('Arauco Construções'), 'Base');
  assert.equal(R.setorDaEquipe('Loja 03, Loja 99'), 'Base'); // mistura de setor conhecido com loja sem setor
});

t('tipo de contrato: estagio, cooperado, CLT', () => {
  assert.equal(R.tipoContrato({ cargo: 'ESTÁGIO DE EXPEDIÇÃO, Geral', empresa: 'TINTOMAX LOJA 07' }), 'Estágio');
  assert.equal(R.tipoContrato({ cargo: 'Estagio, Estagio', empresa: 'X' }), 'Estágio');
  assert.equal(R.tipoContrato({ cargo: 'CONSULTOR COMERCIAL, Nivel 1', empresa: 'NOVA COOPERATIVA DE TRABALHO' }), 'Cooperado');
  assert.equal(R.tipoContrato({ cargo: 'APOIO LOGÍSTICO, Auxiliar - 1', empresa: 'TINTOMAX LOJA 07' }), 'CLT');
});

const pessoas = [
  { sobrenome: 'A', inicio: d('2025-01-10'), nascimento: d('2000-06-01'), equipe: 'Loja 07' },
  { sobrenome: 'B', inicio: d('2026-07-15'), nascimento: d('2009-03-01'), equipe: 'Loja 03' },
  { sobrenome: 'C', inicio: d('2024-01-01'), desligamento: d('2026-07-20'), nascimento: d('1990-01-01'), equipe: 'Loja 03' },
  { sobrenome: 'Contabilidade DP', inicio: d('2020-01-01'), equipe: '' }, // ignorada
  { sobrenome: 'E', inicio: d('2026-08-05'), nascimento: d('2002-02-02'), equipe: 'Financeiro' }, // entra depois de julho
];

t('quadro no fim do mes: ignora DP, futuros e desligados', () => {
  assert.equal(R.quadroNoMes(pessoas, 2026, 7).length, 2); // A e B (C saiu em 20/07)
  assert.equal(R.quadroNoMes(pessoas, 2026, 8).length, 3); // A, B e E
});

t('tempo de casa: faixas e media', () => {
  const r = R.tempoDeCasa(pessoas, 2026, 7);
  assert.equal(r.faixas['<3m'], 1); // B tem ~0,5 mes
  assert.equal(r.faixas['>2a'], 0);
  assert.equal(r.faixas['1-2a'], 1); // A tem ~18 meses
  assert.ok(r.mediaMeses > 9 && r.mediaMeses < 10);
});

t('faixa etaria: menor de 18 e sem data de nascimento', () => {
  const r = R.faixaEtaria(pessoas.concat([{ sobrenome: 'F', inicio: d('2025-01-01'), equipe: 'Loja 03' }]), 2026, 7);
  assert.equal(r.faixas['<18'], 1); // B nasceu em 2009 (17 anos)
  assert.equal(r.semData, 1);
});

t('rotatividade: formula do documento', () => {
  assert.equal(R.rotatividade(10, 6, 177).toFixed(2), '4.52'); // jan/26 da planilha
  assert.equal(R.rotatividade(7, 16, 186).toFixed(2), '6.18'); // fev/26
  assert.equal(R.rotatividade(1, 1, 0), null);
});

t('efetivacao e mudanca de contrato nao sao entrada nem saida', () => {
  assert.equal(R.ehMovimentoReal({ tipo: 'Admissão' }), true);
  assert.equal(R.ehMovimentoReal({ tipo: 'Rescisão', subtipo: 'Substituição' }), true);
  assert.equal(R.ehMovimentoReal({ tipo: 'Rescisão', subtipo: 'Efetivação' }), false);
  assert.equal(R.ehMovimentoReal({ tipo: 'Rescisão', subtipo: 'Virou cooperado' }), false);
  assert.equal(R.ehMovimentoReal({ tipo: 'Promoção', subtipo: 'Alteração de nível' }), false);
});

t('cooperado so e promocao se o salario mudou', () => {
  assert.equal(R.contaComoPromocao({ tipo: 'Promoção', subtipo: 'Passar a Cooperado', mudouSalario: true }), true);
  assert.equal(R.contaComoPromocao({ tipo: 'Promoção', subtipo: 'Passar a Cooperado', mudouSalario: false }), false);
  assert.equal(R.contaComoPromocao({ tipo: 'Promoção', subtipo: 'Passar a Cooperado' }), null); // vai para "conferir"
  assert.equal(R.contaComoPromocao({ tipo: 'Promoção', subtipo: 'Efetivação' }), true);
  assert.equal(R.contaComoPromocao({ tipo: 'Rescisão' }), false);
});

t('movimentacao do mes por setor, entra e sai no mesmo mes conta nos dois', () => {
  const sol = [
    { tipo: 'Admissão', data: d('2026-07-15'), setor: 'Litoral' },
    { tipo: 'Rescisão', data: d('2026-07-20'), setor: 'Litoral' },
    { tipo: 'Rescisão', data: d('2026-07-25'), setor: 'Litoral' }, // o mesmo B que entrou e saiu
    { tipo: 'Promoção', subtipo: 'Efetivação', data: d('2026-07-02'), setor: 'Sul Joinville' },
    { tipo: 'Promoção', subtipo: 'Passar a Cooperado', data: d('2026-07-03'), setor: 'Sul Joinville' }, // salario desconhecido
    { tipo: 'Admissão', data: d('2026-08-01'), setor: 'Litoral' }, // outro mes
  ];
  const r = R.movimentacaoDoMes(pessoas, sol, 2026, 7);
  assert.equal(r.porSetor['Litoral'].entradas, 1);
  assert.equal(r.porSetor['Litoral'].saidas, 2);
  assert.equal(r.porSetor['Sul Joinville'].promocoes, 1);
  assert.equal(r.conferir.length, 1);
  assert.equal(r.total.saidas, 2);
});

console.log('\n' + ok + ' testes passaram.');
