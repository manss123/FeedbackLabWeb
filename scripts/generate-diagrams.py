"""Generate offline, editable SVG diagrams and matching high-resolution PNGs.
Run: python scripts/generate-diagrams.py. Only Pillow is required.
"""
from pathlib import Path
from html import escape
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, LINE = "#163340", "#526875", "#647d88"
COLORS = {"current": ("#eff8f5", "#31816e"), "local": ("#fff6e5", "#b78528"), "external": ("#eff4fc", "#587cac"), "planned": ("#faf1f7", "#9c6184")}
FONT = Path("C:/Windows/Fonts/segoeui.ttf")
BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")

class Figure:
    def __init__(self, name, title, subtitle, width=1400, height=950):
        self.name, self.title, self.w, self.h = name, title, width, height
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(subtitle)}</desc><rect width="100%" height="100%" fill="white"/>']
        self.im = Image.new("RGB", (width*2, height*2), "white")
        self.draw = ImageDraw.Draw(self.im)
        self.nodes, self.edges = [], []
        self.text(55, 55, title, 30, True)
        self.text(55, 89, subtitle, 16, color=MUTED)
        self.line([(55, 112), (width-55, 112)], "#dbe5e9", 1)

    def text(self, x, y, value, size=17, bold=False, color=INK, center=False):
        font = ImageFont.truetype(str(BOLD if bold else FONT), size*2)
        width = self.draw.textlength(value, font=font)/2
        assert x-width/2 >= 0 if center else x >= 0
        assert (x+width/2 if center else x+width) <= self.w, (self.name, value)
        self.svg.append(f'<text x="{x}" y="{y}" font-family="Segoe UI,Arial,sans-serif" font-size="{size}" font-weight="{600 if bold else 400}" fill="{color}" text-anchor="{"middle" if center else "start"}">{escape(value)}</text>')
        self.draw.text(((x-width/2 if center else x)*2, y*2), value, font=font, fill=color, anchor="ls")

    def line(self, points, color=LINE, width=2, dashed=False, arrow=False):
        pts = " ".join(f"{x},{y}" for x,y in points)
        self.svg.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}"{chr(32)+"stroke-dasharray="+chr(34)+"7 5"+chr(34) if dashed else ""}/>')
        for (x1,y1),(x2,y2) in zip(points,points[1:]):
            length = math.hypot(x2-x1,y2-y1)
            if dashed and length:
                for start in range(0, math.ceil(length), 12):
                    end=min(start+7,length)
                    self.draw.line([(2*(x1+(x2-x1)*start/length),2*(y1+(y2-y1)*start/length)),(2*(x1+(x2-x1)*end/length),2*(y1+(y2-y1)*end/length))], fill=color, width=width*2)
            else: self.draw.line([(x1*2,y1*2),(x2*2,y2*2)], fill=color, width=width*2)
        if arrow:
            x,y=points[-1]; px,py=points[-2]; a=math.atan2(y-py,x-px)
            tri=[(x,y),(x-11*math.cos(a-.45),y-11*math.sin(a-.45)),(x-11*math.cos(a+.45),y-11*math.sin(a+.45))]
            self.svg.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in tri)}" fill="{color}"/>')
            self.draw.polygon([(a*2,b*2) for a,b in tri], fill=color)

    def box(self, id, x, y, w, h, title, lines=(), kind="current", ellipse=False):
        fill,stroke=COLORS[kind]
        assert y+h < self.h-65
        self.nodes.append((id,title,list(lines),kind,ellipse))
        if ellipse:
            self.svg.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
            self.draw.ellipse((x*2,y*2,(x+w)*2,(y+h)*2), fill=fill,outline=stroke,width=4)
        else:
            self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"{" stroke-dasharray="+chr(34)+"7 5"+chr(34) if kind=="planned" else ""}/>')
            self.draw.rounded_rectangle((x*2,y*2,(x+w)*2,(y+h)*2),radius=24,fill=fill,outline=stroke,width=4)
        self.text(x+w/2,y+32,title,19,True,center=True)
        for i,line in enumerate(lines):
            assert 60+i*25 < h, (id,line,h)
            self.text(x+w/2,y+60+i*25,line,16,center=True,color=MUTED)

    def edge(self, a, b, points, label="", at=None, dashed=False, arrow=True):
        self.edges.append((a,b,label,dashed,arrow))
        self.line(points,dashed=dashed,arrow=arrow)
        if label and at: self.text(*at,label,14,color=MUTED)

    def note(self, y, lines):
        for i,line in enumerate(lines): self.text(55,y+i*25,line,16,color=MUTED)

    def save(self):
        self.text(55,self.h-28,"FeedbackLab  |  Source-based model  |  17 September 2026",13,color=MUTED)
        self.svg.append('</svg>')
        (OUT/f"{self.name}.svg").write_text("\n".join(self.svg),encoding="utf8")
        self.im.save(OUT/f"{self.name}.png")
        m=["flowchart TB"]
        for id,title,lines,kind,ellipse in self.nodes:
            label="<br/>".join([title,*lines]).replace('"',"'")
            m.append(f'  {id}{"([" if ellipse else "["}"{label}"{"])" if ellipse else "]"}')
        for a,b,label,dashed,arrow in self.edges:
            conn="-.->" if dashed else "-->" if arrow else "---"
            m.append(f'  {a} {conn}{f"|{json.dumps(label)}|" if label else ""} {b}')
        for kind,(fill,stroke) in COLORS.items():
            m.append(f'  classDef {kind} fill:{fill},stroke:{stroke},color:{INK}'+(',stroke-dasharray:7 5' if kind=="planned" else ''))
            ids=[n[0] for n in self.nodes if n[3]==kind]
            if ids: m.append(f'  class {",".join(ids)} {kind}')
        (OUT/f"{self.name}.mmd").write_text("\n".join(m)+"\n",encoding="utf8")
        return self

