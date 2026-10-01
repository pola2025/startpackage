"""Rebuild the five offline website previews from their local source files.

Uses only the Python standard library. Run this file from any directory.
"""
from pathlib import Path
import json,re,hashlib

PACKAGE=Path(__file__).resolve().parent
DESIGN=PACKAGE.parent
TYPES={'selection':('1','선택형'),'dialogue':('2','대화형'),'proposal':('5','제안형'),'comparison':('compare','비교형'),'briefing':('brief','브리핑형')}

def form(shared,key):
 f=shared['base_form'].replace('<form id="consult-form">',f'<form id="{key}-contact-form" class="inline-contact-form" data-inline-contact-form="{key}">')
 f=re.sub(r'\bid="(?!'+re.escape(key)+r'-)([^\"]+)"',lambda m:'id="'+key+'-'+m[1]+'"',f)
 f=re.sub(r'\bfor="([^\"]+)"',lambda m:'for="'+key+'-'+m[1]+'"',f)
 return f.replace(f'id="{key}-form-result"',f'id="{key}-form-result" data-inline-result="{key}"')

def body(part,key,shared,visible,initial_page='home'):
 result=part['html']
 if '__BRIEFING_PREPARATION_PAGE__' in result:result=result.replace('__BRIEFING_PREPARATION_PAGE__',(PACKAGE/'briefing/preparation-page.html').read_text(encoding='utf-8'))
 tag=re.search(r'<section\b[^>]*\bid="concept-'+re.escape(key)+r'"[^>]*>',result).group(0)
 normalized=re.sub(r'\s+hidden(?:="hidden")?(?=[\s>])','',tag)
 if not visible:normalized=normalized[:-1]+' hidden>'
 normalized=re.sub(r'\sdata-initial-page="[^"]*"','',normalized)
 normalized=normalized[:-1]+f' data-initial-page="{initial_page}">'
 result=result.replace(tag,normalized,1)
 result=re.sub(r'(<(?:section|div)\b[^>]*\bdata-site-page="([^"]+)"[^>]*>)',lambda m:re.sub(r'\s+hidden(?:="hidden")?(?=[\s>])','',m[1])[:-1]+('>' if m[2]==initial_page else ' hidden>'),result)
 result=re.sub(r'<div data-inline-form="([^\"]+)"></div>',lambda m:f'<div data-inline-form="{m[1]}">'+form(shared,m[1])+'</div>',result)
 return '\n'.join(line.rstrip() for line in result.split('\n'))

def document(title,css,content,js):
 result='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'</style></head><body>'+content+'<script>'+js+'</script></body></html>'
 assert '\u2197' not in result and '\u279a' not in result
 return '\n'.join(line.rstrip() for line in result.split('\n'))

def build():
 shared=json.loads((PACKAGE/'shared.json').read_text(encoding='utf-8'))
 parts={name:json.loads((PACKAGE/name/'source.json').read_text(encoding='utf-8')) for name in TYPES}
 detail_css=(PACKAGE/'detail-ui.css').read_text(encoding='utf-8')+(PACKAGE/'distinct-detail-views.css').read_text(encoding='utf-8')+(PACKAGE/'proposal/proposal-detail.css').read_text(encoding='utf-8')+(PACKAGE/'dialogue/process-page.css').read_text(encoding='utf-8')+(PACKAGE/'comparison/comparison-expanded.css').read_text(encoding='utf-8')+(PACKAGE/'persona-enhancements.css').read_text(encoding='utf-8')+(PACKAGE/'briefing/multipage.css').read_text(encoding='utf-8')+(PACKAGE/'briefing/expansion.css').read_text(encoding='utf-8')
 content=json.loads((PACKAGE/'detail-content.json').read_text(encoding='utf-8'))
 detail_js=(PACKAGE/'detail-ui.js').read_text(encoding='utf-8').replace('__FUNDING_DETAIL_CONTENT__',json.dumps(content,ensure_ascii=False).replace('</','<\\/')).replace('__DISTINCT_DETAIL_VIEWS__',(PACKAGE/'distinct-detail-views.js').read_text(encoding='utf-8')).replace('__BRIEFING_DETAIL_VIEW__',(PACKAGE/'briefing/detail-view.js').read_text(encoding='utf-8')).replace('__PROPOSAL_DETAIL_VIEW__',(PACKAGE/'proposal/proposal-detail-view.js').read_text(encoding='utf-8')).replace('__COMPARISON_EXPANDED_VIEW__',(PACKAGE/'comparison/comparison-expanded-view.js').read_text(encoding='utf-8'))
 preview=DESIGN/'homepage-funding-replacement-preview-20261001.html'
 previous=preview.read_text(encoding='utf-8') if preview.exists() else ''
 shell=previous[previous.index('<body>')+6:previous.index('<section class="concept')] if previous else ''
 manifest={}
 for name,(key,label) in TYPES.items():
  part=parts[name]
  files={}
  page_files=[('home','index.html'),('guide','guide.html'),('process','process.html'),('contact','contact.html')] if name=='dialogue' else [('home','index.html'),('guide','guide.html'),('contact','contact.html')]
  if name=='briefing':page_files=[('home','index.html'),('guide','guide.html'),('prepare','prepare.html'),('contact','contact.html')]
  for page,filename in page_files:
   single=document('기업자금 파트너 · '+label+' · '+{'home':'홈','guide':'자금 상세 안내','process':'진행절차·상담준비','prepare':'상담준비','contact':'간편상담'}[page],shared['css']+part['css']+detail_css,'<input id="mono-toggle" type="checkbox" hidden>'+body(part,key,shared,True,page)+shared['dialogs'],shared['js']+part['js']+detail_js)
   single=single.replace('funding-hero-assets/','../../funding-hero-assets/')
   path=PACKAGE/name/filename;path.write_text(single,encoding='utf-8');files[page]={'file':name+'/'+filename,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  manifest[name]={'root_id':'concept-'+key,'file':name+'/index.html','source':name+'/source.json','sha256':files['home']['sha256'],'pageCount':len(files),'pages':files,'changes':part.get('changes',[])}
 shell=shell.replace('선택형 · 실사 히어로','선택형 · 3페이지').replace('개발 시안 5종 · 디자인 감사 반영','상세페이지까지 구현 · 5개 유형').replace('장면형 브리핑 · 2페이지','브리핑형 · 3페이지').replace('장면형 브리핑 · 3페이지','브리핑형 · 4페이지').replace('브리핑형 · 3페이지','브리핑형 · 4페이지')
 if previous:
  unified=document('정책자금 홈페이지 · 상세페이지 구현 시안 5종',shared['css']+''.join(p['css'] for p in parts.values())+detail_css,shell+''.join(body(parts[name],key,shared,key=='1') for name,(key,label) in TYPES.items())+shared['dialogs'],shared['js']+''.join(p['js'] for p in parts.values())+detail_js)
  preview.write_text(unified,encoding='utf-8')
 (PACKAGE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print(str(sum(v['pageCount'] for v in manifest.values()))+' real page files and unified preview rebuilt: '+str(preview))

if __name__=='__main__':build()
