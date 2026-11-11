#!/usr/bin/env python3
"""fretlab.html から日本語の文字列を取り出す（英語版を作るため）。歌詞（SONGS の lines）は除く。"""
import re,json,sys
JP=re.compile(r'[ぁ-んァ-ヶ一-龯々〜]')
def spans(s):
    """(start,end,kind,text) の一覧。kind: js / html / attr"""
    out=[]
    # scripts
    for m in re.finditer(r'(<script(?:\s[^>]*)?>)(.*?)(</script>)',s,re.S):
        base=m.start(2); js=m.group(2)
        # 歌詞の範囲（lines:[ ... ]）
        skip=[(x.start(),x.end()) for x in re.finditer(r'lines:\[(?:\s*(?:\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*")\s*,?)*\s*\]',js)]
        i=0;n=len(js)
        while i<n:
            c=js[i]
            if c=='/' and i+1<n and js[i+1]=='*': j=js.find('*/',i+2); i=n if j<0 else j+2; continue
            if c=='/' and i+1<n and js[i+1]=='/' and (i==0 or js[i-1] not in ':\\'):
                j=js.find('\n',i); i=n if j<0 else j; continue
            if c in '\'"`':
                j=i+1
                while j<n and js[j]!=c:
                    if js[j]=='\\': j+=2; continue
                    if c!='`' and js[j]=='\n': break
                    j+=1
                txt=js[i+1:j]
                if JP.search(txt) and not any(a<=i<b for a,b in skip): out.append((base+i+1,base+j,'js',txt))
                i=j+1; continue
            if c=='/' :  # 正規表現リテラルを飛ばす（直前が演算子・括弧・カンマなど）
                k=i-1
                while k>=0 and js[k] in ' \t': k-=1
                if k<0 or js[k] in '(,=:[!&|?{};+-*%<>~^\n':
                    j=i+1; inc=False
                    while j<n and js[j]!='\n':
                        if js[j]=='\\': j+=2; continue
                        if js[j]=='[': inc=True
                        elif js[j]==']': inc=False
                        elif js[j]=='/' and not inc: break
                        j+=1
                    i=j+1; continue
            i+=1
    # html outside script/style
    for m in re.finditer(r'<script(?:\s[^>]*)?>.*?</script>|<style.*?</style>|<[^>]+>|[^<]+',s,re.S):
        t=m.group(0)
        if t.startswith('<script') or t.startswith('<style'): continue
        if t.startswith('<'):
            for a in re.finditer(r'\s(aria-label|title|placeholder|alt|content)="([^"]*)"',t):
                if JP.search(a.group(2)): out.append((m.start()+a.start(2),m.start()+a.end(2),'attr',a.group(2)))
        else:
            k=t.strip()
            if JP.search(k):
                st=m.start()+t.index(k); out.append((st,st+len(k),'html',k))
    return out
if __name__=='__main__':
    s=open(sys.argv[1]).read(); sp=spans(s)
    uniq=sorted(set(x[3] for x in sp),key=lambda x:(len(x),x))
    json.dump(uniq,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
    print(len(sp),'spans',len(uniq),'unique',sum(map(len,uniq)),'chars')
