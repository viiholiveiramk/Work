import sys
cases = [
 dict(n=1, quem="Nathan",
  hist="Você é responsável por uma loja. O Nathan é apoio nível 1 há 11 meses. Há 3 meses, ele te disse que queria ser consultor, e você respondeu: \"vou olhar isso\". Desde então, vocês não voltaram ao assunto. Ele abre a loja todo dia sem ninguém pedir. Esta semana, atendeu um pintor sozinho e fechou a venda, mas errou o rendimento da tinta, e o cliente voltou para reclamar. Um consultor comentou com você que o Nathan \"se acha pronto\". Outro colega contou que ele pergunta, quase toda semana, quando vai ser promovido. A você, ele nunca perguntou.",
  real=["Ninguém nunca mostrou a ele o caminho de nível, e ele nunca fez uma autoavaliação.",
        "Soube, pelos colegas, que um consultor vai sair e a vaga vai abrir. Quer essa vaga.",
        "Errou o rendimento porque nunca aprendeu a calcular. Não perguntou a ninguém por medo de parecer despreparado.",
        "Pergunta aos colegas, e não ao responsável, porque acha que o responsável já decidiu que ele não está pronto."],
  resp="\"Tô bem, tô só focado no trabalho.\""),
 dict(n=2, quem="Larissa",
  hist="Você é responsável por uma loja. A Larissa é apoio há 8 meses e, toda semana, repete que não tem tempo. Nas últimas semanas, ficou 3 vezes até 40 minutos depois do horário e entregou o relatório de ruptura atrasado 2 vezes. Ela faz a conferência, ajuda no balcão e faz a limpeza do estoque. Nunca pediu ajuda a ninguém. Um colega disse que ela \"não deixa ninguém ajudar\". No mês passado, na reunião da equipe, você a elogiou na frente de todos pelo capricho.",
  real=["Acha que pedir ajuda é parecer incapaz.",
        "Ninguém definiu o que é prioridade, então ela tenta fazer tudo igual e tudo ao mesmo tempo.",
        "Quer mostrar que dá conta para subir ao nível 1. O elogio na reunião a fez sentir que está no caminho certo, e por isso não quer errar.",
        "Está cansada, mas não vai dizer isso de primeira."],
  resp="\"Tá tudo bem, é só a correria do mês.\""),
 dict(n=3, quem="Gabriel",
  hist="Você é responsável por uma loja onde o Gabriel, de 16 anos, entrou há 6 semanas. Os 3 primeiros dias da integração aconteceram. Os dias 4, 5 e 6 ficaram para depois porque a loja estava cheia, e até hoje não aconteceram. A apresentação dele ao gestor também não aconteceu. Ele chega no horário, atende bem quando é chamado e, quando não tem cliente, fica no celular. Na semana passada, um colega ouviu o Gabriel perguntar: \"é sempre assim?\". Você não sabe a que ele se referia.",
  real=["\"É sempre assim?\" era sobre a loja cheia e sobre ninguém conversar com ele. Esperava mais treinamento.",
        "Não sabe o que esperam dele nem como crescer na Tintomax. Ninguém contou.",
        "Fica no celular porque ninguém disse o que fazer quando não tem cliente.",
        "Já pensou em procurar outro lugar, mas ainda prefere ficar se alguém falar com ele."],
  resp="\"Tá tranquilo, tô me adaptando.\""),
]
def ul(xs): return "<ul>" + "".join(f"<li>{x}</li>" for x in xs) + "</ul>"
pages = ""
for c in cases:
    pages += f"""
<section class="page">
  <header><img src="logo.png" alt="Tintomax"><div class="ttl">Acompanhamento na prática</div></header>
  <div class="card lider">
    <div class="tag">Rodada {c['n']} · Card do líder (quem faz o acompanhamento)</div>
    <h1>Situação</h1>
    <p class="story">{c['hist']}</p>
    <div class="int"><b>Antes de começar:</b> o que eu quero que mude depois dessa conversa?<div class="ln"></div><div class="ln"></div></div>
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
p{{margin:0;font-size:14px;line-height:1.45}} .story{{font-size:15.5px;line-height:1.6;margin:6px 0 8px}} .nota{{font-size:12px;color:#334;margin-top:6px;border-top:1px dashed #9aa5b8;padding-top:5px}}
.int{{font-size:13px;margin:12px 0 6px}} .int .ln{{border-bottom:1px solid #9aa5b8;height:26px}}
.cut{{text-align:center;font-size:9.5px;color:#778;border-top:1.5px dashed #9aa5b8;padding-top:3px}}
</style><body>{pages}</body></html>"""
open(sys.argv[1],"w").write(html)