figures=[]
f=Figure("01-system-architecture","01  System Architecture","Implemented access paths; current local persistence and external service boundaries.",1400,1040)
f.box("browser",60,160,330,115,"Lecturer browser",["React / TanStack Start","Firebase client SDK"])
f.box("auth",530,160,330,115,"Firebase Authentication",["Google sign-in","Route guard reads setup status"],"external")
f.box("admin",1010,160,330,115,"Research admin",["Authorized callable requests","Server-side requireAdmin check"])
f.box("hosting",60,365,330,115,"Firebase Hosting",["Web assets and Unity build","SSR rewrite"])
f.box("ssr",530,365,330,115,"SSR / AI server functions",["Nitro / TanStack in Cloud Function","Transcript-based coaching"])
f.box("gemini",1010,365,330,115,"Gemini API",["Real report or null","No fabricated AI result"],"external")
f.box("rules",530,575,330,115,"Firestore Security Rules",["Client: own-data access","Admin SDK: server authorization"])
f.box("db",1010,575,330,115,"Firestore",["users / sessions / activity_log","tts_logs for NPC speech service"])
f.box("local",60,575,330,115,"Browser localStorage",["Progress / assessments / survey","Durable activity event queue"],"local")
f.box("unity",60,785,330,115,"Unity WebGL iframe",["Avatar / scene via postMessage","Audio replay stays in memory"])
f.box("research",1010,785,330,115,"Research dashboard",["Participants / VR / activity / timing","CSV, JSON and codebook"])
f.edge("browser","auth",[(390,215),(530,215)],"sign-in",(430,200))
f.edge("browser","hosting",[(225,275),(225,365)],"requests",(235,325))
f.edge("hosting","ssr",[(390,420),(530,420)],"rewrite",(430,405))
f.edge("ssr","gemini",[(860,420),(1010,420)],"AI request",(900,405))
f.edge("browser","rules",[(390,250),(460,250),(460,630),(530,630)],"own data",(467,540))
f.edge("rules","db",[(860,630),(1010,630)],"allowed",(900,614))
f.edge("browser","local",[(100,275),(100,320),(30,320),(30,630),(60,630)])
f.edge("browser","unity",[(65,275),(15,275),(15,840),(60,840)])
f.edge("admin","db",[(1340,215),(1370,215),(1370,630),(1340,630)],"Admin SDK",(1210,540))
f.edge("db","research",[(1175,690),(1175,785)],"authorized reads",(1190,745))
f.note(945,["Amber = local persistence. Pre/post Firestore result submission is planned; telemetry timestamps already use Firestore.","Unity TTS caller internals are not verified in this checkout. Learner recordings are not uploaded."])
figures.append(f.save())

