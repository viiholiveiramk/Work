import sys
cases = [
 ("Situação 1", "Bianca",
  "A Bianca tem 3 meses de casa. Ela quer crescer, mas não sabe para onde. Já pensou em coisas bem diferentes, como enfermagem ou direito."),
 ("Situação 2", "Rafa",
  "O Rafa é o melhor vendedor da loja e bate a meta todo mês. Há duas semanas começou a dizer aos colegas: \"aqui não tem futuro\". O atendimento dele continua bom, mas ele ficou seco com os clientes."),
 ("Situação 3", "Bia",
  "A Bia foi promovida a responsável de loja há 2 meses, e antes era da própria equipe. Fica até tarde e não delega. A equipe reclama que ela \"faz tudo e não explica nada\". Quando perguntam, ela responde: \"tá tudo bem\"."),
]
fields = [
 ("c","CLAREZA","Entender a pessoa de verdade",
  "Onde ela está agora, qual a raiz do que ela vive (não só o sintoma), o que ela espera, o que a Tintomax espera dela e o que a motiva."),
 ("v","VISÃO","Mostrar para onde podemos ir",
  "Quais caminhos ela tem, o que precisa desenvolver para chegar lá (com fato e dado) e o que pode acontecer pelo caminho."),
 ("w","VONTADE","Não desistir e apoiar",
  "O que ela vai fazer e até quando, que apoio precisa e qual é a parte dela e a minha nisso. Sem comprar a dor."),
]
def lines(n): return "".join('<div class="ln"></div>' for _ in range(n))
pages = ""
for tag, nome, texto in cases:
    f = "".join(f'<div class="band"><h2>{t}<span>{s}</span></h2><p class="exp">{e}</p>{lines(3)}</div>' for _,t,s,e in fields)
    pages += f"""
<section class="page">
  <header><img src="logo.png" alt="Tintomax"><div class="ttl">Atividade Prática</div></header>
  <div class="case"><div class="tag">{tag}</div><p><b>{texto.split('.')[0]}.</b>{texto[len(texto.split('.')[0])+1:]}</p></div>
  <div class="rules">Escrevam <b>perguntas</b>, não respostas, em cada etapa do CVV. Mínimo 3 por etapa. Perguntas abertas (por que, como, quando, o que) que levem a pessoa a chegar na resposta dela. Marque com ⭐ a melhor de cada etapa.</div>
  {f}
  <footer>Depois, usem essas perguntas no role play.</footer>
</section>"""
html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
@page {{ size:A4; margin:0 }}
*{{box-sizing:border-box}} body{{margin:0;font-family:Arial,Helvetica,sans-serif;color:#133A83}}
.page{{width:210mm;height:297mm;padding:10mm 13mm;page-break-after:always;display:flex;flex-direction:column;gap:8px}}
header{{background:#EEEEEE;border-radius:8px;padding:6px 14px;display:flex;justify-content:space-between;align-items:center}}
header img{{height:34px}} .ttl{{font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#EC6A0B}}
.case{{background:#fff;border:2px solid #EC6A0B;border-radius:10px;padding:10px 14px}}
.tag{{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#EC6A0B;font-weight:bold;margin-bottom:3px}}
.case p{{margin:0;font-size:14px;line-height:1.45}}
.rules{{font-size:11px;line-height:1.4;padding:0 2px;color:#334}}
.band{{background:#EEEEEE;border-radius:10px;padding:9px 14px;flex:1;display:flex;flex-direction:column}}
.band h2{{margin:0;font-family:Georgia,serif;font-size:19px;font-weight:normal;color:#EC6A0B}}
.band h2 span{{font-family:Arial,sans-serif;font-size:11.5px;color:#133A83;font-style:italic;margin-left:10px}}
.exp{{margin:3px 0 2px;font-size:11px;line-height:1.35;color:#133A83}}
.ln{{border-bottom:1px solid #9aa5b8;flex:1;min-height:20px}}
footer{{font-size:10.5px;color:#556;text-align:center}}
</style><body>{pages}</body></html>"""
open(sys.argv[1],"w").write(html)
