import json,re,copy
d=json.load(open('smart contract.pen'))
ids={}
def index(n):
    ids[n['id']]=n
    for c in n.get('children',[]) or []: index(c)
for c in d['children']: index(c)
KEYS=['layout','width','height','gap','padding','fill','cornerRadius','stroke','fontSize','fontWeight','justifyContent','alignItems','icon','opacity','enabled']
def fmt(v):
    if isinstance(v,(dict,list)): return json.dumps(v,ensure_ascii=False,separators=(',',':'))
    return str(v)
def apply(node,desc):
    for k,ov in desc.items():
        path=k.split('/')
        tgt=node
        for p in path:
            nxt=None
            def f(n):
                nonlocal nxt
                if nxt: return
                if n.get('id')==p: nxt=n;return
                for c in n.get('children',[]) or []: f(c)
            for c in tgt.get('children',[]) or []: f(c)
            tgt=nxt
            if tgt is None: break
        if tgt is None: continue
        if 'type' in ov and ov.get('type')!='ref' and 'children' in ov:
            tgt.clear(); tgt.update(ov)
        else: tgt.update(ov)
def resolve(n):
    if n.get('type')!='ref': return n
    comp=copy.deepcopy(ids.get(n['ref'],{}))
    comp=resolve(comp)
    apply(comp,n.get('descendants',{}))
    for k,v in n.items():
        if k not in ('descendants','ref','type','id'): comp[k]=v
    comp['_comp']=ids.get(n['ref'],{}).get('name','?')
    return comp
def walk(n,depth,out):
    if n.get('enabled') is False: return
    n=resolve(n)
    t=n.get('type')
    props=' '.join(f"{k}={fmt(n[k])}" for k in KEYS if k in n and k!='enabled')
    label=n.get('content') if t=='text' else (n.get('iconFontName') if t=='icon_font' else n.get('name',''))
    if isinstance(label,list): label=json.dumps(label,ensure_ascii=False)
    c=f" <{n['_comp']}>" if '_comp' in n else ''
    out.append('  '*depth+f"[{t}]{c} {label!s}  {{{props}}}")
    for ch in n.get('children',[]) or []: walk(ch,depth+1,out)
import os
os.makedirs('design/outlines',exist_ok=True)
for c in d['children']:
    out=[]; walk(c,0,out)
    fn=re.sub(r'[^\w\-]+','_',c['name'])
    open(f'design/outlines/{fn}.txt','w').write('\n'.join(out))
