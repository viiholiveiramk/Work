// Painel de RH Tintomax - arquivo gerado por tools/build.js (nao editar aqui)

// ===== Regras.gs =====
/**
 * Regras de calculo dos indicadores de RH (Tintomax).
 * Fonte das regras: documento "Contexto - RH Analytics Tintomax".
 *
 * Este arquivo so tem contas e regras (funcoes puras, sem acessar Sheets,
 * Factorial ou Bitrix). Assim da para testar fora do Google com `node tests/regras.test.js`.
 */

const CONFIG = {
  // Loja -> setor comercial. O Sul e sempre dividido em Joinville e Praias.
  LOJAS_POR_SETOR: {
    'Norte': [2, 9, 16, 21],
    'Sul Joinville': [5, 7, 8, 17],
    'Sul Praias': [12, 19, 22, 26],
    'Sudeste': [6, 10, 11, 13, 23],
    'Nordeste': [4, 18, 20, 24],
    'Litoral': [3, 14, 15, 25],
  },
  // "Loja 30" nos pedidos e a Arauco Construcoes (equipe de Expansao no Factorial), nao uma loja comercial.
  LOJAS_ESPECIAIS: { 30: 'Base' },
  // Quem aparece nos dados mas nao conta em nenhum calculo (ex.: Fernanda do DP).
  IGNORAR_SOBRENOME: [/contabilidade dp/i],
  // Motivos de desligamento no Factorial que NAO sao saida de pessoa de verdade.
  MOTIVOS_NAO_SAIDA: ['perfil sem utilização', 'liberar sistema', 'liberar espaço colaboradores', 'teste'],
  // Bitrix: processo "Solicitações RH" (entityTypeId 1114), funil Admissão/Promoção/Rescisão (categoryId 159).
  BITRIX: { entityTypeId: 1114, categoryId: 159 },
  // Quadro usado na divisao da rotatividade: 'media' (inicio e fim do mes, bateu com a apresentacao de ago/26) ou 'fim'.
  QUADRO_REFERENCIA: 'media',
  DIAS_POR_MES: 30.44,
  FAIXAS_TEMPO_CASA: ['<3m', '3-6m', '6-12m', '1-2a', '>2a'],
  FAIXAS_IDADE: ['<18', '18-20', '20-25', '25-30', '30-40', '40+'],
};

/**
 * Setor de uma equipe do Factorial ou de uma loja de um pedido.
 *  - "Loja 07" -> 'Sul Joinville'. Equipe sem loja (Financeiro, CDT, ...) ou vazio -> 'Base'.
 *  - A mesma pessoa pode ter varias equipes ("Loja 03, Loja 14, Zeladoria"): se todas as lojas sao do
 *    mesmo setor, vale esse setor; se misturam setores (ex.: RH que atende todas as lojas), e Base.
 */
function setorDaEquipe(equipe) {
  const texto = String(equipe || '').toLowerCase();
  const numeros = [];
  const re = /loja\s*0*(\d+)/g;
  let m;
  while ((m = re.exec(texto)) !== null) numeros.push(Number(m[1]));
  if (!numeros.length) return 'Base';
  const setores = [];
  let semSetor = false;
  numeros.forEach(function (n) {
    let achou = CONFIG.LOJAS_ESPECIAIS[n];
    for (const setor in CONFIG.LOJAS_POR_SETOR) {
      if (!achou && CONFIG.LOJAS_POR_SETOR[setor].indexOf(n) !== -1) achou = setor;
    }
    if (!achou) semSetor = true;
    else if (setores.indexOf(achou) === -1) setores.push(achou);
  });
  if (!setores.length) return semSetor ? 'Loja sem setor' : 'Base'; // loja nova: vai para "conferir"
  return setores.length === 1 && !semSetor ? setores[0] : 'Base';
}

function ehComercial(setor) {
  return setor !== 'Base' && setor !== 'Loja sem setor';
}

/** Motivos de desligamento que nao sao saida de pessoa (funcao, porque no Google `const` nao fica no objeto global). */
function motivosNaoSaida() { return CONFIG.MOTIVOS_NAO_SAIDA; }

function pessoaIgnorada(p) {
  return CONFIG.IGNORAR_SOBRENOME.some(function (re) { return re.test(String(p.sobrenome || '')); });
}

/**
 * Tipo de contrato. O Factorial nao preenche "Tipo de contrato", entao inferimos:
 *  - Estagio: cargo contem "estagi"
 *  - Cooperado: empresa (pessoa juridica) contem "cooperativa"
 *  - CLT: o resto
 * (A regra oficial do documento usa % de encargo; isso fica para a etapa do faturamento por custo.)
 */
function tipoContrato(p) {
  if (/est[aá]gi/i.test(String(p.cargo || ''))) return 'Estágio';
  if (/cooperativa/i.test(String(p.empresa || ''))) return 'Cooperado';
  return 'CLT';
}

function ehEstagio(p) { return tipoContrato(p) === 'Estágio'; }

/** Pessoas ativas no ultimo dia do mes (mes de 1 a 12). */
function quadroNoMes(pessoas, ano, mes) {
  const fim = new Date(Date.UTC(ano, mes, 0));
  return pessoas.filter(function (p) {
    if (pessoaIgnorada(p)) return false;
    if (!p.inicio || p.inicio > fim) return false;
    return !p.desligamento || p.desligamento > fim;
  });
}

function mesesDeCasa(inicio, referencia) {
  return (referencia - inicio) / 86400000 / CONFIG.DIAS_POR_MES;
}

function faixaTempoCasa(meses) {
  if (meses < 3) return '<3m';
  if (meses < 6) return '3-6m';
  if (meses < 12) return '6-12m';
  if (meses < 24) return '1-2a';
  return '>2a';
}

function idadeEmAnos(nascimento, referencia) {
  return (referencia - nascimento) / 86400000 / 365.25;
}

function faixaIdade(anos) {
  if (anos < 18) return '<18';
  if (anos < 20) return '18-20';
  if (anos < 25) return '20-25';
  if (anos < 30) return '25-30';
  if (anos < 40) return '30-40';
  return '40+';
}

function _media(valores) {
  return valores.length ? valores.reduce(function (a, b) { return a + b; }, 0) / valores.length : null;
}

/** Tempo de casa (faixas + media em meses) do quadro no fim do mes. */
function tempoDeCasa(pessoas, ano, mes) {
  const fim = new Date(Date.UTC(ano, mes, 0));
  const quadro = quadroNoMes(pessoas, ano, mes);
  const faixas = {};
  CONFIG.FAIXAS_TEMPO_CASA.forEach(function (f) { faixas[f] = 0; });
  const meses = quadro.map(function (p) { return mesesDeCasa(p.inicio, fim); });
  meses.forEach(function (m) { faixas[faixaTempoCasa(m)]++; });
  return { quadro: quadro.length, faixas: faixas, mediaMeses: _media(meses) };
}

/** Idade (faixas + media em anos). Quem esta sem data de nascimento vai em semData. */
function faixaEtaria(pessoas, ano, mes) {
  const fim = new Date(Date.UTC(ano, mes, 0));
  const quadro = quadroNoMes(pessoas, ano, mes);
  const faixas = {};
  CONFIG.FAIXAS_IDADE.forEach(function (f) { faixas[f] = 0; });
  let semData = 0;
  const idades = [];
  quadro.forEach(function (p) {
    if (!p.nascimento) { semData++; return; }
    const a = idadeEmAnos(p.nascimento, fim);
    idades.push(a);
    faixas[faixaIdade(a)]++;
  });
  return { quadro: quadro.length, faixas: faixas, mediaAnos: _media(idades), semData: semData };
}

