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
