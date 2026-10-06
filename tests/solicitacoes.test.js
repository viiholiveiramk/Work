// Testes com dados INVENTADOS. Rodar: node tests/solicitacoes.test.js
const assert = require('node:assert/strict');
const S = require('../apps-script/Solicitacoes.gs');

let ok = 0;
function t(nome, fn) { fn(); ok++; console.log('ok -', nome); }
const d = (s) => new Date(s + 'T00:00:00Z');

t('nomes: Forms escreve mais curto que o Factorial', () => {
  assert.equal(S.nomesParecem('Nicolas Mattos', 'Nicolas Mattos Oliveira'), true);
  assert.equal(S.nomesParecem('gabriel martins', 'Gabriel Rodrigues Martins'), true);
  assert.equal(S.nomesParecem('wellington silva', 'Wellington Pereira da Silva'), true);
  assert.equal(S.nomesParecem('Maria Clara Amaral', 'Maria Souza Lima'), false);
  assert.equal(S.nomesParecem('João Silva', 'Pedro Silva'), false);
  // erro de digitacao de 1 letra no sobrenome vale; primeiro nome parecido NAO vale
  assert.equal(S.nomesParecem('Layra Thayna silva', 'Layra Thaynan Silva Dias'), true);
  assert.equal(S.nomesParecem('Samuel Rosário de Olveira', 'Samuel Rosario de Oliveira'), true);
  assert.equal(S.nomesParecem('Lucas Silva', 'Lucia Silva'), false);
});

t('procura campo por trecho do titulo, sem acento', () => {
  const linha = { 'Qual demanda você deseja enviar ao Departamento?': 'Rescisão', 'Loja do colaborador promovido': 'Loja 3' };
  assert.equal(S.campo(linha, ['qual demanda']), 'Rescisão');
  assert.equal(S.campo(linha, ['Loja do colaborador'], true), null); // exato nao pega "promovido"
  assert.equal(S.campo(linha, ['Loja do colaborador promov']), 'Loja 3');
});

t('Forms: rescisao e promocao viram solicitacao padrao', () => {
  const r = S.normalizarLinhaForms({ 'Qual demanda você deseja enviar': 'Rescisão', 'Nome do colaborador': 'Fulano Teste', 'Loja do colaborador': 'Loja 24', 'Esse colaborador é:': 'Estágio', 'Data da rescisão': new Date(2026, 7, 6) });
  assert.equal(r.tipo, 'Rescisão');
  assert.equal(r.setor, 'Nordeste');
  assert.equal(r.data.toISOString().slice(0, 10), '2026-08-06');
  const p = S.normalizarLinhaForms({ 'Qual demanda você deseja enviar': 'Promoção (Alteração de nivel ou efetivação)', 'Nome COMPLETO do Colaborador': 'Beltrano Teste', 'Loja do colaborador promovido': 'Loja 12', 'Sua soicitação é de:': 'Passar a Cooperado', 'Data de Início da Promoção': new Date(2026, 7, 10) });
  assert.equal(p.tipo, 'Promoção');
  assert.equal(p.subtipo, 'Passar a Cooperado');
  assert.equal(p.setor, 'Sul Praias');
});

t('mesma solicitacao no Forms e no Bitrix conta uma vez', () => {
  const forms = [{ fonte: 'Forms', tipo: 'Rescisão', nome: 'Nicolas Mattos', data: d('2026-09-10') }];
  const bitrix = [{ fonte: 'Bitrix', tipo: 'Rescisão', nome: 'Nicolas Mattos Oliveira', data: d('2026-09-10') },
                  { fonte: 'Bitrix', tipo: 'Rescisão', nome: 'Outra Pessoa', data: d('2026-09-12') }];
  const r = S.juntarSolicitacoes([forms, bitrix]);
  assert.equal(r.solicitacoes.length, 2);
  assert.equal(r.repetidas.length, 1);
});

t('tipos diferentes da mesma pessoa NAO sao duplicada', () => {
  const r = S.juntarSolicitacoes([[{ tipo: 'Promoção', nome: 'Ana Souza', data: d('2026-09-01') }, { tipo: 'Rescisão', nome: 'Ana Souza', data: d('2026-09-01') }]]);
  assert.equal(r.solicitacoes.length, 2);
});