/** Formula do documento: ((saidas + entradas) / 2) / quadro * 100. */
function rotatividade(saidas, entradas, quadro) {
  if (!quadro) return null;
  return ((saidas + entradas) / 2) / quadro * 100;
}

/**
 * Solicitacao normalizada (vem do Forms ate ago/26 e do Bitrix a partir de set/26):
 * { tipo: 'Admissão'|'Rescisão'|'Promoção', subtipo: 'Efetivação'|'Alteração de nível'|'Passar a Cooperado'|...,
 *   data: Date, setor, vinculo: 'Estágio'|'Efetivo', mudouSalario: true|false|undefined }
 *
 * Regras do documento:
 *  - Efetivacao (estagio -> efetivo) e mudanca de contrato (CLT -> cooperado) sao promocao:
 *    NAO entram como entrada nem saida.
 *  - Quem entra e sai no mesmo mes conta nos dois.
 */
function ehMovimentoReal(s) {
  const sub = String(s.subtipo || '').toLowerCase();
  if (s.tipo === 'Promoção') return false;
  if (sub.indexOf('efetiva') !== -1 || sub.indexOf('cooperado') !== -1) return false;
  return true;
}

function noMes(data, ano, mes) {
  return data && data.getUTCFullYear() === ano && data.getUTCMonth() + 1 === mes;
}

/**
 * Promocao conta quando: efetivacao, alteracao de nivel, mudanca de funcao,
 * ou cooperado COM mudanca de salario. Cooperado com o mesmo salario so mudou de contrato.
 * Retorna true / false / null (null = nao da para saber, vai para a lista "conferir").
 */
function contaComoPromocao(s) {
  if (s.tipo !== 'Promoção') return false;
  const sub = String(s.subtipo || '').toLowerCase();
  if (sub.indexOf('cooperado') !== -1) {
    return s.mudouSalario === undefined ? null : !!s.mudouSalario;
  }
  return true;
}

/**
 * Subtipo de uma promocao a partir do que o Bitrix/Forms informa:
 *  - promocao de quem e Estagio = Efetivacao
 *  - texto citando cooperativa/cooperado = Passar a Cooperado (so conta se o salario mudou)
 *  - o resto = Alteracao de nivel/funcao
 */
function subtipoPromocao(vinculo, textoLivre) {
  if (/est[aá]gi/i.test(String(vinculo || ''))) return 'Efetivação';
  if (/cooperativ|cooperad/i.test(String(textoLivre || ''))) return 'Passar a Cooperado';
  return 'Alteração de nível';
}

/** Primeira palavra-chave do texto da demanda: 'Admissão', 'Rescisão', 'Promoção' ou null. */
function tipoDaDemanda(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (t.indexOf('adm') === 0) return 'Admissão';
  if (t.indexOf('resc') === 0 || t.indexOf('reci') === 0) return 'Rescisão';
  if (t.indexOf('prom') === 0) return 'Promoção';
  return null;
}

/**
 * Indicadores de movimentacao de um mes, por setor e total.
 * pessoas: lista do Factorial (para o quadro). solicitacoes: Forms/Bitrix ja filtradas (so "Bem sucedido").
 */
function movimentacaoDoMes(pessoas, solicitacoes, ano, mes) {
  const porSetor = {};
  const conferir = [];
  function linha(setor) {
    if (!porSetor[setor]) porSetor[setor] = { quadro: 0, saidas: 0, entradas: 0, promocoes: 0, rotatividade: null };
    return porSetor[setor];
  }
  const anterior = mes === 1 ? [ano - 1, 12] : [ano, mes - 1];
  const usaMedia = CONFIG.QUADRO_REFERENCIA === 'media';
  quadroNoMes(pessoas, ano, mes).forEach(function (p) {
    const l = linha(setorDaEquipe(p.equipe));
    l.quadroFim = (l.quadroFim || 0) + 1;
  });
  quadroNoMes(pessoas, anterior[0], anterior[1]).forEach(function (p) {
    const l = linha(setorDaEquipe(p.equipe));
    l.quadroInicio = (l.quadroInicio || 0) + 1;
  });
  Object.keys(porSetor).forEach(function (setor) {
    const l = porSetor[setor];
    l.quadroFim = l.quadroFim || 0;
    l.quadroInicio = l.quadroInicio || 0;
    l.quadro = usaMedia ? (l.quadroInicio + l.quadroFim) / 2 : l.quadroFim;
  });

  solicitacoes.forEach(function (s) {
    if (!noMes(s.data, ano, mes)) return;
    const l = linha(s.setor);
    if (s.tipo === 'Promoção') {
      const conta = contaComoPromocao(s);
      if (conta === null) conferir.push({ motivo: 'Cooperado: nao sei se o salario mudou', solicitacao: s });
      else if (conta) l.promocoes++;
      return;
    }
    if (!ehMovimentoReal(s)) return;
    if (s.tipo === 'Rescisão') l.saidas++;
    if (s.tipo === 'Admissão') l.entradas++;
  });

  const total = { quadro: 0, quadroFim: 0, saidas: 0, entradas: 0, promocoes: 0, rotatividade: null };
  Object.keys(porSetor).forEach(function (setor) {
    const l = porSetor[setor];
    l.rotatividade = rotatividade(l.saidas, l.entradas, l.quadro);
    ['quadro', 'quadroFim', 'saidas', 'entradas', 'promocoes'].forEach(function (k) { total[k] += l[k]; });
  });
  total.rotatividade = rotatividade(total.saidas, total.entradas, total.quadro);
  return { porSetor: porSetor, total: total, conferir: conferir };
}

if (typeof module !== 'undefined') {
  module.exports = {
    CONFIG, motivosNaoSaida, setorDaEquipe, ehComercial, pessoaIgnorada, tipoContrato, ehEstagio, quadroNoMes,
    mesesDeCasa, faixaTempoCasa, idadeEmAnos, faixaIdade, tempoDeCasa, faixaEtaria,
    rotatividade, ehMovimentoReal, contaComoPromocao, movimentacaoDoMes,
    subtipoPromocao, tipoDaDemanda,
  };
}

// ===== Bitrix.gs =====
/**
 * Leitura das solicitacoes de RH direto do Bitrix (processo 1114, funil 159).
 *
 * Parte 1 (testada com `node`): transformar um item do Bitrix numa "solicitacao" padrao.
 * Parte 2 (so roda no Google; sera testada na primeira execucao com o webhook real):
 *   chamar a API do Bitrix. O endereco do webhook fica em Propriedades do script
 *   (chave BITRIX_WEBHOOK), nunca no codigo.
 *
 * Os campos personalizados do Bitrix tem codigos (ufCrm_...). Em vez de decorar os codigos,
 * descobrimos pelo TITULO do campo (o mesmo nome das colunas do Excel exportado).
 */

const _R = (typeof require !== 'undefined') ? require('./Regras.gs') : this;

