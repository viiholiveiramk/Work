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
