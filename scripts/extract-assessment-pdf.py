import sys, pathlib, json, re
sys.path.insert(0, 'tmp/pdf-tools')
import pymupdf

doc = pymupdf.open(r'C:/Users/User/Downloads/Documents/B Pretest VS Posttest.pdf')
out = pathlib.Path('tmp/pdfs')
out.mkdir(parents=True, exist_ok=True)
items = {}
current = None
for page_no, page in enumerate(doc):
    page.get_pixmap(matrix=pymupdf.Matrix(1, 1)).save(str(out / f'page-{page_no+1}.png'))
    lines = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(s['text'] for s in line['spans']).strip()
            x, y, _, _ = line['bbox']
            lines.append((x, y, text))
    starts = sorted((y, int(t)) for x,y,t in lines if x < 115 and re.fullmatch(r'\d{1,2}', t) and 1 <= int(t) <= 20 and page_no < 7)
    scoring_y = min([y for x,y,t in lines if t == 'Scoring'] or [9999])
    for x,y,t in sorted(lines, key=lambda l: (l[1],l[0])):
        eligible = [(sy,n) for sy,n in starts if sy <= y+1]
        n = eligible[-1][1] if eligible else current
        if n is None or x < 115 or t in ['Question/Answer','Choice','Scoring'] or page_no == 7 or y >= scoring_y:
            continue
        col = 'preQuestion' if x < 213 else 'preChoices' if x < 346 else 'postQuestion' if x < 443 else 'postChoices'
        items.setdefault(n, {}).setdefault(col, []).append(t)
    if starts:
        current = starts[-1][1]
(out/'columns.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
print('Extracted',len(items),'items and rendered',len(doc),'pages')
