"""Render balanced DFD levels 0, 1 and five level-2 decompositions.
Run after source changes: python scripts/generate-dfd.py
Also regenerates the existing figure package, gallery and ZIP.
"""
from pathlib import Path
from html import escape
import runpy
import zipfile
import json
import textwrap

base = runpy.run_path(str(Path(__file__).with_name("generate-diagrams.py")))
Figure, OUT = base["Figure"], base["OUT"]
figures = base["figures"]

# Each tuple is a named data flow, not a control-flow instruction.
# E=external entity, P=process, D=data store.
names = {
 "E1":"Lecturer", "E2":"Research administrator", "E3":"Firebase Auth / Google",
 "E4":"Gemini", "E5":"Speech recognition service", "E6":"Google Cloud TTS",
 "P1":"1.0 Identity and setup", "P2":"2.0 Learning and assessments",
 "P3":"3.0 VR practice and coaching", "P4":"4.0 Usage event persistence",
 "P5":"5.0 Research reporting", "D1":"D1 Firestore users", "D2":"D2 Firestore sessions",
 "D3":"D3 Firestore activity_log", "D4":"D4 Local learner state", "D5":"D5 Temporary audio memory",
 "D6":"D6 Firestore tts_logs", "D7":"D7 Local activity queue",
}
flows = [
 ("E1","P1","Sign-in and setup input"),("E2","P1","Admin sign-in request"),
 ("P1","E1","Setup and route status"),("P1","E2","Identity status"),
 ("P1","E3","Authentication request"),("E3","P1","Authenticated identity"),
 ("P1","D1","Profile and consent"),("D1","P1","Stored setup status"),
 ("P1","P4","Identity milestone events"),
 ("E1","P2","Answers and module actions"),("P2","E1","Learning content and results"),
 ("D4","P2","Local progress and answers"),("P2","D4","Results and progress"),
 ("P2","P4","Learning and assessment timing"),
 ("E1","P3","Speech, text and reflection"),("P3","E1","Scene, playback and coaching"),
 ("P3","E4","Transcript and coaching context"),("E4","P3","AI response or failure"),
 ("P3","E5","Speech recognition input"),("E5","P3","Transcript or recognition error"),
 ("P3","E6","NPC text and voice request"),("E6","P3","NPC audio or service error"),
 ("P3","D2","VR stage records"),("P3","D4","Scenario completion progress"),
 ("P3","D5","Temporary audio blob"),("D5","P3","Local playback audio"),
 ("P3","D6","TTS usage metadata"),("P3","P4","VR step and scenario events"),
 ("E1","P4","Browser lifecycle observations"),("E2","P4","Admin browser observations"),
 ("P4","E1","Activity delivery status"),("P4","E2","Activity delivery status"),
 ("P4","D7","Queued event envelope"),("D7","P4","Pending same-user events"),
 ("P4","D3","Immutable event and server time"),("D3","P4","Existing event for retry check"),
 ("E2","P5","Authorized filters and export request"),("P5","E2","Research views and files"),
 ("D1","P5","Participant records"),("D2","P5","VR session records"),("D3","P5","Activity and timing records"),
]

def boundary(parent):
    return [flow for flow in flows if parent in flow[:2]]

def panel(name,title,subtitle):
    return Figure(name,title,subtitle,1800,1380)

def node(f,id,x,y,title=None,lines=(),w=400,h=110):
    kind="external" if id.startswith("E") else "local" if id.startswith("D") else "current"
    f.box(id,x,y,w,h,title or names[id],lines,kind)
    if id.startswith("D"):
        f.line([(x+12,y+10),(x+w-12,y+10)],"#b78528",1)
        f.line([(x+12,y+h-10),(x+w-12,y+h-10)],"#b78528",1)

def finish(f,semantic_flows=None):
    f.note(1285,["Notation: blue = external entity; green = numbered process; amber/double line = data store.",
                 "Named arrows are data flows. Repeated entity/store identifiers refer to the same logical endpoint."])
    figures.append(f.save())
    if semantic_flows is not None:
        # Use true semantic IDs, including repeated boundary entities, in Mermaid.
        ids=list(dict.fromkeys(n for flow in semantic_flows for n in flow[:2]))
        lines=["flowchart LR"]
        for id in ids:
            title=names.get(id,id)
            label=title.replace('"',"'")
            shape=f'[("{label}")]' if id.startswith("D") else f'(["{label}"])' if id.startswith("P") else f'["{label}"]'
            lines.append(f"  {id}{shape}")
        for a,b,label in semantic_flows: lines.append(f'  {a} -->|"{label}"| {b}')
        (OUT/f"{f.name}.mmd").write_text("\n".join(lines)+"\n",encoding="utf8")