function _semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Titulos (sem acento, minusculos) que identificam cada informacao no processo 1114. */
const BITRIX_TITULOS = {
  demanda: ['qual demanda'],
  nome: ['nome do colaborador'],
  vinculo: ['esse colaborador e'],
  loja: ['estabelecimento'],
  dataRescisao: ['data da recisao', 'data da rescisao'],
  dataInicio: ['data de inicio'],
  dataPromocao: ['data de inicio da promocao'],
  cargoNovo: ['qual sera o novo cargo'],
  motivo: ['motivo da solicitacao'],
};

/**
 * campos = resposta de crm.item.fields (objeto {codigo: {title, items?...}}).
 * Devolve {demanda: 'ufCrm_..', ...}. Para "data de inicio" exige titulo exato,
 * para nao confundir com "data de inicio da promocao".
 */
function mapearCamposBitrix(campos) {
  const mapa = {};
  Object.keys(campos).forEach(function (codigo) {
    const c = campos[codigo] || {};
    const titulo = _semAcento(c.formLabel || c.title || c.listLabel || '');
    Object.keys(BITRIX_TITULOS).forEach(function (chave) {
      if (mapa[chave]) return;
      const bate = BITRIX_TITULOS[chave].some(function (alvo) {
        return chave === 'dataInicio' || chave === 'dataRescisao' ? titulo === alvo : titulo.indexOf(alvo) === 0;
      });
      if (bate) mapa[chave] = codigo;
    });
  });
  return mapa;
}

/** Campos de lista vem como numero; traduz para o texto usando campos[codigo].items. */
function _valor(item, campos, mapa, chave) {
  const codigo = mapa[chave];
  if (!codigo) return null;
  let v = item[codigo];
  if (Array.isArray(v)) v = v[0];
  if (v === undefined || v === null || v === '') return null;
  const itens = (campos[codigo] || {}).items;
  if (Array.isArray(itens)) {
    const achado = itens.filter(function (i) { return String(i.ID) === String(v); })[0];
    if (achado) return achado.VALUE;
  }
  return v;
}

