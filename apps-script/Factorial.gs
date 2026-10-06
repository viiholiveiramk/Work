/**
 * Chaves e leitura direta do Factorial.
 *  - guardarChaveFactorial / guardarEnderecoBitrix: janelinha para colar o segredo SEM passar pelo chat.
 *    O segredo vai para as Propriedades do script (nunca para a planilha).
 *  - explorarFactorial: anota na aba "Factorial (formato)" so os NOMES dos campos que a API devolve
 *    (nenhum dado de pessoa), para escrevermos o leitor certo em cima do formato real.
 */

const FACTORIAL_BASE = 'https://api.factorialhr.com/api/2025-10-01/';
const FACTORIAL_CAMINHOS = [
  'resources/employees/employees',
  'resources/teams/teams',
  'resources/teams/memberships',
  'resources/contracts/contract_versions',
  'resources/companies/legal_entities',
];

/** Descreve um JSON so pelos nomes e tipos dos campos (sem valores). Ex.: "first_name:texto, id:numero". */
function descreverCampos(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return '';
  return Object.keys(obj).map(function (k) {
    const v = obj[k];
    const tipo = v === null ? 'vazio' : Array.isArray(v) ? 'lista' : typeof v === 'object' ? 'objeto' : typeof v === 'number' ? 'numero' : typeof v === 'boolean' ? 'sim/nao' : 'texto';
    return k + ':' + tipo;
  }).join(', ');
}

/** Acha a lista de itens numa resposta (lista pura, ou dentro de data/items/results). */
function acharItens(corpo) {
  if (Array.isArray(corpo)) return corpo;
  if (corpo && typeof corpo === 'object') {
    const chaves = ['data', 'items', 'results', 'employees'];
    for (let i = 0; i < chaves.length; i++) if (Array.isArray(corpo[chaves[i]])) return corpo[chaves[i]];
  }
  return null;
}

/** Valida e normaliza o endereco do webhook do Bitrix. Devolve null se o formato estiver errado. */
function limparEnderecoBitrix(texto) {
  const t = String(texto || '').trim();
  return /^https:\/\/[^\/\s]+\/rest\/\d+\/[A-Za-z0-9]+\/?$/.test(t) ? t.replace(/\/?$/, '/') : null;
}

