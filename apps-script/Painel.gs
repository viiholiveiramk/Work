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