/** '2026-09-29T03:00:00+03:00' ou '29/09/2026' -> Date (UTC, so o dia). */
function paraDia(v) {
  if (!v) return null;
  const s = String(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

/**
 * Item do Bitrix -> solicitacao padrao usada em movimentacaoDoMes().
 * Devolve null se nao for admissao/rescisao/promocao. `semData: true` vai para a lista "conferir".
 */
function normalizarItemBitrix(item, campos, mapa) {
  const tipo = _R.tipoDaDemanda(_valor(item, campos, mapa, 'demanda'));
  if (!tipo) return null;
  const loja = _valor(item, campos, mapa, 'loja');
  const vinculo = _valor(item, campos, mapa, 'vinculo');
  const cargo = _valor(item, campos, mapa, 'cargoNovo');
  const motivo = _valor(item, campos, mapa, 'motivo');
  let data = null;
  if (tipo === 'Rescisão') data = paraDia(_valor(item, campos, mapa, 'dataRescisao'));
  if (tipo === 'Admissão') data = paraDia(_valor(item, campos, mapa, 'dataInicio'));
  if (tipo === 'Promoção') data = paraDia(_valor(item, campos, mapa, 'dataPromocao'));
  return {
    id: item.id,
    fonte: 'Bitrix',
    tipo: tipo,
    subtipo: tipo === 'Promoção' ? _R.subtipoPromocao(vinculo, [cargo, motivo].join(' ')) : undefined,
    data: data,
    semData: !data,
    loja: loja,
    setor: loja ? _R.setorDaEquipe(loja) : 'Sem loja informada',
    vinculo: vinculo,
    nome: _valor(item, campos, mapa, 'nome'),
    mudouSalario: undefined, // o Bitrix nao informa; cooperado vai para "conferir"
  };
}

/** Mantem so as solicitacoes finalizadas com sucesso (etapa de semantica "sucesso" no Bitrix). */
function soBemSucedidas(itens, idsEtapasSucesso) {
  return itens.filter(function (i) { return idsEtapasSucesso.indexOf(i.stageId) !== -1; });
}

// ---------------- Parte 2: chamadas ao Bitrix (somente no Google Apps Script) ----------------

function _bitrixChamar(metodo, parametros) {
  const base = PropertiesService.getScriptProperties().getProperty('BITRIX_WEBHOOK');
  if (!base) throw new Error('Falta a propriedade BITRIX_WEBHOOK nas Propriedades do script.');
  const resp = UrlFetchApp.fetch(base.replace(/\/?$/, '/') + metodo + '.json', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(parametros || {}), muteHttpExceptions: true,
  });
  const corpo = JSON.parse(resp.getContentText());
  if (corpo.error) throw new Error('Bitrix: ' + corpo.error + ' - ' + corpo.error_description);
  return corpo;
}

/** Baixa todas as solicitacoes do funil 159 (o Bitrix devolve 50 por vez). */
function baixarSolicitacoesBitrix() {
  const tipo = CONFIG.BITRIX.entityTypeId, funil = CONFIG.BITRIX.categoryId;
  const campos = _bitrixChamar('crm.item.fields', { entityTypeId: tipo }).result.fields;
  const mapa = mapearCamposBitrix(campos);
  const etapas = _bitrixChamar('crm.status.list', {
    filter: { ENTITY_ID: 'DYNAMIC_' + tipo + '_STAGE_' + funil },
  }).result;
  const sucesso = etapas.filter(function (e) { return e.SEMANTICS === 'S'; }).map(function (e) { return e.STATUS_ID; });

  let itens = [], inicio = 0;
  while (inicio !== undefined && inicio !== null) {
    const r = _bitrixChamar('crm.item.list', {
      entityTypeId: tipo, filter: { categoryId: funil }, select: ['*', 'uf*'], start: inicio,
    });
    itens = itens.concat(r.result.items);
    inicio = r.next;
  }
  const bem = soBemSucedidas(itens, sucesso);
  const solicitacoes = bem.map(function (i) { return normalizarItemBitrix(i, campos, mapa); })
    .filter(function (s) { return s; });
  return { solicitacoes: solicitacoes, total: itens.length, bemSucedidas: bem.length, camposSemMapa: Object.keys(BITRIX_TITULOS).filter(function (k) { return !mapa[k]; }) };
}

if (typeof module !== 'undefined') {
  module.exports = { mapearCamposBitrix, normalizarItemBitrix, soBemSucedidas, paraDia };
}

// ===== Factorial.gs =====
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

// ===== Solicitacoes.gs =====
/**
 * Junta as fontes de dados:
 *  - Factorial (pessoas: quadro, tempo de casa, idade, setor)
 *  - Forms (historico) e Bitrix (solicitacoes de admissao, rescisao e promocao)
 * e gera a "foto" de um mes. Funcoes puras, testadas com `node`.
 *
 * Linhas de planilha chegam como objetos {cabecalho: valor}. Os cabecalhos sao procurados
 * por trecho do titulo (sem acento, sem diferenca de maiusculas), porque o Forms corta nomes longos.
 */

const _RG = (typeof require !== 'undefined') ? require('./Regras.gs') : this;
const _BX = (typeof require !== 'undefined') ? require('./Bitrix.gs') : this;

function _norm(s) {
  return String(s === undefined || s === null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Valor da primeira coluna cujo titulo comeca com algum dos prefixos (ou e igual, se exato). */
function campo(linha, prefixos, exato) {
  const chaves = Object.keys(linha);
  for (let p = 0; p < prefixos.length; p++) {
    const alvo = _norm(prefixos[p]);
    for (let i = 0; i < chaves.length; i++) {
      const k = _norm(chaves[i]);
      if (exato ? k === alvo : k.indexOf(alvo) === 0) {
        const v = linha[chaves[i]];
        if (v !== '' && v !== null && v !== undefined) return v;
      }
    }
  }
  return null;
}

/** Date do Sheets/Excel, texto ISO ou dd/mm/aaaa -> Date UTC (so o dia). */
function diaDe(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v)) return null;
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  return _BX.paraDia(v);
}

// ---------------- Factorial ----------------

function normalizarPessoaFactorial(l) {
  return {
    nome: String(campo(l, ['Nome'], true) || ''),
    sobrenome: String(campo(l, ['Sobrenome'], true) || ''),
    inicio: diaDe(campo(l, ['Data de início do contrato'])),
    desligamento: diaDe(campo(l, ['Data do desligamento'])),
    nascimento: diaDe(campo(l, ['Aniversário'])),
    cargo: campo(l, ['Emprego'], true),
    equipe: campo(l, ['Equipes'], true),
    empresa: campo(l, ['Pessoa jurídica'], true),
    motivo: campo(l, ['Motivo da rescisão']),
  };
}

/** Tira perfis que nao sao pessoas (DP, teste, "perfil sem utilizacao") e sem data de inicio. */
function pessoasValidas(pessoas) {
  return pessoas.filter(function (p) {
    if (!p.inicio || _RG.pessoaIgnorada(p)) return false;
    const m = _norm(p.motivo);
    return _RG.motivosNaoSaida().indexOf(m) === -1;
  });
}

// ---------------- Forms (historico ate 16/09/26) ----------------

/** Uma linha da aba Historico do Forms -> solicitacao padrao (ou null). */
function normalizarLinhaForms(l) {
  const tipo = _RG.tipoDaDemanda(campo(l, ['Qual demanda']));
  if (!tipo) return null;
  let nome, loja, data, subtipo;
  const vinculo = campo(l, ['Esse colaborador é']);
  if (tipo === 'Rescisão') {
    nome = campo(l, ['Nome do colaborador'], true);
    loja = campo(l, ['Loja do colaborador'], true);
    data = diaDe(campo(l, ['Data da rescisão']));
  } else if (tipo === 'Admissão') {
    nome = campo(l, ['Nome completo do colaborad']);
    loja = campo(l, ['Loja fixa do novo']);
    data = diaDe(campo(l, ['Data de inicio']));
  } else {
    nome = campo(l, ['Nome COMPLETO do Colaborad']);
    loja = campo(l, ['Loja do colaborador promov']);
    data = diaDe(campo(l, ['Data de Início da Promo']));
    const q = _norm(campo(l, ['Sua soicitação é de']));
    subtipo = q.indexOf('efetiva') !== -1 ? 'Efetivação' : q.indexOf('cooperad') !== -1 ? 'Passar a Cooperado' : 'Alteração de nível';
  }
  return {
    fonte: 'Forms', tipo: tipo, subtipo: subtipo, data: data, semData: !data, loja: loja,
    setor: loja ? _RG.setorDaEquipe(loja) : 'Sem loja informada', vinculo: vinculo, nome: nome, mudouSalario: undefined,
  };
}

// ---------------- Juntar, tirar duplicadas, ligar ao Factorial ----------------

function _tokens(nome) {
  return _norm(nome).replace(/[^a-z ]/g, ' ').split(' ').filter(function (t) { return t && t.length > 1 && ['de', 'da', 'do', 'dos', 'das'].indexOf(t) === -1; });
}

/** Distancia de edicao (quantas letras mudam de um texto para o outro). */
function _distancia(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Sobrenomes iguais, ou com 1 letra de erro de digitacao (so em palavras de 6+ letras). */
function _tokenIgual(a, b) { return a === b || (Math.min(a.length, b.length) >= 6 && _distancia(a, b) <= 1); }

/**
 * O Forms costuma escrever o nome mais curto e com erros de digitacao.
 * O primeiro nome tem que ser igual; o resto do nome mais curto tem que estar no mais longo.
 */
function nomesParecem(a, b) {
  const ta = _tokens(a), tb = _tokens(b);
  if (!ta.length || !tb.length) return false;
  const curto = ta.length <= tb.length ? ta : tb;
  const longo = ta.length <= tb.length ? tb : ta;
  if (curto[0] !== longo[0]) return false;
  const dentro = curto.filter(function (t) { return longo.some(function (l) { return _tokenIgual(t, l); }); }).length;
  return dentro === curto.length || (curto.length >= 3 && dentro / curto.length >= 0.75);
}

function _diasEntre(a, b) { return Math.abs((a - b) / 86400000); }

/** Mesma pessoa, mesmo tipo e mesmo dia (ou ate 1 dia de diferenca) nas duas fontes = uma solicitacao so. */
function juntarSolicitacoes(listas) {
  const todas = [];
  listas.forEach(function (lista) { lista.forEach(function (s) { todas.push(s); }); });
  const unicas = [], repetidas = [];
  todas.forEach(function (s) {
    const igual = unicas.filter(function (u) {
      return u.tipo === s.tipo && nomesParecem(u.nome, s.nome) &&
        ((!u.data && !s.data) || (u.data && s.data && _diasEntre(u.data, s.data) <= 1));
    })[0];
    if (igual) repetidas.push(s); else unicas.push(s);
  });
  return { solicitacoes: unicas, repetidas: repetidas };
}

/**
 * Acha a pessoa do Factorial para uma solicitacao. Se houver mais de uma com nome parecido
 * (ex.: ex-funcionario e novo perfil), escolhe a de data mais proxima. Sem achar: null (vai para "conferir").
 */
function acharPessoa(s, pessoas) {
  const candidatas = pessoas.filter(function (p) { return nomesParecem(s.nome, p.nome + ' ' + p.sobrenome); });
  if (!candidatas.length) return null;
  if (candidatas.length === 1 || !s.data) return candidatas[0];
  function ref(p) { return s.tipo === 'Rescisão' ? p.desligamento : p.inicio; }
  candidatas.sort(function (x, y) {
    const dx = ref(x) ? _diasEntre(ref(x), s.data) : 1e9, dy = ref(y) ? _diasEntre(ref(y), s.data) : 1e9;
    return dx - dy;
  });
  return candidatas[0];
}

/** Lista "conferir": o que o robo nao tem certeza. Sempre mostra o motivo em palavras simples. */
function listaConferir(solicitacoes, pessoas, ano, mes) {
  const lista = [];
  solicitacoes.forEach(function (s) {
    // "Sem data" so avisa para pedidos do Bitrix (recentes); o historico antigo do Forms nao entra.
    if (s.semData) {
      if (s.fonte === 'Bitrix') lista.push({ motivo: 'Solicitação sem data', tipo: s.tipo, nome: s.nome, loja: s.loja });
      return;
    }
    if (!s.data || s.data.getUTCFullYear() !== ano || s.data.getUTCMonth() + 1 !== mes) return;
    if (s.setor === 'Sem loja informada') lista.push({ motivo: 'Pedido sem loja informada', tipo: s.tipo, nome: s.nome, loja: s.loja });
    if (s.setor === 'Loja sem setor') lista.push({ motivo: 'Loja sem setor cadastrado', tipo: s.tipo, nome: s.nome, loja: s.loja });
    if (s.tipo !== 'Promoção' && !acharPessoa(s, pessoas)) {
      lista.push({ motivo: 'Não achei esta pessoa no Factorial', tipo: s.tipo, nome: s.nome, loja: s.loja });
    }
  });
  return lista;
}

/**
 * Detalhe das saidas do mes que as apresentacoes citam: quantas eram estagiarios,
 * quantas tinham menos de 5 e de 6 meses de casa, e as saidas por loja.
 */
function detalheDasSaidas(pessoas, solicitacoes, ano, mes) {
  const d = { total: 0, estagio: 0, efetivo: 0, menosDe5m: 0, menosDe6m: 0, semTempoDeCasa: 0, porLoja: {} };
  solicitacoes.forEach(function (s) {
    if (s.tipo !== 'Rescisão' || !s.data || s.data.getUTCFullYear() !== ano || s.data.getUTCMonth() + 1 !== mes) return;
    if (!_RG.ehMovimentoReal(s)) return;
    d.total++;
    if (/^est/i.test(_norm(s.vinculo))) d.estagio++; else d.efetivo++;
    const lojaNum = String(s.loja || '').match(/(\d+)/);
    const chave = lojaNum ? 'L' + Number(lojaNum[1]) : (s.loja ? String(s.loja) : 'sem loja');
    d.porLoja[chave] = (d.porLoja[chave] || 0) + 1;
    const p = acharPessoa(s, pessoas);
    if (!p || !p.inicio) { d.semTempoDeCasa++; return; }
    const m = _RG.mesesDeCasa(p.inicio, s.data);
    if (m < 5) d.menosDe5m++;
    if (m < 6) d.menosDe6m++;
  });
  return d;
}

/** A "foto" de um mes fechado: tudo que o painel precisa, num objeto so. */
function fotoDoMes(pessoasBrutas, solicitacoes, ano, mes) {
  const pessoas = pessoasValidas(pessoasBrutas);
  const mov = _RG.movimentacaoDoMes(pessoas, solicitacoes, ano, mes);
  return {
    ano: ano, mes: mes,
    quadro: _RG.quadroNoMes(pessoas, ano, mes).length,
    saidas: detalheDasSaidas(pessoas, solicitacoes, ano, mes),
    movimentacao: mov,
    tempoDeCasa: _RG.tempoDeCasa(pessoas, ano, mes),
    faixaEtaria: _RG.faixaEtaria(pessoas, ano, mes),
    conferir: listaConferir(solicitacoes, pessoas, ano, mes).concat(
      mov.conferir.map(function (c) { return { motivo: c.motivo, tipo: c.solicitacao.tipo, nome: c.solicitacao.nome, loja: c.solicitacao.loja }; })),
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    campo, diaDe, normalizarPessoaFactorial, pessoasValidas, normalizarLinhaForms,
    nomesParecem, juntarSolicitacoes, acharPessoa, listaConferir, detalheDasSaidas, fotoDoMes,
  };
}

// ===== Analise.gs =====
/**
 * Texto de analise automatico, no estilo das apresentacoes A>R (numero + diagnostico + risco).
 * So regras fixas: nao usa IA, entao rodar todo mes nao gasta nada.
 */

function _pct(v) { return v === null || v === undefined ? '-' : v.toFixed(1).replace('.', ',') + '%'; }
function _n1(v) { return v === null || v === undefined ? '-' : v.toFixed(1).replace('.', ','); }
function _lista(arr) { return arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]; }
function _muda(a, b, sobe, cai) { return b > a ? sobe : b < a ? cai : 'ficou igual'; }
const _SETORES_COMERCIAIS = ['Norte', 'Sul Joinville', 'Sul Praias', 'Sudeste', 'Nordeste', 'Litoral'];

/**
 * foto: foto do mes. anterior: foto do mes anterior (ou null). historico: fotos anteriores, mais antiga primeiro.
 * Devolve { rotatividade: [frases], tempoDeCasa: [...], idade: [...], alertas: [...] }.
 */
function analisarMes(foto, anterior, historico) {
  const mov = foto.movimentacao, t = mov.total, ps = mov.porSetor;
  const out = { rotatividade: [], tempoDeCasa: [], idade: [], alertas: [] };

  // ---- Rotatividade e crescimento
  const lider = _SETORES_COMERCIAIS.map(function (s) { return [s, (ps[s] || {}).promocoes || 0]; })
    .sort(function (a, b) { return b[1] - a[1]; })[0];
  out.rotatividade.push(t.promocoes + ' promoções.' + (lider && lider[1] > 0 ? ' ' + lider[0] + ' liderou com ' + lider[1] + '.' : ''));
  if (anterior) {
    const ra = anterior.movimentacao.total.rotatividade, rb = t.rotatividade;
    if (ra !== null && rb !== null) {
      // quantos meses seguidos a rotatividade vem andando na mesma direcao
      const serie = (historico || []).concat([anterior]).map(function (f) { return f.movimentacao.total.rotatividade; }).concat([rb]);
      const dir = rb > ra ? 1 : -1;
      let k = 0;
      for (let i = serie.length - 1; i > 0 && rb !== ra; i--) {
        const d = serie[i] > serie[i - 1] ? 1 : serie[i] < serie[i - 1] ? -1 : 0;
        if (d === dir) k++; else break;
      }
      out.rotatividade.push('Rotatividade geral ' + _muda(ra, rb, 'subiu', 'caiu') + ' de ' + _pct(ra) + ' para ' + _pct(rb) +
        (k >= 2 ? ' (' + k + 'º mês seguido: ' + serie.slice(-Math.min(k + 1, 4)).map(_pct).join(' → ') + ')' : '') + '.');
    }
  } else {
    out.rotatividade.push('Rotatividade geral de ' + _pct(t.rotatividade) + ' (' + t.saidas + ' saídas e ' + t.entradas + ' entradas).');
  }
  const zeradas = _SETORES_COMERCIAIS.filter(function (s) { return ps[s] && ps[s].quadro > 0 && ps[s].saidas === 0; });
  if (zeradas.length) out.rotatividade.push(_lista(zeradas) + (zeradas.length > 1 ? ' zeraram' : ' zerou') + ' as rescisões no mês.');
  const piores = _SETORES_COMERCIAIS.filter(function (s) { return ps[s] && ps[s].rotatividade !== null; })
    .sort(function (a, b) { return ps[b].rotatividade - ps[a].rotatividade; });
  if (piores.length) {
    const p = piores[0];
    out.rotatividade.push(p + ': ' + _pct(ps[p].rotatividade) + ' de rotatividade e ' + ps[p].promocoes + ' promoções.');
    const m = piores[piores.length - 1];
    if (m !== p) out.rotatividade.push('Menor rotatividade do comercial: ' + m + ' (' + _pct(ps[m].rotatividade) + ').');
  }
  const sd = foto.saidas;
  if (sd && sd.total > 0) {
    out.rotatividade.push('Das ' + sd.total + ' saídas, ' + sd.estagio + ' foram de estagiários.');
    if (sd.menosDe5m > 0) out.rotatividade.push(sd.menosDe5m + ' das ' + sd.total + ' saídas tinham menos de 5 meses de casa' +
      (sd.menosDe6m === sd.total ? ' — 100% das saídas foram de pessoas com menos de 6 meses.' : ' — o problema se concentra nos primeiros meses.'));
    const lojas = Object.keys(sd.porLoja).filter(function (l) { return sd.porLoja[l] >= 2; });
    if (lojas.length) out.rotatividade.push(_lista(lojas.map(function (l) { return l + ' com ' + sd.porLoja[l] + ' saídas'; })) + '.');
    const recorrentes = Object.keys(sd.porLoja).filter(function (l) {
      const h = (historico || []).concat(anterior ? [anterior] : []).slice(-2);
      return h.length === 2 && h.every(function (f) { return f.saidas && f.saidas.porLoja[l]; });
    });
    if (recorrentes.length) out.alertas.push(_lista(recorrentes) + ': 3 meses seguidos com saídas.');
  }

  // ---- Tempo de casa
  const tc = foto.tempoDeCasa;
  if (anterior) {
    const a = anterior.tempoDeCasa;
    out.tempoDeCasa.push('Média de tempo de casa ' + _muda(a.mediaMeses, tc.mediaMeses, 'subiu', 'caiu') + ' de ' + _n1(a.mediaMeses) + ' para ' + _n1(tc.mediaMeses) + ' meses.');
    out.tempoDeCasa.push('Grupo de menos de 3 meses ' + _muda(a.faixas['<3m'], tc.faixas['<3m'], 'subiu', 'caiu') + ' de ' + a.faixas['<3m'] + ' para ' + tc.faixas['<3m'] +
      '; de 3 a 6 meses foi de ' + a.faixas['3-6m'] + ' para ' + tc.faixas['3-6m'] + '.');
  } else {
    out.tempoDeCasa.push('Média de tempo de casa: ' + _n1(tc.mediaMeses) + ' meses.');
  }
  const novos = tc.faixas['<3m'] + tc.faixas['3-6m'];
  const pctNovos = tc.quadro ? novos / tc.quadro * 100 : 0;
  out.tempoDeCasa.push(novos + ' colaboradores com menos de 6 meses (' + _pct(pctNovos) + ' do quadro)' + (pctNovos >= 20 ? ' — zona de risco de rotatividade.' : '.'));
  const veteranos = tc.faixas['>2a'];
  out.tempoDeCasa.push('Veteranos com mais de 2 anos: ' + veteranos + '.');

  // ---- Idade
  const fe = foto.faixaEtaria;
  out.idade.push('Idade média de ' + _n1(fe.mediaAnos) + ' anos.');
  const jovens = fe.faixas['<18'] + fe.faixas['18-20'];
  out.idade.push(jovens + ' pessoas (' + _pct(fe.quadro ? jovens / fe.quadro * 100 : 0) + ') têm menos de 20 anos; ' + fe.faixas['<18'] + ' têm menos de 18.');
  if (fe.semData) out.idade.push(fe.semData + ' pessoas sem data de nascimento no Factorial.');

  // ---- Alertas de risco (histórico se repetir)
  const risco = _SETORES_COMERCIAIS.filter(function (s) { return ps[s] && ps[s].entradas >= 5; });
  if (risco.length) out.alertas.push('Muita gente nova entrando em ' + _lista(risco) + ': se o histórico se repetir, a rotatividade desses setores deve subir nos próximos meses.');
  if (foto.conferir && foto.conferir.length) out.alertas.push(foto.conferir.length + ' itens para conferir (veja a aba "Conferir").');
  return out;
}

if (typeof module !== 'undefined') module.exports = { analisarMes };

// ===== Painel.gs =====
/**
 * Painel no Google Sheets: abas Painel, Análise, Conferir e Fotos (historico).
 *  - tabelaMensal / tabelaSetores: funcoes puras (testadas com node)
 *  - o resto usa SpreadsheetApp e so roda no Google (testar na primeira execucao)
 *
 * Cada mes fechado e gravado na aba "Fotos" e NUNCA recalculado (o Factorial muda o passado).
 */

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ABA = { painel: 'Painel', analise: 'Análise', conferir: 'Conferir', fotos: 'Fotos' };

function rotuloMes(f) { return MESES_PT[f.mes - 1] + '/' + String(f.ano).slice(2) + (f.parcial ? ' (parcial)' : ''); }

/** Linhas: um mes por linha. */
function tabelaMensal(fotos) {
  const cab = ['Mês', 'Quadro', 'Saídas', 'Entradas', 'Rotatividade %', 'Promoções', 'Tempo de casa (média, meses)',
    '<3m', '3-6m', '6-12m', '1-2a', '>2a', 'Idade média'];
  const linhas = fotos.map(function (f) {
    const t = f.movimentacao.total, tc = f.tempoDeCasa;
    return [rotuloMes(f), f.quadro, t.saidas, t.entradas, t.rotatividade === null ? '' : Math.round(t.rotatividade * 10) / 10,
      t.promocoes, Math.round(tc.mediaMeses * 10) / 10, tc.faixas['<3m'], tc.faixas['3-6m'], tc.faixas['6-12m'], tc.faixas['1-2a'], tc.faixas['>2a'],
      f.faixaEtaria.mediaAnos === null ? '' : Math.round(f.faixaEtaria.mediaAnos * 10) / 10];
  });
  return [cab].concat(linhas);
}

/** Linhas: um setor por linha, para o ultimo mes. Sul sempre dividido. */
function tabelaSetores(foto) {
  const ordem = ['Norte', 'Sul Joinville', 'Sul Praias', 'Sudeste', 'Nordeste', 'Litoral', 'Base'];
  const ps = foto.movimentacao.porSetor;
  const cab = ['Setor', 'Quadro (média do mês)', 'Saídas', 'Entradas', 'Rotatividade %', 'Promoções'];
  const linhas = ordem.filter(function (s) { return ps[s]; }).map(function (s) {
    const l = ps[s];
    return [s, l.quadro, l.saidas, l.entradas, l.rotatividade === null ? '' : Math.round(l.rotatividade * 10) / 10, l.promocoes];
  });
  const t = foto.movimentacao.total;
  linhas.push(['TOTAL', t.quadro, t.saidas, t.entradas, t.rotatividade === null ? '' : Math.round(t.rotatividade * 10) / 10, t.promocoes]);
  return [cab].concat(linhas);
}

/** Um mes so e fechado a partir do dia FECHAR_NO_DIA do mes seguinte (pedidos de fim de mes chegam atrasados). */
const FECHAR_NO_DIA = 5;

function ultimoMesFechado(hoje) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (FECHAR_NO_DIA - 1));
  const m = d.getMonth(); // 0-11: o mes anterior ao mes de d
  return m === 0 ? { ano: d.getFullYear() - 1, mes: 12 } : { ano: d.getFullYear(), mes: m };
}