t('nome repetido no Factorial: escolhe pela data', () => {
  const antigo = { nome: 'Gabriel', sobrenome: 'Rodrigues Martins', inicio: d('2022-04-22'), desligamento: d('2025-02-14') };
  const novo = { nome: 'Gabriel', sobrenome: 'Rodrigues Martins', inicio: d('2026-06-01'), desligamento: d('2026-08-20') };
  const s = { tipo: 'Rescisão', nome: 'gabriel martins', data: d('2026-08-20') };
  assert.equal(S.acharPessoa(s, [antigo, novo]), novo);
});

t('foto do mes: quadro medio, movimentacao e conferir', () => {
  const pessoas = [
    { nome: 'Ana', sobrenome: 'Teste', inicio: d('2025-01-10'), nascimento: d('2000-01-01'), equipe: 'Loja 24', cargo: 'Consultor', empresa: 'X' },
    { nome: 'Bia', sobrenome: 'Teste', inicio: d('2026-07-01'), desligamento: d('2026-08-06'), nascimento: d('2005-01-01'), equipe: 'Loja 24', cargo: 'Estágio', empresa: 'X' },
    { nome: 'Fernanda', sobrenome: 'Contabilidade DP', inicio: d('2020-01-01') },
    { nome: 'Perfil', sobrenome: 'Velho', inicio: d('2020-01-01'), desligamento: d('2026-01-05'), motivo: 'Perfil sem utilização' },
  ];
  const sols = [
    { tipo: 'Rescisão', nome: 'Bia Teste', data: d('2026-08-06'), setor: 'Nordeste', loja: 'Loja 24' },
    { tipo: 'Rescisão', nome: 'Pessoa Fantasma', data: d('2026-08-07'), setor: 'Nordeste', loja: 'Loja 24' },
    { fonte: 'Bitrix', tipo: 'Admissão', nome: 'Sem Data', semData: true, setor: 'Litoral', loja: 'Loja 3' },
    { fonte: 'Forms', tipo: 'Admissão', nome: 'Historico Antigo', semData: true, setor: 'Litoral', loja: 'Loja 3' }, // nao deve avisar
  ];
  const f = S.fotoDoMes(pessoas, sols, 2026, 8);
  const ne = f.movimentacao.porSetor['Nordeste'];
  assert.equal(ne.quadroInicio, 2); // Ana e Bia em 31/07
  assert.equal(ne.quadroFim, 1); // so Ana em 31/08
  assert.equal(ne.quadro, 1.5); // media
  assert.equal(ne.saidas, 2);
  assert.equal(ne.rotatividade.toFixed(1), '66.7'); // ((2+0)/2)/1.5
  assert.equal(f.quadro, 1);
  const motivos = f.conferir.map((c) => c.motivo);
  assert.ok(motivos.includes('Não achei esta pessoa no Factorial'));
  assert.ok(motivos.includes('Solicitação sem data'));
  assert.equal(motivos.length, 2);
});

t('pedido sem loja nao cai na Base em silencio; loja nova vai para conferir', () => {
  const r = S.normalizarLinhaForms({ 'Qual demanda você deseja enviar': 'Rescisão', 'Nome do colaborador': 'Sem Loja', 'Data da rescisão': new Date(2026, 7, 6) });
  assert.equal(r.setor, 'Sem loja informada');
  const nova = S.normalizarLinhaForms({ 'Qual demanda você deseja enviar': 'Rescisão', 'Nome do colaborador': 'Loja Nova', 'Loja do colaborador': 'Loja 99', 'Data da rescisão': new Date(2026, 7, 6) });
  assert.equal(nova.setor, 'Loja sem setor');
  const f = S.fotoDoMes([], [r, nova], 2026, 8);
  const motivos = f.conferir.map((c) => c.motivo);
  assert.ok(motivos.includes('Pedido sem loja informada'));
  assert.ok(motivos.includes('Loja sem setor cadastrado'));
});

console.log('\n' + ok + ' testes passaram.');
