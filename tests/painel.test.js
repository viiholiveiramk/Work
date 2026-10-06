// Testes das tabelas do painel e do texto de analise, com fotos INVENTADAS. Rodar: node tests/painel.test.js
const assert = require('node:assert/strict');
const P = require('../apps-script/Painel.gs');
const A = require('../apps-script/Analise.gs');

let ok = 0;
function t(nome, fn) { fn(); ok++; console.log('ok -', nome); }

function foto(ano, mes, extra) {
  const base = {
    ano, mes, quadro: 200,
    saidas: { total: 10, estagio: 8, efetivo: 2, menosDe5m: 7, menosDe6m: 10, semTempoDeCasa: 0, porLoja: { L14: 2, L3: 1 } },
    movimentacao: {
      total: { quadro: 200, saidas: 10, entradas: 12, promocoes: 20, rotatividade: 5.5 },
      porSetor: {
        'Norte': { quadro: 30, saidas: 0, entradas: 1, promocoes: 5, rotatividade: 1.7 },
        'Sul Joinville': { quadro: 25, saidas: 1, entradas: 1, promocoes: 3, rotatividade: 4 },
        'Sul Praias': { quadro: 20, saidas: 0, entradas: 6, promocoes: 0, rotatividade: 15 },
        'Litoral': { quadro: 25, saidas: 4, entradas: 2, promocoes: 0, rotatividade: 12 },
        'Base': { quadro: 45, saidas: 1, entradas: 2, promocoes: 2, rotatividade: 3.3 },
      },
    },
    tempoDeCasa: { quadro: 200, faixas: { '<3m': 20, '3-6m': 30, '6-12m': 30, '1-2a': 40, '>2a': 80 }, mediaMeses: 39.5 },
    faixaEtaria: { quadro: 200, faixas: { '<18': 40, '18-20': 55, '20-25': 40, '25-30': 20, '30-40': 25, '40+': 20 }, mediaAnos: 24.5, semData: 0 },
    conferir: [{ motivo: 'x' }],
  };
  return Object.assign(base, extra || {});
}

t('tabela mensal: uma linha por mes, com cabecalho', () => {
  const m = P.tabelaMensal([foto(2026, 7), foto(2026, 8)]);
  assert.equal(m.length, 3);
  assert.equal(m[1][0], 'jul/26');
  assert.equal(m[2][4], 5.5);
  assert.equal(m[0].length, m[1].length);
});

t('tabela de setores: Sul dividido e linha TOTAL', () => {
  const s = P.tabelaSetores(foto(2026, 8));
  const nomes = s.map((l) => l[0]);
  assert.ok(nomes.includes('Sul Joinville') && nomes.includes('Sul Praias'));
  assert.equal(nomes[nomes.length - 1], 'TOTAL');
});

t('ultimo mes fechado', () => {
  assert.deepEqual(P.ultimoMesFechado(new Date(2026, 9, 6)), { ano: 2026, mes: 9 });
  assert.deepEqual(P.ultimoMesFechado(new Date(2026, 0, 10)), { ano: 2025, mes: 12 });
  // so fecha o mes a partir do dia 5 do mes seguinte
  assert.deepEqual(P.ultimoMesFechado(new Date(2026, 9, 5)), { ano: 2026, mes: 9 });
  assert.deepEqual(P.ultimoMesFechado(new Date(2026, 9, 4)), { ano: 2026, mes: 8 });
  assert.deepEqual(P.ultimoMesFechado(new Date(2026, 0, 3)), { ano: 2025, mes: 11 });
  assert.deepEqual(P.mesSeguinte({ ano: 2026, mes: 12 }), { ano: 2027, mes: 1 });
});

t('mes em andamento aparece marcado como parcial', () => {
  const f = foto(2026, 10); f.parcial = true;
  assert.equal(P.tabelaMensal([foto(2026, 9), f])[2][0], 'out/26 (parcial)');
});

t('analise: cita promocoes, setores zerados, estagiarios, risco e conferir', () => {
  const ant = foto(2026, 7); ant.movimentacao.total.rotatividade = 4.0;
  const r = A.analisarMes(foto(2026, 8), ant, []);
  const tudo = [].concat(r.rotatividade, r.tempoDeCasa, r.idade, r.alertas).join(' | ');
  assert.match(tudo, /20 promoções\. Norte liderou com 5/);
  assert.match(tudo, /Rotatividade geral subiu de 4,0% para 5,5%/);
  assert.match(tudo, /Norte e Sul Praias zeraram/);
  assert.match(tudo, /Das 10 saídas, 8 foram de estagiários/);
  assert.match(tudo, /7 das 10 saídas tinham menos de 5 meses/);
  assert.match(tudo, /L14 com 2 saídas/);
  assert.match(tudo, /50 colaboradores com menos de 6 meses \(25,0% do quadro\) — zona de risco/);
  assert.match(tudo, /Muita gente nova entrando em Sul Praias/);
  assert.match(tudo, /1 itens para conferir/);
});

t('analise: meses seguidos de queda na rotatividade', () => {
  const h = [foto(2026, 5), foto(2026, 6)]; h[0].movimentacao.total.rotatividade = 5.5; h[1].movimentacao.total.rotatividade = 4.8;
  const ant = foto(2026, 7); ant.movimentacao.total.rotatividade = 3.7;
  const atual = foto(2026, 8); atual.movimentacao.total.rotatividade = 3.0;
  const r = A.analisarMes(atual, ant, h);
  assert.match(r.rotatividade.join(' '), /caiu de 3,7% para 3,0% \(3º mês seguido: 5,5% → 4,8% → 3,7% → 3,0%\)/);
});

console.log('\n' + ok + ' testes passaram.');