f=Figure("02-system-framework","02  System Framework","Intended learning sequence with implemented research observation; prerequisites are not all server-enforced.",1400,990)
f.box("entry",55,160,350,110,"Participant setup",["Google sign-in / consent / profile"])
f.box("pre",525,160,350,110,"Baseline assessment",["Current result store: localStorage"],"local")
f.box("modules",995,160,350,110,"5E learning modules",["Engage / Explore / Explain","Elaborate / Evaluate"])
f.box("ce",995,350,350,115,"1  Concrete experience",["Observe scenario","Speak / transcribe / type feedback"])
f.box("ro",525,350,350,115,"2  Reflective observation",["Replay temporary audio","Self-rate and reflect"])
f.box("ac",55,350,350,115,"3  Abstract conceptualization",["Real AI coaching if available","Choose improvement goals"])
f.box("ae",55,550,350,110,"4  Active experimentation",["Try again / compare available results"])
f.box("post",525,550,350,110,"Post-assessment and survey",["Current result store: localStorage"],"local")
f.box("summary",995,550,350,110,"Progress / score summary",["Certificate issuance is planned"])
f.box("observe",310,780,780,105,"Research observation across the learning journey",["VR stages + immutable activity + timed steps + web-session intervals"])
for a,b,pts in [("entry","pre",[(405,215),(525,215)]),("pre","modules",[(875,215),(995,215)]),("modules","ce",[(1170,270),(1170,350)]),("ce","ro",[(995,405),(875,405)]),("ro","ac",[(525,405),(405,405)]),("ac","ae",[(230,465),(230,550)]),("ae","post",[(405,605),(525,605)]),("post","summary",[(875,605),(995,605)])]: f.edge(a,b,pts)
f.edge("ae","ce",[(230,660),(230,715),(1370,715),(1370,405),(1345,405)],"next scenario / practice",(560,705))
f.edge("post","observe",[(700,660),(700,780)],"timing events",(710,752),dashed=True)
f.note(929,["Module 1 has detailed activities; Modules 2-5 still contain placeholder content. Missing AI output remains unavailable."])
figures.append(f.save())