def expanded_figure(filename, title, processes, semantic):
    """Render actual individual DFD endpoints; duplicate stores/entities by ID."""
    process_ids = {p[0] for p in processes}
    rows = []
    cursor = 165
    for pid, label, detail in processes:
        incoming = [(a, text) for a, b, text in semantic if b == pid and a not in process_ids]
        outgoing = [(b, text) for a, b, text in semantic if a == pid and b not in process_ids]
        height = max(len(incoming), len(outgoing), 2) * 108 + 115
        rows.append((pid, label, detail, incoming, outgoing, cursor, height))
        cursor += height
    f = Figure(filename, title, "Named data flows between individual processes, external entities and data stores; repeated IDs denote the same endpoint.", 1800, cursor + 210)
    positions = {}
    for pid, label, detail, incoming, outgoing, y, height in rows:
        cy = y + (height - 60) / 2
        positions[pid] = cy
        node(f, pid, 720, cy-55, title=label, lines=detail, w=360, h=110)
        for side, items, x in [("in", incoming, 40), ("out", outgoing, 1390)]:
            for j, (eid, label) in enumerate(items):
                ey = y + j*108
                # Visual copies retain the semantic identifier in their label.
                display = f"{eid}  {names[eid]}" if eid.startswith("E") else names[eid]
                visual_id = f"{eid}_{pid}_{side}_{j}"
                kind = "external" if eid.startswith("E") else "local" if eid.startswith("D") else "current"
                f.box(visual_id,x,ey,370,82,display,[],kind)
                if eid.startswith("D"):
                    f.line([(x+12,ey+10),(x+358,ey+10)],"#b78528",1)
                    f.line([(x+12,ey+72),(x+358,ey+72)],"#b78528",1)
                port = cy + (j-(len(items)-1)/2)*12
                if side=="in":
                    pts=[(410,ey+41),(575,ey+41),(685,port),(720,port)]
                    tx=430
                else:
                    pts=[(1080,port),(1160,port),(1260,ey+41),(1390,ey+41)]
                    tx=1180
                f.edge(visual_id if side=="in" else pid,pid if side=="in" else visual_id,pts)
                for k,line in enumerate(textwrap.wrap(label,28)):
                    f.text(tx,ey+16+k*17,line,14,color=base["MUTED"])
        f.line([(40,y+height-30),(1760,y+height-30)],"#e3e9ed",1)
    internal = [(a,b,label) for a,b,label in semantic if a in process_ids and b in process_ids]
    for j,(a,b,label) in enumerate(internal):
        ya,yb=positions[a],positions[b]
        ia=list(positions).index(a); ib=list(positions).index(b)
        if ib==ia+1:
            f.edge(a,b,[(900,ya+55),(900,yb-55)])
            for k,line in enumerate(textwrap.wrap(label,30)): f.text(920,ya+91+k*20,line,15,color=base["MUTED"])
        else:
            bus=1095+j*17
            f.edge(a,b,[(1080,ya+35),(bus,ya+35),(bus,yb+35),(1080,yb+35)])
            f.text(1085,ya+62,f"F{j+1}",14,color=base["MUTED"])
            f.text(55,cursor+35+j*22,f"F{j+1}: {names[a]} -> {names[b]}: {label}",14,color=base["MUTED"])
    f.note(cursor+145,["Blue: external entity. Green: process. Amber with double lines: data store. No entity-to-store or store-to-store shortcuts."])
    f.save()
    ids=list(dict.fromkeys(n for flow in semantic for n in flow[:2]))
    m=["flowchart TB"]
    for id in ids:
        label=names.get(id,id)
        shape=f'[("{label}")]' if id.startswith("D") else f'(["{label}"])' if id.startswith("P") else f'["{label}"]'
        m.append(f"  {id}{shape}")
    for a,b,label in semantic: m.append(f'  {a} -->|"{label}"| {b}')
    (OUT/f"{filename}.mmd").write_text("\n".join(m)+"\n",encoding="utf8")
    return f