function mesSeguinte(x) { return x.mes === 12 ? { ano: x.ano + 1, mes: 1 } : { ano: x.ano, mes: x.mes + 1 }; }

if (typeof module !== 'undefined') module.exports = { tabelaMensal, tabelaSetores, ultimoMesFechado, mesSeguinte, rotuloMes };

// ---------------- Daqui para baixo: so roda dentro do Google Sheets ----------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('RH')
    .addItem('★ Fazer tudo agora (1 clique)', 'fazerTudoAgora')
    .addSeparator()
    .addItem('Atualizar painel agora', 'atualizarPainel')
    .addItem('Ligar atualização automática (todo dia, 7h)', 'ligarAtualizacaoAutomatica')
    .addItem('Testar conexões', 'testarConexoes')
    .addSeparator()
    .addItem('Guardar endereço do Bitrix', 'guardarEnderecoBitrix')
    .addItem('Guardar chave do Factorial', 'guardarChaveFactorial')
    .addItem('Explorar Factorial (só anota o formato)', 'explorarFactorial')
    .addToUi();
}

// Codigos que NAO sao segredo ficam aqui. Segredos (chaves, webhook) ficam so nas Propriedades do script.
const PADROES = {
  FORMS_PLANILHA_ID: '15yjXwlvkEfoywBbtVdQA4-BTu-PrMj1yHWnFSMANivA', // "Departamento pessoal (respostas)"
  FACTORIAL_PLANILHA_ID: '1FBVF3TDpLy6bVlcONxvzpgdzBpjrTMQ61oZZMUYwct4', // "Factorial (colunas do painel)"
  FACTORIAL_MODO: 'planilha',
};
// Sem o webhook do Bitrix, so da para fechar meses ate este (o Forms recebeu pedidos ate 16/09/26).
const ULTIMO_MES_SEM_BITRIX = { ano: 2026, mes: 8 };

