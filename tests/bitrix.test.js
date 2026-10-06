// Testes do leitor do Bitrix com itens INVENTADOS. Rodar: node tests/bitrix.test.js
const assert = require('node:assert/strict');
const B = require('../apps-script/Bitrix.gs');
const R = require('../apps-script/Regras.gs');

let ok = 0;
function t(nome, fn) { fn(); ok++; console.log('ok -', nome); }

// Campos como o crm.item.fields devolve (codigos inventados)
const campos = {
  ufCrm_1: { title: 'Qual demanda você deseja enviar ao Departamento?', items: [{ ID: '10', VALUE: 'Admissão' }, { ID: '11', VALUE: 'Rescisão' }, { ID: '12', VALUE: 'Promoção' }] },
  ufCrm_2: { title: 'Nome do Colaborador:' },
  ufCrm_3: { title: 'Esse colaborador é:', items: [{ ID: '1', VALUE: 'Efetivo' }, { ID: '2', VALUE: 'Estágio' }] },
  ufCrm_4: { title: 'Estabelecimento' },
  ufCrm_5: { title: 'Data da Recisão' },
  ufCrm_6: { title: 'Data de Inicio' },
  ufCrm_7: { title: 'Data de Início da Promoção' },
  ufCrm_8: { title: 'Qual será o novo Cargo?' },
  ufCrm_9: { title: 'Motivo da Solicitação' },
  ufCrm_10: { title: 'Data de Rescisão (Promoção)' }, // nao deve ser confundida com a data da rescisao
};
const mapa = B.mapearCamposBitrix(campos);

t('mapeia os campos pelo titulo (sem confundir datas parecidas)', () => {
  assert.equal(mapa.demanda, 'ufCrm_1');
  assert.equal(mapa.dataRescisao, 'ufCrm_5');
  assert.equal(mapa.dataInicio, 'ufCrm_6');
  assert.equal(mapa.dataPromocao, 'ufCrm_7');
  assert.equal(mapa.loja, 'ufCrm_4');
});

t('rescisao: data, loja, setor e vinculo (lista traduzida)', () => {
  const s = B.normalizarItemBitrix({ id: 1, ufCrm_1: '11', ufCrm_2: 'Pessoa Teste', ufCrm_3: '2', ufCrm_4: 'Tintomax Loja 24', ufCrm_5: '2026-08-06T03:00:00+03:00' }, campos, mapa);
  assert.equal(s.tipo, 'Rescisão');
  assert.equal(s.setor, 'Nordeste');
  assert.equal(s.vinculo, 'Estágio');
  assert.equal(s.data.toISOString().slice(0, 10), '2026-08-06');
  assert.equal(s.semData, false);
});

t('admissao que carrega a data da rescisao de quem saiu NAO vira saida', () => {
  const s = B.normalizarItemBitrix({ id: 2, ufCrm_1: '10', ufCrm_4: 'Tintomax Loja 03', ufCrm_5: '2026-09-29', ufCrm_6: '2026-10-01' }, campos, mapa);
  assert.equal(s.tipo, 'Admissão');
  assert.equal(s.data.toISOString().slice(0, 10), '2026-10-01');
  const r = R.movimentacaoDoMes([], [s], 2026, 9);
  assert.equal(r.total.saidas, 0);
});

t('promocao de estagio e efetivacao; cooperado vai para conferir', () => {
  const ef = B.normalizarItemBitrix({ id: 3, ufCrm_1: '12', ufCrm_3: '2', ufCrm_4: 'Loja 12', ufCrm_7: '2026-09-01', ufCrm_8: 'Apoio Comercial' }, campos, mapa);
  assert.equal(ef.subtipo, 'Efetivação');
  const co = B.normalizarItemBitrix({ id: 4, ufCrm_1: '12', ufCrm_3: '1', ufCrm_4: 'Loja 12', ufCrm_7: '2026-09-01', ufCrm_9: 'promovido para cooperativa' }, campos, mapa);
  assert.equal(co.subtipo, 'Passar a Cooperado');
  const r = R.movimentacaoDoMes([], [ef, co], 2026, 9);
  assert.equal(r.total.promocoes, 1);
  assert.equal(r.conferir.length, 1);
});

t('solicitacao sem data fica marcada para conferir', () => {
  const s = B.normalizarItemBitrix({ id: 5, ufCrm_1: '12', ufCrm_3: '1', ufCrm_4: 'Loja 04' }, campos, mapa);
  assert.equal(s.semData, true);
});

t('so entram etapas de sucesso', () => {
  const itens = [{ id: 1, stageId: 'DT1114_159:SUCCESS' }, { id: 2, stageId: 'DT1114_159:NEW' }];
  assert.equal(B.soBemSucedidas(itens, ['DT1114_159:SUCCESS']).length, 1);
});

t('datas em dd/mm/aaaa tambem funcionam', () => {
  assert.equal(B.paraDia('29/09/2026').toISOString().slice(0, 10), '2026-09-29');
  assert.equal(B.paraDia(''), null);
});

console.log('\n' + ok + ' testes passaram.');