# Level 0 convention in this package: context diagram, one system process.
f=panel("06-dfd-level-0","06  DFD Level 0 - Context Diagram","System boundary includes the web app, Unity interface, server functions and internal data stores.")
node(f,"P0",665,545,"0  FeedbackLab",["Learning / VR / coaching","Usage observation / research reporting"],470,140)
node(f,"E1",55,320,lines=["Learning participant"])
node(f,"E2",55,865,lines=["Research access and exports"])
node(f,"E3",700,160,lines=["Authentication service"])
node(f,"E4",1345,320,lines=["AI coaching provider"])
node(f,"E5",1345,600,lines=["Browser speech service"])
node(f,"E6",1345,880,lines=["NPC speech synthesis"])
f.edge("E1","P0",[(455,350),(560,350),(560,575),(665,575)],"Inputs / actions / observations",(475,333))
f.edge("P0","E1",[(665,630),(510,630),(510,400),(455,400)],"Content / outcomes / status",(65,485))
f.edge("E2","P0",[(455,900),(580,900),(580,655),(665,655)],"Sign-in / filters / observations",(65,1030))
f.edge("P0","E2",[(790,685),(790,965),(455,965),(455,945)],"Identity / delivery status / research files",(465,990))
f.edge("P0","E3",[(840,545),(840,270)],"Auth request",(705,395))
f.edge("E3","P0",[(970,270),(970,545)],"Identity",(990,395))
for e,y,request,response in [("E4",365,"Transcript + context","AI response / failure"),("E5",650,"Speech input","Transcript / error"),("E6",930,"NPC text + voice","NPC audio / error")]:
    port={"E4":570,"E5":615,"E6":660}[e]
    f.edge("P0",e,[(1135,port),(1210,port),(1210,y-15),(1345,y-15)],request,(1218,y-30))
    f.edge(e,"P0",[(1345,y+30),(1260,y+30),(1260,port+15),(1135,port+15)],response,(1348,y+88))
f.note(1150,["No data stores are shown at context level. Service errors are valid outputs, not fabricated success.",
            "Speech recognition is browser-dependent. TTS is the implemented callable contract; its Unity caller is not verified here."])
context_flows=[]
for a,b,label in flows:
    if a.startswith("E"): context_flows.append((a,"P0",label))
    if b.startswith("E"): context_flows.append(("P0",b,label))
names["P0"]="0 FeedbackLab"
finish(f,context_flows)

# Level 2 has one complete decomposition per parent process. Each boundary
# flow is assigned to exactly one child, then mechanically checked for balance.
specs=[
 ("P1","08-dfd-level-2-identity","Identity and Setup",[
   ("P11","1.1 Authenticate identity",["Google sign-in / restored identity"]),
   ("P12","1.2 Read and save setup",["Profile / consent through client SDK"]),
   ("P13","1.3 Resolve access and log",["Route before rendering setup forms"]),
 ],{"E1>P1":"P11","E2>P1":"P11","P1>E1":"P13","P1>E2":"P13","P1>E3":"P11","E3>P1":"P11","P1>D1":"P12","D1>P1":"P12","P1>P4":"P13"},
 [("P11","P12","Authenticated UID and setup input"),("P12","P13","Stored setup state / read error")]),
 ("P2","09-dfd-level-2-learning","Learning and Assessments",[
   ("P21","2.1 Load learner state",["Read current local progress / drafts"]),
   ("P22","2.2 Process learning input",["Module activities / pre-post / survey"]),
   ("P23","2.3 Save and present results",["Current outcomes persist locally"]),
 ],{"E1>P2":"P22","P2>E1":"P23","D4>P2":"P21","P2>D4":"P23","P2>P4":"P23"},
 [("P21","P22","Progress and draft context"),("P22","P23","Responses, outcome and measured timing")]),
 ("P3","10-dfd-level-2-vr-ai","VR Practice and Coaching",[
   ("P31","3.1 Capture and replay",["Temporary audio / speech / manual text"]),
   ("P32","3.2 Obtain coaching / NPC audio",["Real Gemini / TTS response or error"]),
   ("P33","3.3 Save stages and outcomes",["Reflection / both rounds / stage times"]),
 ],{"E1>P3":"P31","P3>E1":"P33","P3>E4":"P32","E4>P3":"P32","P3>E5":"P31","E5>P3":"P31","P3>E6":"P32","E6>P3":"P32","P3>D2":"P33","P3>D4":"P33","P3>D5":"P31","D5>P3":"P31","P3>D6":"P32","P3>P4":"P33"},
 [("P31","P32","Transcript, scenario context and goals"),("P31","P33","Playback, manual input and reflection"),("P32","P33","Coaching / NPC audio or failure")]),
 ("P4","11-dfd-level-2-logging","Usage Event Persistence",[
   ("P41","4.1 Measure and identify",["Browser / document / run / step IDs"]),
   ("P42","4.2 Queue and retry by UID",["Stable event ID / original client time"]),
   ("P43","4.3 Persist / verify delivery",["Create-only record; retry deduplication"]),
 ],{"P1>P4":"P41","P2>P4":"P41","P3>P4":"P41","E1>P4":"P41","E2>P4":"P41","P4>E1":"P43","P4>E2":"P43","P4>D7":"P42","D7>P4":"P42","P4>D3":"P43","D3>P4":"P43"},
 [("P41","P42","Event envelope with client measurements"),("P42","P43","Pending event owned by current UID"),("P43","P42","Acknowledgement / retained failure")]),
 ("P5","12-dfd-level-2-research","Research Reporting",[
   ("P51","5.1 Authorize and read",["Callable requireAdmin / Admin SDK"]),
   ("P52","5.2 Transform and filter",["Participants / VR / events / timed steps"]),
   ("P53","5.3 Present and export",["Web overlap / CSV / JSON / codebook"]),
 ],{"E2>P5":"P51","P5>E2":"P53","D1>P5":"P51","D2>P5":"P51","D3>P5":"P51"},
 [("P51","P52","Authorized records and filter settings"),("P52","P53","Filtered research rows and metadata")]),
]
manifest={"convention":"Level 0 = context; Level 1 = main processes; Level 2 = each parent decomposition", "level1":flows,"level2":{}}
for parent,filename,title,children,mapping,internal in specs:
    external=[]
    for a,b,label in boundary(parent):
        child=mapping[f"{a}>{b}"]
        external.append((child if a==parent else a,child if b==parent else b,label))
    childids={child[0] for child in children}
    collapsed=[(parent if a in childids else a,parent if b in childids else b,label) for a,b,label in external]
    assert sorted(collapsed)==sorted(boundary(parent)),parent
    manifest["level2"][parent]={"boundary":external,"internal":internal,"balanced":True}
    for id,label,detail in children: names[id]=label
