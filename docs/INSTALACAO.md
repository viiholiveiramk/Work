# Como colocar o painel no Google Sheets (uma vez só)

Antes: tenha o endereço do webhook do Bitrix e (por enquanto) o export do Factorial colado numa planilha do Google
com as abas **Colaboradores** e **Colaboradores desligados** (a leitura direta do Factorial por chave ainda precisa ser validada).

1. No Google Sheets, crie uma planilha nova chamada **Painel RH**.
2. Menu **Extensões → Apps Script**. Apague o que estiver lá e cole **todo** o conteúdo do arquivo `dist/PainelRH.gs`. Clique em salvar.
3. Na engrenagem (**Configurações do projeto**), role até **Propriedades do script** e adicione:
   - `BITRIX_WEBHOOK` = o endereço do webhook do Bitrix
   - `FORMS_PLANILHA_ID` = código da planilha de respostas do Forms (o trecho entre `/d/` e `/edit` no endereço dela)
   - `FACTORIAL_PLANILHA_ID` = código da planilha com o export do Factorial
   - `FACTORIAL_MODO` = `planilha`
4. Volte para a planilha e recarregue a página. Aparece o menu **RH**.
5. **RH → Testar conexões** (autorize quando o Google pedir). Deve mostrar o número de pessoas, de pedidos e de linhas do Forms.
6. **RH → Atualizar painel agora**. Depois **RH → Ligar atualização automática** (roda sozinho todo dia 5).

Nunca coloque as chaves na planilha nem no chat: só nas Propriedades do script.