function _prop(nome) { return PropertiesService.getScriptProperties().getProperty(nome) || PADROES[nome] || null; }

function _aba(ss, nome) { return ss.getSheetByName(nome) || ss.insertSheet(nome); }

/**
 * Le uma aba como lista de objetos {cabecalho: valor}. Sem nomeAba, le a primeira aba.
 * Datas viram texto aaaa-mm-dd no fuso da PROPRIA planilha (evita errar o dia).
 */
function _lerAba(planilhaId, nomeAba, linhaCabecalho) {
  const ss = SpreadsheetApp.openById(planilhaId);
  const aba = nomeAba ? ss.getSheetByName(nomeAba) : ss.getSheets()[0];
  if (!aba) throw new Error('Não achei a aba "' + nomeAba + '" na planilha ' + planilhaId);
  const fuso = ss.getSpreadsheetTimeZone();
  const v = aba.getDataRange().getValues();
  const cab = v[linhaCabecalho - 1];
  return v.slice(linhaCabecalho).map(function (linha) {
    const o = {};
    cab.forEach(function (c, i) {
      let x = linha[i];
      if (c === '' || x === '') return;
      if (x instanceof Date) x = Utilities.formatDate(x, fuso, 'yyyy-MM-dd');
      o[String(c)] = x;
    });
    return o;
  });
}