# Render individual endpoint symbols for every level.
replacements = {"07-dfd-level-1": expanded_figure("07-dfd-level-1", "07  DFD Level 1 - Main Processes",
    [(pid,names[pid],[]) for pid in ["P1","P2","P3","P4","P5"]], flows)}
for parent,filename,title,children,mapping,internal in specs:
    semantic=manifest["level2"][parent]["boundary"]+internal
    replacements[filename]=expanded_figure(filename,f"DFD Level 2 - {title}",children,semantic)
figures.extend(replacements.values())
(OUT/"dfd-flow-manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
assert all(a.startswith("P") or b.startswith("P") for a,b,_ in flows)
assert sorted(context_flows)==sorted(
    [(a,"P0",label) if a.startswith("E") else ("P0",b,label)
     for a,b,label in flows if a.startswith("E") or b.startswith("E")])
html=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeedbackLab diagrams</title><style>body{font-family:Segoe UI,Arial;background:#eef3f5;color:#163340;margin:32px}main{max-width:1500px;margin:auto}section{background:white;padding:20px;margin:24px 0;border-radius:16px}img{width:100%;height:auto}a{color:#236b5a;margin-right:20px}@media print{section{break-after:page}nav{display:none}}</style><main><h1>FeedbackLab — System diagrams and DFD Levels 0–2</h1><p>Level 0: context. Level 1: five main processes. Level 2: all five decompositions. ERD is a separate model.</p>']
for f in figures:
    html.append(f'<section><h2>{escape(f.title)}</h2><nav><a href="{f.name}.svg">SVG</a><a href="{f.name}.png">PNG</a><a href="{f.name}.mmd">Mermaid</a></nav><img src="{f.name}.svg" alt="{escape(f.title)}"></section>')
html.append('</main></html>')
(OUT/"index.html").write_text("\n".join(html),encoding="utf8")
with zipfile.ZipFile(OUT.parent/"feedbacklab-diagrams.zip","w",zipfile.ZIP_DEFLATED) as z:
    for path in OUT.iterdir():
        if path.suffix in {".svg",".png",".mmd",".html",".md",".json"} and not path.name.endswith("preview.png"): z.write(path,"diagrams/"+path.name)
print("Generated DFD context, Level 1 and all five Level 2 diagrams; boundary balance checks passed.")
