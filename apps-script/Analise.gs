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