function carregarFactorial() {
  if (_prop('FACTORIAL_MODO') === 'api') {
    throw new Error('Leitura direta do Factorial por chave ainda não foi validada. Use FACTORIAL_MODO = planilha por enquanto.');
  }
  return _lerAba(_prop('FACTORIAL_PLANILHA_ID'), null, 1).map(normalizarPessoaFactorial);
}

function carregarSolicitacoes() {
  const forms = _lerAba(_prop('FORMS_PLANILHA_ID'), 'Histórico', 1).map(normalizarLinhaForms).filter(function (s) { return s; });
  const bitrix = _prop('BITRIX_WEBHOOK') ? baixarSolicitacoesBitrix().solicitacoes : [];
  return juntarSolicitacoes([forms, bitrix]).solicitacoes;
}

function _fotosSalvas(ss) {
  const aba = ss.getSheetByName(ABA.fotos);
  const fotos = {};
  if (!aba || aba.getLastRow() < 2) return fotos;
  aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues().forEach(function (l) { fotos[l[0]] = JSON.parse(l[1]); });
  return fotos;
}

function _salvarFoto(ss, chave, foto) {
  const aba = _aba(ss, ABA.fotos);
  if (aba.getLastRow() === 0) aba.appendRow(['Mês (aaaa-mm)', 'Foto (não editar)']);
  aba.appendRow([chave, JSON.stringify(foto)]);
}

function _aviso(ss, texto) { try { ss.toast(texto, 'RH', 10); } catch (e) { /* sem tela (execucao remota) */ } }

function _chave(ano, mes) { return ano + '-' + (mes < 10 ? '0' : '') + mes; }

/** Atualiza o painel: calcula so os meses fechados que ainda nao tem foto, depois redesenha tudo. */
function atualizarPainel(ssOpcional) {
  const ss = (ssOpcional && ssOpcional.getId) ? ssOpcional : SpreadsheetApp.getActiveSpreadsheet();
  let fim = ultimoMesFechado(new Date());
  const semBitrix = !_prop('BITRIX_WEBHOOK');
  if (semBitrix && (fim.ano * 12 + fim.mes) > (ULTIMO_MES_SEM_BITRIX.ano * 12 + ULTIMO_MES_SEM_BITRIX.mes)) {
    fim = ULTIMO_MES_SEM_BITRIX; // nao grava mes incompleto
  }
  const salvas = _fotosSalvas(ss);
  const meses = [];
  let a = fim.ano, m = fim.mes;
  for (let i = 0; i < Number(_prop('MESES_NO_PRIMEIRO_USO') || 6); i++) {
    meses.unshift({ ano: a, mes: m });
    m--; if (m === 0) { m = 12; a--; }
  }
  const faltam = meses.filter(function (x) { return !salvas[_chave(x.ano, x.mes)]; });
  const parcial = mesSeguinte(fim);
  const comParcial = !semBitrix; // o mes em andamento so e confiavel com o Bitrix ligado
  let fotoParcial = null;
  if (faltam.length || comParcial) {
    const pessoas = carregarFactorial(), solicitacoes = carregarSolicitacoes();
    faltam.forEach(function (x) {
      const f = fotoDoMes(pessoas, solicitacoes, x.ano, x.mes);
      salvas[_chave(x.ano, x.mes)] = f;
      _salvarFoto(ss, _chave(x.ano, x.mes), f);
    });
    if (comParcial) { fotoParcial = fotoDoMes(pessoas, solicitacoes, parcial.ano, parcial.mes); fotoParcial.parcial = true; }
  }
  const fotos = meses.map(function (x) { return salvas[_chave(x.ano, x.mes)]; });
  desenharPainel(ss, fotoParcial ? fotos.concat([fotoParcial]) : fotos);
  garantirGatilhoDiario();
  _aviso(ss, 'Painel atualizado até ' + rotuloMes(fotos[fotos.length - 1]) + (fotoParcial ? ' (e ' + rotuloMes(fotoParcial) + ')' : '') + '.' +
    (semBitrix ? ' Falta ligar o Bitrix para fechar os meses seguintes.' : ''));
}

function _escrever(aba, linha, coluna, matriz) {
  aba.getRange(linha, coluna, matriz.length, matriz[0].length).setValues(matriz);
}

