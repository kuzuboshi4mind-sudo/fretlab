#!/usr/bin/env python3
"""日本語版の index.html から英語版（en/index.html）を作る。歌詞（SONGS の lines）はそのまま。"""
import sys,os,re,runpy,glob
sys.path.insert(0,os.path.dirname(__file__))
from i18n_extract import spans
D=os.path.join(os.path.dirname(__file__),'i18n')
T={}; FRAG={}
for f in sorted(glob.glob(os.path.join(D,'en_*.py'))):
    m=runpy.run_path(f); T.update(m.get('T',{})); FRAG.update(m.get('FRAG',{}))
KEYS=sorted([k for k in T if len(k)>=6],key=len,reverse=True)
FK=sorted(FRAG,key=len,reverse=True)
JP=re.compile(r'[ぁ-んァ-ヶ一-龯々〜]')
def sub_all(t):
    for k in KEYS:
        if k in t: t=t.replace(k,T[k])
    for k in FK:
        if k in t: t=t.replace(k,FRAG[k])
    return t
def esc(new,kind,delim):
    if kind=='attr': return new.replace('"','&quot;')
    if kind=='js' and delim in '\'"':
        new=re.sub(r'(?<!\\)'+re.escape(delim),'\\\\'+delim,new)
    return new
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
sp=sorted(spans(s),key=lambda x:x[0],reverse=True)
left=set()
for a,b,kind,txt in sp:
    new=T[txt] if txt in T else sub_all(txt)
    if JP.search(new): left.add(new[:60])
    s=s[:a]+esc(new,kind,s[a-1])+s[b:]
s=s.replace("const APP_LANG='ja';","const APP_LANG='en';",1)
s=s.replace('<html lang="ja">','<html lang="en">',1)
s=s.replace('<head>','<head><base href="../">',1)
os.makedirs(os.path.dirname(dst),exist_ok=True)
open(dst,'w',encoding='utf-8').write(s)
print('en build:',len(sp),'spans,',len(left),'with Japanese left')
for x in sorted(left)[:40]: print('  left:',x)
