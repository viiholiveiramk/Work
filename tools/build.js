// Junta os arquivos do robo em UM arquivo para colar no Google Apps Script: node tools/build.js
const fs = require('fs');
const ordem = ['Regras', 'Bitrix', 'Factorial', 'Solicitacoes', 'Analise', 'Painel'];
const corpo = ordem.map((n) => '// ===== ' + n + '.gs =====\n' + fs.readFileSync(__dirname + '/../apps-script/' + n + '.gs', 'utf8')).join('\n');
fs.writeFileSync(__dirname + '/../dist/PainelRH.gs', '// Painel de RH Tintomax - arquivo gerado por tools/build.js (nao editar aqui)\n\n' + corpo);
console.log('dist/PainelRH.gs gerado,', corpo.split('\n').length, 'linhas');
