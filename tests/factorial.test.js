// Testes das ferramentas de chaves e formato do Factorial. Rodar: node tests/factorial.test.js
const assert = require('node:assert/strict');
const F = require('../apps-script/Factorial.gs');
let ok = 0;
function t(nome, fn) { fn(); ok++; console.log('ok -', nome); }

t('descreve so nomes e tipos, nunca valores', () => {
  const s = F.descreverCampos({ id: 1, first_name: 'Maria Secreta', birthday_on: null, teams: [1], ativo: true, endereco: { rua: 'x' } });
  assert.equal(s, 'id:numero, first_name:texto, birthday_on:vazio, teams:lista, ativo:sim/nao, endereco:objeto');
  assert.ok(!s.includes('Maria Secreta'));
});

t('acha a lista de itens em formatos comuns', () => {
  assert.deepEqual(F.acharItens([1, 2]), [1, 2]);
  assert.deepEqual(F.acharItens({ data: [3] }), [3]);
  assert.equal(F.acharItens({ meta: {} }), null);
});

t('endereco do Bitrix: aceita o formato certo e recusa o errado', () => {
  assert.equal(F.limparEnderecoBitrix(' https://tintomax.bitrix24.com.br/rest/1/abc123xyz '), 'https://tintomax.bitrix24.com.br/rest/1/abc123xyz/');
  assert.equal(F.limparEnderecoBitrix('https://tintomax.bitrix24.com.br/rest/1/abc123xyz/'), 'https://tintomax.bitrix24.com.br/rest/1/abc123xyz/');
  assert.equal(F.limparEnderecoBitrix('https://tintomax.bitrix24.com.br/page/rh/'), null);
  assert.equal(F.limparEnderecoBitrix(''), null);
});

t('chave do Factorial: tamanho e caracteres', () => {
  assert.equal(F.chaveFactorialValida('abcDEF0123456789abcdef01'), true);
  assert.equal(F.chaveFactorialValida('curta'), false);
  assert.equal(F.chaveFactorialValida('tem espaco no meio 123456789012'), false);
  // formatos que o Factorial pode usar: simbolos, aspas e quebra de linha ao colar
  assert.equal(F.chaveFactorialValida('sk_live.AbC-123+xyz/456=789'), true);
  assert.equal(F.chaveFactorialValida('  "abcdef0123456789abcdef0123456789"\n'), true);
  assert.equal(F.limparChave('  "abc123"\n'), 'abc123');
});

t('sonda: devolve so formato (status, meta, contagens e campos), nunca valores', () => {
  const corpo = { data: [{ id: 7, first_name: 'Maria Secreta', terminated_on: '2026-01-01' }, { id: 9, first_name: 'Joao', terminated_on: null }], meta: { has_next_page: true, end_cursor: 'abc' } };
  const l = F.linhasDaSonda('func', 200, corpo, true);
  const texto = JSON.stringify(l);
  assert.ok(!texto.includes('Maria Secreta') && !texto.includes('Joao'));
  assert.deepEqual(l.find((x) => x[1] === 'itens'), ['func', 'itens', 2]);
  assert.deepEqual(l.find((x) => x[1] === 'com terminated_on preenchido'), ['func', 'com terminated_on preenchido', 1]);
  assert.ok(l.some((x) => x[1] === 'meta' && x[2].includes('has_next_page')));
  assert.ok(l.some((x) => x[1] === 'campo' && x[2] === 'first_name:texto'));
  assert.deepEqual(F.linhasDaSonda('x', 404, { error: 'nao existe' }, true), [['x', 'resposta', 404], ['x', 'topo', 'error']]);
});

console.log('\n' + ok + ' testes passaram.');