function desenharPainel(ss, fotos) {
  const fechadas = fotos.filter(function (f) { return !f.parcial; });
  const parcial = fotos.filter(function (f) { return f.parcial; })[0] || null;
  const ultima = fechadas[fechadas.length - 1], anterior = fechadas.length > 1 ? fechadas[fechadas.length - 2] : null;
  const painel = _aba(ss, ABA.painel);
  painel.clear(); painel.getCharts().forEach(function (c) { painel.removeChart(c); });
  painel.getRange('A1').setValue('Painel de RH — Tintomax').setFontSize(16).setFontWeight('bold');
  painel.getRange('A2').setValue('Atualizado todos os dias às 7h. Último mês fechado: ' + rotuloMes(ultima) + (parcial ? ' | mês em andamento: ' + rotuloMes(parcial) + ' (ainda não conta nos gráficos)' : ''));
  const mensal = tabelaMensal(fotos);
  painel.getRange(4, 1, mensal.length, 1).setNumberFormat('@'); // "mar/26" tem que ficar texto, nao virar data
  _escrever(painel, 4, 1, mensal);
  painel.getRange(4, 1, 1, mensal[0].length).setFontWeight('bold').setBackground('#e8eaf6').setWrap(true);
  const setores = tabelaSetores(ultima);
  const linhaSetores = 4 + mensal.length + 2;
  painel.getRange(linhaSetores - 1, 1).setValue('Por setor — ' + rotuloMes(ultima)).setFontWeight('bold');
  _escrever(painel, linhaSetores, 1, setores);
  painel.getRange(linhaSetores, 1, 1, setores[0].length).setFontWeight('bold').setBackground('#e8eaf6').setWrap(true);

  const n = fechadas.length;
  painel.insertChart(painel.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(painel.getRange(4, 1, n + 1, 1)).addRange(painel.getRange(4, 5, n + 1, 1))
    .setOption('title', 'Rotatividade geral (%)').setPosition(linhaSetores + setores.length + 2, 1, 0, 0).build());
  painel.insertChart(painel.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(painel.getRange(4, 1, n + 1, 1)).addRange(painel.getRange(4, 8, n + 1, 5))
    .setOption('title', 'Tempo de casa (pessoas por faixa)').setOption('isStacked', true)
    .setPosition(linhaSetores + setores.length + 2, 6, 0, 0).build());
  painel.setFrozenRows(4);

  const texto = analisarMes(ultima, anterior, fechadas.slice(0, -2));
  const an = _aba(ss, ABA.analise); an.clear();
  const linhas = [['Análise de ' + rotuloMes(ultima)]];
  [['Rotatividade e crescimento', 'rotatividade'], ['Tempo de casa', 'tempoDeCasa'], ['Idade', 'idade'], ['Atenção', 'alertas']].forEach(function (s) {
    if (!texto[s[1]].length) return;
    linhas.push(['']); linhas.push([s[0]]);
    texto[s[1]].forEach(function (f) { linhas.push(['• ' + f]); });
  });
  _escrever(an, 1, 1, linhas); an.setColumnWidth(1, 900); an.getRange(1, 1, linhas.length, 1).setWrap(true);
  an.getRange(1, 1).setFontWeight('bold').setFontSize(14);

  const cf = _aba(ss, ABA.conferir); cf.clear();
  const itens = [['Motivo', 'Tipo', 'Nome', 'Loja']].concat(ultima.conferir.map(function (c) { return [c.motivo, c.tipo, c.nome || '', c.loja || '']; }));
  _escrever(cf, 1, 1, itens); cf.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#fff3e0');
}

/** Deixa so UM gatilho: todo dia as 7h. Remove o mensal antigo. Roda sozinho ao atualizar o painel. */
function garantirGatilhoDiario() {
  const gs = ScriptApp.getProjectTriggers().filter(function (g) { return g.getHandlerFunction() === 'atualizarPainel'; });
  const diario = gs.filter(function (g) { return g.getEventType() === ScriptApp.EventType.CLOCK && String(g.getTriggerSource()) === 'CLOCK'; });
  if (gs.length === 1 && diario.length === 1 && _prop('GATILHO') === 'diario') return;
  gs.forEach(function (g) { ScriptApp.deleteTrigger(g); });
  ScriptApp.newTrigger('atualizarPainel').timeBased().everyDays(1).atHour(7).create();
  PropertiesService.getScriptProperties().setProperty('GATILHO', 'diario');
}

function ligarAtualizacaoAutomatica() {
  garantirGatilhoDiario();
  SpreadsheetApp.getActive().toast('Pronto: o painel se atualiza sozinho todos os dias, às 7h.', 'RH', 8);
}

function testarConexoes() {
  const r = [];
  try { r.push('Factorial: ' + carregarFactorial().length + ' pessoas'); } catch (e) { r.push('Factorial: ERRO - ' + e.message); }
  if (!_prop('BITRIX_WEBHOOK')) r.push('Bitrix: ainda sem webhook (BITRIX_WEBHOOK)'); else try { const b = baixarSolicitacoesBitrix(); r.push('Bitrix: ' + b.total + ' pedidos (' + b.bemSucedidas + ' bem sucedidos)' + (b.camposSemMapa.length ? ' | campos sem mapa: ' + b.camposSemMapa.join(', ') : '')); } catch (e) { r.push('Bitrix: ERRO - ' + e.message); }
  try { r.push('Forms: ' + _lerAba(_prop('FORMS_PLANILHA_ID'), 'Histórico', 1).length + ' linhas'); } catch (e) { r.push('Forms: ERRO - ' + e.message); }
  SpreadsheetApp.getUi().alert(r.join('\n'));
}

// ---------------- Execucao remota (sem tela), usada para testar ----------------
const PAINEL_ID = '1Q-N-3wjyI34fXLjaaq70BGq1rNs9RtzdWmD5YIPEawo';

/** Checa cada ligacao e devolve um texto (sem abrir janelas). */
function diagnostico() {
  const r = [];
  function passo(nome, fn) { try { r.push(nome + ': ' + fn()); } catch (e) { r.push(nome + ': ERRO - ' + e.message); } }
  passo('Painel (planilha)', function () { return SpreadsheetApp.openById(PAINEL_ID).getName(); });
  passo('Forms (Histórico)', function () { return _lerAba(_prop('FORMS_PLANILHA_ID'), 'Histórico', 1).length + ' linhas'; });
  passo('Factorial', function () { const p = carregarFactorial(); return p.length + ' pessoas, ' + pessoasValidas(p).length + ' válidas'; });
  passo('Bitrix', function () { return _prop('BITRIX_WEBHOOK') ? (function () { const b = baixarSolicitacoesBitrix(); return b.total + ' pedidos (' + b.bemSucedidas + ' bem sucedidos)'; })() : 'sem webhook ainda'; });
  return r.join('\n');
}

function atualizarPainelRemoto() {
  atualizarPainel(SpreadsheetApp.openById(PAINEL_ID));
  return 'Painel atualizado.';
}

/** Um clique so: explora o Factorial, atualiza o painel e liga a atualizacao diaria. Mostra o resultado de cada passo. */
function fazerTudoAgora() {
  const r = [];
  function passo(nome, fn) { try { fn(); r.push('OK   - ' + nome); } catch (e) { r.push('ERRO - ' + nome + ': ' + String(e.message).slice(0, 160)); } }
  passo('Explorar o Factorial', explorarFactorial);
  passo('Atualizar o painel', atualizarPainel);
  passo('Ligar a atualização diária (7h)', garantirGatilhoDiario);
  SpreadsheetApp.getUi().alert('Resultado:\n\n' + r.join('\n') + '\n\nPode fechar esta janela e avisar a Claude.');
}