f=Figure("03-logical-erd","03  Logical ERD / Firestore Document Model","Collections and embedded fields, not SQL tables. Dashed relationships are optional logical references.",1400,1150)
f.box("users",55,165,365,255,"users / {uid}",["Document ID: Firebase UID","profile: map","consent: map","Other declared result/progress maps:","not yet fully persisted in Firestore"])
f.box("sessions",535,165,370,300,"sessions / {sessionId}",["userId / scenarioId","createdAt: server timestamp","stage1: transcript / duration / times","stage2: self-ratings / reflection","stage3: nullable AI scores / goals","stage4: round two / nullable AI scores"])
f.box("activity",535,575,370,450,"activity_log / {eventId}",["eventId / userId / type / schemaVersion","createdAt: server receipt timestamp","occurredAt: client event time","browserId / tabId / webSessionId","authTime / deviceCategory / browserFamily","runId / stepVisitId / pageVisitId","moduleId / scenarioId / sessionId","stepId / assessmentId / path / reason","startedAtClient / endedAtClient","elapsed / visible / active seconds","unobservedSeconds / visibility / idle"])
f.box("tts",1020,165,325,205,"tts_logs / {logId}",["uid: Firebase UID or anonymous","textLength / voiceName / modelName","createdAt: server timestamp"],"external")
f.box("concept",55,575,365,250,"Event grouping fields",["browserId: browser storage identity","webSessionId: authenticated document","runId: learning / assessment attempt","stepVisitId: repeated step visit","These are NOT separate collections."],"local")
f.box("static",1020,575,325,180,"Static source definitions",["Module IDs / scenario IDs","Defined in application source","No enforced foreign keys"],"local")
f.edge("users","sessions",[(420,280),(535,280)],"0..1 to 0..N",(427,260),dashed=True)
f.edge("users","activity",[(235,420),(235,510),(475,510),(475,710),(535,710)],"UID reference",(265,496),dashed=True)
f.edge("sessions","activity",[(720,465),(720,575)],"optional sessionId",(737,530),dashed=True)
f.edge("concept","activity",[(420,815),(535,815)],"group by",(435,800),dashed=True,arrow=False)
f.note(1070,["users may be partial or absent while events/sessions exist. tts_logs may be anonymous and is deliberately unlinked.","Audio files are not stored. A VR session contains both rounds; full retry score history is not a separate entity."])
figures.append(f.save())

f=Figure("04-user-use-cases","04  User Use Cases","Actor associations and current user capabilities; planned certificate issuance is explicitly separated.",1400,1060)
f.box("lecturer",50,175,250,100,"University lecturer",["Participant actor"],"external")
f.box("admin",1100,175,250,100,"Research administrator",["Authorized admin actor"],"external")
left=[("login","Sign in and complete setup",["Google / consent / profile"]),("learn","Study and take assessments",["Modules / pretest / posttest"]),("practice","Practice with Unity avatar",["Speech or manually entered feedback"]),("reflect","Review and improve feedback",["Local audio / reflection / AI coaching"]),("progress","View progress and submit survey",["Current scores and eligibility"])]
for i,(id,title,lines) in enumerate(left):
    y=165+i*155; f.box(id,385,y,440,110,title,lines,ellipse=True)
    f.edge("lecturer",id,[(300,225),(340,225),(340,y+55),(385,y+55)],arrow=False)
right=[("review","Review research records",["Participant / learning / activity"]),("usage","Inspect session and timing data",["Observed overlaps / step durations"]),("export","Export filtered datasets",["CSV / JSON / codebook"])]
for i,(id,title,lines) in enumerate(right):
    y=365+i*180; f.box(id,925,y,420,110,title,lines,ellipse=True)
    f.edge("admin",id,[(1225,275),(1370,275),(1370,y+55),(1345,y+55)],arrow=False)
f.box("certificate",925,905,420,80,"Issue certificate [PLANNED]",[],"planned",ellipse=True)
f.edge("lecturer","certificate",[(175,275),(175,945),(925,945)],dashed=True,arrow=False)
f.note(1010,["Passive telemetry is a supporting system function, not an action the lecturer must perform. No audio-upload use case."])
figures.append(f.save())

