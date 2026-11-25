import sys
cases = [
 dict(n=1, quem="Fernanda", perfil="apoio, 7 meses de casa",
  vi=["Há 2 meses, a Fernanda te disse que quer ser consultora. Você respondeu: \"vamos ver\".",
      "Desde então, vocês não conversaram mais sobre isso.",
      "Nas últimas 3 semanas, ela parou de se oferecer para atender no balcão.",
      "Ontem, ela passou 30 minutos ajudando um pintor a escolher cores, e ele voltou hoje para comprar."],
  ouvi=["Um colega comentou que ela faz um curso à noite, mas não sabe de quê.",
        "A responsável da loja disse que ela anda \"meio avoada\"."],
  acho="Acho que ela perdeu a vontade de crescer aqui.",
  real=["Entendeu o \"vamos ver\" como um \"não\". Esperou uma resposta por 2 semanas e parou de perguntar.",
        "Parou de atender no balcão depois de errar um desconto e ser corrigida na frente de um cliente. Tem medo de errar de novo.",
        "O curso é de técnico de enfermagem. Começou por segurança, caso aqui não tenha caminho. Mas gosta de atender pintor e prefere ficar.",
        "Só fala do curso se sentir que pode confiar."],
  resp="\"Tô bem, só cansada.\""),
 dict(n=2, quem="Thales", perfil="consultor, 1 ano e meio de casa",
  vi=["Ele bate a meta há 5 meses.",
      "Semana passada, discutiu com um colega no balcão, em voz alta, com cliente por perto.",
      "Na terça, um vendedor novo pediu ajuda com o sistema, e o Thales respondeu: \"não é meu trabalho\".",
      "Nos intervalos, ele fica sozinho no computador. Antes ficava com a equipe."],
  ouvi=["O colega da discussão disse que o Thales \"puxa cliente dos outros\".",
        "A gerente comentou que ele já falou em pedir transferência de loja, mas nunca formalizou."],
  acho="Acho que ele é bom, sabe disso, e está se achando acima da equipe.",
  real=["Passou 2 dias montando um orçamento grande. O cliente voltou quando ele estava de folga, e o colega fechou a venda. A comissão ficou com o colega. Achou injusto e sente que ninguém o escutou.",
        "Recusou ajudar o novato porque, das outras vezes que ajudou, ninguém reconheceu, e o tempo gasto derrubou a meta dele.",
        "Quer ser reconhecido e crescer (talvez como multiplicador), mas nunca falou isso para ninguém.",
        "Falou em transferência porque se mudou, e a loja nova fica a 10 minutos da casa dele."],
  resp="\"Tá tudo certo, bati a meta, né?\""),
 dict(n=3, quem="Jéssica", perfil="responsável de loja, 1 ano no cargo",
  vi=["A loja bate a meta de vendas há 4 meses, e o PZ está acima da média do setor.",
      "3 pessoas pediram demissão nos últimos 6 meses.",
      "O último acompanhamento que ela registrou no Bitrix foi há 2 meses.",
      "Ela cancelou 2 acompanhamentos com você nas últimas semanas, dizendo \"loja cheia\"."],
  ouvi=["Uma pessoa que saiu disse: \"lá ninguém me explica nada, é cada um por si\".",
        "Outra pessoa da equipe disse que gosta muito da Jéssica."],
  acho="Acho que ela está sobrecarregada.",
  real=["Há 2 vagas abertas na loja há 2 meses. Ela cobre as vagas sozinha, e por isso cancela tudo.",
        "Não sabe como fazer um acompanhamento em 20 minutos. Ninguém nunca mostrou.",
        "As saídas foram por horário de faculdade e por salário, não por conflito com ela. Mesmo assim, ela se sente culpada.",
        "Está em dúvida se quer continuar como responsável. Não contou a ninguém."],
  resp="\"Tá corrido, mas tá tudo sob controle.\""),
]
def ul(xs): return "<ul>" + "".join(f"<li>{x}</li>" for x in xs) + "</ul>"
pages = ""
for c in cases:
    pages += f"""
<section class="page">
  <header><img src="logo.png" alt="Tintomax"><div class="ttl">Acompanhamento na prática</div></header>
  <div class="card lider">
    <div class="tag">Rodada {c['n']} · Card do líder (quem faz o acompanhamento)</div>
    <h1>{c['quem']} <span>{c['perfil']}</span></h1>
    <div class="blk"><h3>O que você viu <em>(tem certeza)</em></h3>{ul(c['vi'])}</div>
    <div class="blk"><h3>O que você ouviu <em>(não tem certeza)</em></h3>{ul(c['ouvi'])}</div>
    <div class="blk"><h3>O que você acha <em>(sua hipótese)</em></h3><p>{c['acho']}</p></div>
    <p class="nota">Não escrevam as perguntas: conduzam o acompanhamento na hora, conversando. Antes de começar, decida o que quer que mude depois da conversa. <b>Quem observa:</b> anote 2 perguntas boas e 1 que poderia ser melhor.</p>
  </div>
  <div class="cut">✂ corte aqui · o card abaixo é só de quem recebe, o líder não lê</div>
  <div class="card pessoa">
    <div class="tag">Rodada {c['n']} · Card de quem recebe</div>
    <h1>Você é a pessoa: {c['quem']}</h1>
    <div class="blk"><h3>O que está acontecendo de verdade <em>(só conte se perguntarem bem)</em></h3>{ul(c['real'])}</div>
    <div class="blk"><h3>Como atuar</h3>
      <ul><li>Responda só o que for perguntado.</li>
      <li>Pergunta fechada: resposta curta. Pergunta aberta e curiosa: vá abrindo, camada por camada.</li>
      <li>Não entregue tudo na primeira resposta. Se perguntarem como você está, diga: {c['resp']}</li></ul></div>
  </div>
</section>"""
html = f"""<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
@page {{ size:A4; margin:0 }}
*{{box-sizing:border-box}} body{{margin:0;font-family:Arial,Helvetica,sans-serif;color:#133A83}}
.page{{width:210mm;height:297mm;padding:9mm 13mm;page-break-after:always;display:flex;flex-direction:column;gap:7px}}
header{{background:#EEEEEE;border-radius:8px;padding:6px 14px;display:flex;justify-content:space-between;align-items:center}}
header img{{height:32px}} .ttl{{font-family:Georgia,serif;font-size:21px;color:#EC6A0B}}
.card{{border-radius:10px;padding:10px 14px;flex:1}}
.lider{{background:#fff;border:2px solid #EC6A0B}} .pessoa{{background:#EEEEEE}}
.tag{{font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:#EC6A0B;font-weight:bold}}
h1{{font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:2px 0 5px;color:#133A83}}
h1 span{{font-family:Arial,sans-serif;font-size:13px;font-style:italic;margin-left:8px}}
.blk{{margin-bottom:9px}} h3{{margin:0 0 3px;font-size:14px;color:#EC6A0B}} h3 em{{color:#133A83;font-weight:normal}}
ul{{margin:0;padding-left:18px;font-size:14px;line-height:1.45}} li{{margin-bottom:4px}}
p{{margin:0;font-size:14px;line-height:1.45}} .nota{{font-size:12px;color:#334;margin-top:6px;border-top:1px dashed #9aa5b8;padding-top:5px}}
.cut{{text-align:center;font-size:9.5px;color:#778;border-top:1.5px dashed #9aa5b8;padding-top:3px}}
</style><body>{pages}</body></html>"""
open(sys.argv[1],"w").write(html)