/** Tira espacos, quebras de linha e aspas que vem junto ao colar. */
function limparChave(texto) { return String(texto || '').replace(/^[\s"'`]+|[\s"'`]+$/g, ''); }

/** Aceita qualquer chave sem espacos com 16+ caracteres (nao sabemos o formato exato do Factorial). */
function chaveFactorialValida(texto) { return /^\S{16,}$/.test(limparChave(texto)); }

/**
 * Transforma a resposta de uma "sonda" em linhas [secao, chave, valor], so com formato (nunca valores de pessoas):
 * status, quantidade de itens, chaves do topo, conteudo de "meta" (paginacao), id do primeiro item,
 * quantos itens tem terminated_on preenchido e, se pedido, um campo por linha (nome:tipo).
 */
function linhasDaSonda(rotulo, status, corpo, comCampos) {
  const linhas = [[rotulo, 'resposta', status]];
  if (!corpo || typeof corpo !== 'object') return linhas;
  const itens = acharItens(corpo);
  if (!Array.isArray(corpo)) {
    linhas.push([rotulo, 'topo', Object.keys(corpo).join(', ')]);
    if (corpo.meta !== undefined) linhas.push([rotulo, 'meta', JSON.stringify(corpo.meta).slice(0, 400)]);
  }
  if (!itens) return linhas;
  linhas.push([rotulo, 'itens', itens.length]);
  if (itens.length) {
    linhas.push([rotulo, 'primeiro_id', itens[0].id === undefined ? '-' : itens[0].id]);
    linhas.push([rotulo, 'ultimo_id', itens[itens.length - 1].id === undefined ? '-' : itens[itens.length - 1].id]);
    const comSaida = itens.filter(function (i) { return i && i.terminated_on; }).length;
    if (itens[0].terminated_on !== undefined) linhas.push([rotulo, 'com terminated_on preenchido', comSaida]);
    if (comCampos) descreverCampos(itens[0]).split(', ').forEach(function (c) { linhas.push([rotulo, 'campo', c]); });
  }
  return linhas;
}

if (typeof module !== 'undefined') module.exports = { linhasDaSonda, descreverCampos, acharItens, limparEnderecoBitrix, limparChave, chaveFactorialValida };

// ---------------- Daqui para baixo: so roda no Google ----------------

function _guardar(nomePropriedade, titulo, instrucao, validar, limpar) {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(titulo, instrucao, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const texto = r.getResponseText();
  if (!validar(texto)) { ui.alert('Não reconheci o formato (' + String(texto || '').trim().length + ' caracteres). Nada foi guardado. Confira se copiou a chave inteira, sem espaços no meio, e tente de novo.'); return; }
  PropertiesService.getScriptProperties().setProperty(nomePropriedade, limpar ? limpar(texto) : String(texto).trim());
  ui.alert('Guardado com segurança (só o robô enxerga). Pode apagar o texto copiado.');
}

function guardarChaveFactorial() {
  _guardar('FACTORIAL_API_KEY', 'Chave do Factorial', 'Cole aqui a chave de API que você gerou no Factorial:', chaveFactorialValida, limparChave);
}

function guardarEnderecoBitrix() {
  _guardar('BITRIX_WEBHOOK', 'Endereço do Bitrix', 'Cole aqui o endereço do webhook de entrada do Bitrix (começa com https:// e tem /rest/ no meio):',
    function (t) { return limparEnderecoBitrix(t) !== null; }, limparEnderecoBitrix);
}

function _factorialGet(caminho) {
  const chave = PropertiesService.getScriptProperties().getProperty('FACTORIAL_API_KEY');
  if (!chave) throw new Error('Falta guardar a chave do Factorial (menu RH).');
  return UrlFetchApp.fetch(FACTORIAL_BASE + caminho, { method: 'get', headers: { 'x-api-key': chave, accept: 'application/json' }, muteHttpExceptions: true });
}

// Planilha pequena so para o diagnostico (so nomes de campos e contagens, nenhum dado de pessoa).
const DIAGNOSTICO_ID = '1J4L1TTkJ-PsLMQXp_voJQg91D9eWcUAItANaFBnejgU';
const FACTORIAL_SONDAS = [
  ['funcionarios (padrao)', 'resources/employees/employees', true],
  ['funcionarios page=2', 'resources/employees/employees?page=2', false],
  ['funcionarios limit=500', 'resources/employees/employees?limit=500', false],
  ['funcionarios only_active=false', 'resources/employees/employees?only_active=false', false],
  ['funcionarios include_terminated=true', 'resources/employees/employees?include_terminated=true', false],
  ['funcionarios terminated=true', 'resources/employees/employees?terminated=true', false],
  ['contratos (versoes)', 'resources/contracts/contract_versions', true],
  ['equipes (vinculos)', 'resources/teams/memberships', false],
  ['empresas (legal_entities)', 'resources/companies/legal_entities', false],
  ['catalogo de cargos: levels', 'resources/job_catalog/levels', true],
  ['catalogo de cargos: job_roles', 'resources/job_catalog/job_roles', true],
  ['catalogo de cargos: roles', 'resources/job_catalog/roles', true],
  ['catalogo de cargos: tree_nodes', 'resources/job_catalog/tree_nodes', true],
  ['catalogo de cargos: catalog_levels', 'resources/job_catalog/catalog_levels', true],
];

/** Anota na planilha de diagnostico o FORMATO do que a API devolve (so nomes, tipos e contagens). */
function explorarFactorial() {
  const ss = SpreadsheetApp.openById(DIAGNOSTICO_ID);
  const aba = ss.getSheets()[0];
  aba.clear();
  let linhas = [['Sonda', 'O que', 'Valor']];
  FACTORIAL_SONDAS.forEach(function (s) {
    try {
      const resp = _factorialGet(s[1]), texto = resp.getContentText();
      let corpo = null; try { corpo = JSON.parse(texto); } catch (e) { /* nao e JSON */ }
      const l = linhasDaSonda(s[0], resp.getResponseCode(), corpo, s[2]);
      if (!corpo && resp.getResponseCode() !== 200) l.push([s[0], 'texto', texto.slice(0, 150)]);
      linhas = linhas.concat(l);
    } catch (e) { linhas.push([s[0], 'ERRO', String(e.message).slice(0, 200)]); }
  });
  aba.getRange(1, 1, linhas.length, 3).setValues(linhas.map(function (l) { return l.map(function (c) { return String(c).slice(0, 500); }); }));
  aba.getRange(1, 1, 1, 3).setFontWeight('bold');
  SpreadsheetApp.getActive().toast('Pronto: ' + (linhas.length - 1) + ' linhas na planilha "Diagnóstico Factorial".', 'RH', 8);
}
