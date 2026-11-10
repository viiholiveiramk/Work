import sys
cases = [
 ("Caso A", "Marina",
  "A Marina é apoio nível 1, está há 8 meses na loja e já disse uma vez que quer ser consultora. Sempre foi pontual e quieta. Nas últimas semanas errou duas conferências de estoque e parou de falar no grupo da loja. O último acompanhamento dela foi há 3 meses."),
 ("Caso B", "Rafa",
  "O Rafa é o melhor vendedor da loja e bate a meta todo mês. Há duas semanas começou a dizer aos colegas: \"aqui não tem futuro\". O atendimento dele continua bom, mas ele ficou seco com os clientes."),
 ("Caso C", "Bia",
  "A Bia foi promovida a responsável de loja há 2 meses, e antes era da própria equipe. Fica até tarde e não delega. A equipe reclama que ela \"faz tudo e não explica nada\". Quando perguntam, ela responde: \"tá tudo bem\"."),
]
def lines(n): return "".join('<div class="ln"></div>' for _ in range(n))
pages = ""
for tag, nome, texto in cases:
    pages += f"""
<section class="page">
  <header><div class="logo">TINTOMAX</div><div class="ttl">Atividade prática · Só perguntas</div></header>
  <div class="case"><b>{tag} — {nome}</b><p>{texto}</p></div>
  <div class="rules"><b>Regras:</b> só perguntas, nenhum conselho. Perguntas abertas, que não se respondem com sim ou não. Mínimo 3 por etapa. Marque com ⭐ a pergunta que mais muda a conversa.</div>
  <div class="band c"><h2>CLAREZA <span>Entender a pessoa</span></h2>
    <p class="hint">Como ela está hoje? O que está por trás do problema (e não só o sintoma)? O que ela espera e o que a Tintomax espera? O que ela quer da vida e por que o trabalho importa?</p>{lines(3)}</div>
  <div class="band v"><h2>VISÃO <span>Para onde ela pode ir</span></h2>
    <p class="hint">Que caminhos ela tem? O que falta para chegar lá? Que fato ou dado mostra isso?</p>{lines(3)}</div>
  <div class="band w"><h2>VONTADE <span>O que vai acontecer</span></h2>
    <p class="hint">O que ela vai fazer e até quando? Que apoio ela precisa? Qual é a minha parte nisso?</p>{lines(3)}</div>
  <footer>Gestores: pergunte ao grupo — "essa pergunta descobre algo novo ou só confirma o que você já acha?"</footer>
</section>"""
html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
@page {{ size:A4; margin:0 }}
*{{box-sizing:border-box}} body{{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0D2B5E;font-size:11.5px}}
.page{{width:210mm;height:297mm;padding:12mm 14mm;page-break-after:always;display:flex;flex-direction:column;gap:7px}}
header{{background:#0D2B5E;color:#fff;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center}}
.logo{{font-weight:900;font-size:18px;letter-spacing:1px}} .ttl{{font-size:13px;font-weight:bold}}
.case{{background:#EEF0F3;border-left:5px solid #F47920;padding:8px 12px;border-radius:4px;font-size:12.5px}}
.case p{{margin:4px 0 0;line-height:1.4}}
.rules{{font-size:11px;padding:2px 2px}}
.band{{background:#EEF0F3;border-radius:6px;padding:8px 12px;flex:1;display:flex;flex-direction:column}}
.band h2{{margin:0 0 3px;font-size:14px;color:#F47920}} .band h2 span{{font-size:11px;color:#0D2B5E;font-weight:normal;margin-left:6px}}
.hint{{margin:0 0 4px;font-size:10px;color:#4a5a7a}}
.ln{{border-bottom:1px solid #9aa5b8;flex:1;min-height:20px}}
footer{{font-size:10px;color:#4a5a7a;text-align:center}}
</style><body>{pages}</body></html>"""
open(sys.argv[1],"w").write(html)