f=Figure("05-usage-session-flow","05  Usage Logging and Concurrent Sessions","Implemented event pipeline and research interpretation, including offline retry and account isolation.",1400,1070)
f.box("a",55,160,370,120,"Browser A / Tab 1",["Participant UID + random browserId","Unique document webSessionId"])
f.box("b",515,160,370,120,"Browser A / Tab 2",["Same browserId for same account","Different tabId and webSessionId"])
f.box("c",975,160,370,120,"Browser B / another device",["Different browser storage identity","Physical hardware is not verified"])
f.box("track",330,375,740,120,"Capture observations and measured intervals",["Page visits / step visits / assessments / focus / visibility / idle","30-second heartbeat; client time plus monotonic durations"])
f.box("queue",55,610,370,130,"Durable per-event queue",["Stable event ID and original UID","Retry only under the same account","localStorage; memory if unavailable"],"local")
f.box("store",515,610,370,130,"Immutable Firestore event",["Server createdAt on first write","Existing event ID verifies delivery","No duplicated retry record"])
f.box("analysis",975,610,370,130,"Research analysis",["Group by user + webSessionId","Compare bounded heartbeat intervals","Same-browser / other-browser peers"])
for a,x in [("a",240),("b",700),("c",1160)]: f.edge(a,"track",[(x,280),(x,325),(700,325),(700,375)])
f.edge("track","queue",[(330,435),(240,435),(240,610)],"queue before network send",(65,535))
f.edge("queue","store",[(425,675),(515,675)],"retry",(447,660))
f.edge("store","analysis",[(885,675),(975,675)],"admin read",(895,660))
f.box("limits",260,840,880,130,"Interpretation limits",["Active proxy = visible + focused + interaction in the preceding 60 seconds.","Timer gaps over 45 seconds are unobserved, not engagement.","No end event does not prove an open session; cross-device clocks can differ."],"external")
f.edge("analysis","limits",[(1160,740),(1160,805),(700,805),(700,840)])
f.note(1005,["Only positive overlaps of valid heartbeat intervals up to 45 seconds are counted. Historical missing times remain null."])
figures.append(f.save())

# Native Mermaid ERD source accompanies the document-style field layout above.
(OUT/"03-logical-erd.mmd").write_text('''erDiagram
  USERS {
    string uid PK
    map profile
    map consent
  }
  SESSIONS {
    string sessionId PK
    string userId
    string scenarioId
    timestamp createdAt
    map stage1
    map stage2
    map stage3
    map stage4
  }
  ACTIVITY_LOG {
    string eventId PK
    string userId
    string type
    int schemaVersion
    timestamp createdAt
    string occurredAt
    string browserId
    string tabId
    string webSessionId
    string runId
    string stepVisitId
    string pageVisitId
    string sessionId
    string startedAtClient
    string endedAtClient
    float elapsedSeconds
    float visibleSeconds
    float activeSeconds
    float unobservedSeconds
  }
  TTS_LOGS {
    string logId PK
    string uid "or anonymous"
    int textLength
    string voiceName
    string modelName
    timestamp createdAt
  }
  USERS o|..o{ SESSIONS : "logical UID"
  USERS o|..o{ ACTIVITY_LOG : "logical UID"
  SESSIONS o|..o{ ACTIVITY_LOG : "optional sessionId"
''',encoding="utf8")
html=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeedbackLab diagrams</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#eef3f5;color:#163340;margin:32px}main{max-width:1400px;margin:auto}section{background:white;padding:20px;margin:24px 0;border-radius:16px}img{width:100%;height:auto}a{color:#236b5a;margin-right:20px}@media print{body{margin:0;background:white}section{break-after:page}nav{display:none}}</style><main><h1>FeedbackLab — System diagrams</h1><p>Source-based model · 17 September 2026 · SVG / PNG / editable Mermaid. Current implementation is distinct from planned features.</p>']
for f in figures:
    html.append(f'<section><h2>{escape(f.title)}</h2><nav><a href="{f.name}.svg">SVG</a><a href="{f.name}.png">PNG (2x)</a><a href="{f.name}.mmd">Mermaid source</a></nav><img src="{f.name}.svg" alt="{escape(f.title)}"></section>')
html.append('</main></html>')
(OUT/"index.html").write_text('\n'.join(html),encoding="utf8")
print(f"Generated {len(figures)} diagrams: SVG, 2x PNG, Mermaid; offline gallery at {OUT / 'index.html'}")
