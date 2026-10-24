import re, json, html, sys
from html.parser import HTMLParser
# 원본 사이트 응답(tools/fetch.sh 가 raw/ 에 저장)을 읽어 data/data.json 을 만든다.
# 사용: python3 -I tools/parse.py  (futsal-redesign 폴더에서 실행)
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=os.path.join(ROOT,'raw')+os.sep
def clean(s): return re.sub(r'\s+',' ',html.unescape(s).replace('\ufeff','')).strip()
class Rows(HTMLParser):
    """Collect rows of the outermost table; nested table cells are flattened into the parent cell."""
    def __init__(s):
        super().__init__(); s.rows=[]; s.depth=0; s.cur=None; s.cell=None
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=='table': s.depth+=1
        if s.depth==1 and t=='tr': s.cur=[]
        if s.depth==1 and t in('td','th'): s.cell={'text':'','th':t=='th','img':None,'href':None}
        if t=='img' and s.cell is not None: s.cell['img']=a.get('src','')
        if t=='a' and s.cell is not None: s.cell['href']=a.get('href','')
        if t=='td' and s.depth>1 and s.cell is not None: s.cell['text']+=' | '
    def handle_endtag(s,t):
        if s.depth==1 and t in('td','th') and s.cell is not None:
            s.cell['text']=clean(s.cell['text']); s.cur.append(s.cell); s.cell=None
        if s.depth==1 and t=='tr' and s.cur is not None:
            if s.cur: s.rows.append(s.cur)
            s.cur=None
        if t=='table': s.depth-=1
    def handle_data(s,d):
        if s.cell is not None: s.cell['text']+=d
def rows(h):
    p=Rows(); p.feed(h); return p.rows
def rank(c):
    m=re.search(r're_rank(\d+)',c['img'] or '')
    return int(m.group(1)) if m else int(c['text']) if c['text'].isdigit() else None
def num(x):
    try: return float(x) if '.' in x else int(x)
    except: return x
def stat_table(h, ranked=True):
    out=[]; r=rows(h)
    head=[c['text'] for c in r[0]]
    for row in r[1:]:
        if len(row)!=len(head): continue
        d={}
        for k,c in zip(head,row): d[k]=rank(c) if k=='순위' else num(c['text'])
        out.append(d)
    return {'columns':head,'rows':out}
def rec(href):
    m=re.search(r"getrecord\('([^']*)','([^']*)','([^']*)','([^']*)','([^']*)'\)",href or '')
    return 'gameLeagueRecord.action?club1_id=%s&club2_id=%s&league_seq=%s&league_type=%s&game_number=%s'%m.groups() if m else None
def plan(h):
    out=[]
    for row in rows(h)[1:]:
        if len(row)<3: continue
        parts=[p.strip() for p in row[1]['text'].split('|') if p.strip()]
        teams=[p for p in parts if p!='vs']
        out.append({'date':row[0]['text'],'home':teams[0] if teams else '','away':teams[1] if len(teams)>1 else '','score':row[2]['text'],'record':rec(row[2]['href'])})
    return out
start=open(S+'start.html',encoding='utf-8').read()
def section(html_, idattr):
    i=html_.find(idattr); j=html_.find('<table',i); 
    # end at closing of that outer table
    depth=0; k=j
    for m in re.finditer(r'</?table',html_[j:]):
        depth+= 1 if m.group()=='<table' else -1
        if depth==0: k=j+m.end()+1; break
    return html_[j:k]
D={}
leagues=[]
for seq in ('113','114','115'):
    t=json.load(open(S+f't_{seq}.json',encoding='utf-8'))
    leagues.append({'seq':seq,'name':t['league_name'],
        'plan':plan(open(S+f'Plan_{seq}.html',encoding='utf-8').read()),
        'goal':stat_table(open(S+f'Goal_{seq}.html',encoding='utf-8').read()),
        'foul':stat_table(open(S+f'Foul_{seq}.html',encoding='utf-8').read()),
        'red':stat_table(open(S+f'Red_{seq}.html',encoding='utf-8').read()),
        'rank':stat_table(open(S+f'Rank_{seq}.html',encoding='utf-8').read())})
D['leagues']=leagues
D['players']={'남자부':stat_table(section(start,'id="allLeagueList"')),
              '여자부':stat_table(open(S+'players_w.html',encoding='utf-8').read())}
news=[]
for i in (1,2,3):
    n=json.load(open(S+f'news_{i}.json',encoding='utf-8'))
    news.append({k:n[k] for k in('b_seq','b_title','b_date','b_name','b_mainfile2')})
D['news']=news
def board(board_id):
    items=re.findall(r"readBoard\('(\d+)','(\d+)'\)\"[^>]*>(.*?)</a>\s*<span>(\d{4}-\d{2}-\d{2})</span>",start,re.S)
    return [{'seq':a,'board':b,'title':clean(t),'date':d} for a,b,t,d in items if b==board_id]
D['notices']=board('00'); D['contestNews']=board('03')
games=[]
for seq,title,period,place in re.findall(r"leagueRead\('(\d+)'\).*?<span>(.*?)</span>.*?대회기간 :</b>(.*?)</li>.*?대회장소 :</b>(.*?)</li>",start,re.S):
    games.append({'seq':seq,'title':clean(title),'period':clean(period),'place':clean(place)})
D['competitions']=games
D['photos']=re.findall(r"photo_setting\('B',(\d+)\)\"><img src=\"(/FutsalUnite/upload/photo/[^\"]+)\"",start)
json.dump(D,open(os.path.join(ROOT,'data','data.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print({k:(len(v) if isinstance(v,list) else {kk:len(vv['rows']) for kk,vv in v.items()}) for k,v in D.items()})
for L in leagues: print(L['name'],len(L['plan']),len(L['goal']['rows']),len(L['foul']['rows']),len(L['red']['rows']),len(L['rank']['rows']), L['rank']['columns'])
print(D['notices'][:2],D['contestNews'][:1],D['competitions'],D['photos'],sep='\n')
print(D['players']['남자부']['rows'][:2],D['players']['여자부']['rows'][:4])
print(leagues[0]['plan'][-3:])
