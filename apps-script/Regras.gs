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
