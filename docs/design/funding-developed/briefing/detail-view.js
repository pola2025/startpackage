function createBriefingView(root,CONTENT,h,api){
 const esc=h.escape;
 const scenarios={
  operation:{title:'납품 일정에 맞춰 운영비가 필요한 경우',need:'원재료 매입과 생산·납품 준비 비용이 특정 시기에 집중된 상황을 가정합니다.',evidence:'수주·납품 일정, 매출과 비용 흐름, 항목별 사용 시점을 사실에 맞게 정리합니다.',review:'허용 자금용도, 상환 구조, 보증 연계 여부를 해당 공고와 기관 절차에서 확인합니다.'},
  facility:{title:'생산 장비 도입을 검토하는 경우',need:'품질이나 생산성 개선을 위해 설비 도입을 계획하는 상황을 가정합니다.',evidence:'도입 목적, 규격·수량·견적, 설치 장소와 일정, 자금 조달 계획을 정리합니다.',review:'인정되는 시설 범위와 계약·선집행 기준, 융자·보증 구조를 공식 안내에서 확인합니다.'},
  support:{title:'신제품의 시장 진출 과제를 준비하는 경우',need:'제품 또는 서비스의 사업화·판로 지원 공고를 살펴보는 상황을 가정합니다.',evidence:'해결할 과제, 목표와 산출물, 수행 인력·일정, 예산과 자부담 여력을 정리합니다.',review:'대상 요건, 중복수혜 제한, 협약·정산 의무와 비용 인정 범위를 공고 원문에서 확인합니다.'}
 };
 function faq(entries,scope){return '<div class="bn-faq" data-faq-scope="'+scope+'">'+entries.map(x=>'<details><summary>'+esc(x.question)+'</summary><p>'+esc(x.answer)+'</p></details>').join('')+'</div>';}
 function path(entries){return '<ol class="bn-path-list">'+entries.map((x,index)=>'<li><span aria-hidden="true">'+String(index+1).padStart(2,'0')+'</span><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.body)+'</p></div></li>').join('')+'</ol>';}
 function checkCount(){const count=root.querySelectorAll('[data-bp-check][aria-pressed="true"]').length;const output=root.querySelector('[data-bp-check-count]');if(output)output.textContent=count+' / 4 항목 정리';}
 function render(state){
  const f=CONTENT.funds[state.fund],scenario=scenarios[state.fund]||scenarios.operation;
  const context=root.querySelector('[data-bn-context]');if(context)context.value=state.fund;
  const title=root.querySelector('[data-bn-title]');if(title)title.textContent=f.name+' 안내';
  const lead=root.querySelector('[data-bn-lead]');if(lead)lead.textContent=f.summary;
  const story=root.querySelector('[data-bn-story]');if(!story)return;const base=story.dataset.assetBase||'funding-hero-assets/';
  story.innerHTML='<section id="bn-purpose" class="bn-introduction"><div class="bn-introduction-copy"><p class="bn-kicker">자금의 목적부터</p><h2>'+esc(f.title)+'</h2><p class="bn-reading-note">이 안내는 제도의 이름보다 실제로 필요한 비용과 사업 계획을 먼저 정리하도록 돕습니다. 지원 가능 여부와 조건은 최신 공고와 기관 심사에서 결정됩니다.</p><h3>이런 목적을 살펴봅니다</h3>'+h.list(f.examples)+'<details class="bn-fit"><summary>상담에서 함께 정리할 출발점</summary>'+h.list(f.fit)+'</details></div><figure><img src="'+base+'briefing-consult-scene-v6.png" alt="컨설턴트와 사업자가 노트북으로 회사의 자금 준비 방향을 검토하는 모습"><figcaption>필요한 비용, 사업 일정, 확인할 공고를 한 흐름으로 정리합니다.</figcaption></figure></section>'+
   '<section class="bn-funding-model" aria-labelledby="bn-model-title"><div class="bn-section-heading"><p>제도를 읽는 기준</p><h2 id="bn-model-title">융자와 지원사업은 준비 방식이 다릅니다.</h2><span>명칭보다 지원 방식과 의무를 먼저 확인합니다.</span></div><div class="bn-model-grid"><article class="'+(state.fund!=='support'?'is-current':'')+'"><span>정책자금 융자</span><h3>상환을 전제로 검토</h3><p>운전·시설 목적의 정책자금은 대출일 수 있습니다. 자금용도, 상환 재원, 직접·대리대출과 보증 연계 가능성을 구분해 봅니다.</p><strong>확인 축 · 용도 / 상환 / 담보·보증</strong></article><article class="'+(state.fund==='support'?'is-current':'')+'"><span>공고형 지원사업</span><h3>과제 수행과 정산까지 검토</h3><p>보조금·바우처·융자·보증 등 방식이 다릅니다. 대상 요건과 함께 자부담, 협약, 수행, 결과보고·정산 의무를 확인합니다.</p><strong>확인 축 · 요건 / 과제 / 협약·정산</strong></article></div><p class="bn-model-caption">현재 선택한 '+esc(f.name)+'과 가까운 설명을 진하게 표시했습니다. 실제 사업의 지원 방식은 공고 원문을 기준으로 판단합니다.</p></section>'+
   '<section class="bn-editorial-checks" id="bn-checks" aria-labelledby="bn-checks-title"><div class="bn-section-heading"><p>실제 검토 기준</p><h2 id="bn-checks-title">회사의 현재 상황을 세 갈래로 확인합니다.</h2><span>금액이나 결과를 먼저 단정하지 않고, 공고에 대조할 사실을 준비합니다.</span></div><div class="bn-point-list">'+f.checks.map((x,index)=>'<article class="bn-point"><span>'+String(index+1).padStart(2,'0')+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p></article>').join('')+'</div></section>'+
   '<section class="bn-scenario" aria-labelledby="bn-scenario-title"><div class="bn-scenario-copy"><p class="bn-kicker">준비 흐름 예시</p><h2 id="bn-scenario-title">'+esc(scenario.title)+'</h2><p><strong>이해를 돕기 위한 가상 상황입니다.</strong> 회사의 사실관계와 최신 공고에 따라 검토 내용은 달라집니다.</p></div><div class="bn-scenario-track"><article><span>필요 상황</span><p>'+esc(scenario.need)+'</p></article><article><span>정리할 근거</span><p>'+esc(scenario.evidence)+'</p></article><article><span>공식 확인</span><p>'+esc(scenario.review)+'</p></article></div></section>'+
   '<section class="bn-route" id="bn-prepare" aria-labelledby="bn-route-title"><div class="bn-route-media"><img src="'+base+'briefing-review-scene-v13.png" alt="현대 사무실에서 두 명의 컨설턴트가 기업 자료를 검토하는 모습"><div><p>자료는 한꺼번에 받지 않습니다.</p><strong>상담에서 현황을 확인한 뒤, 실제 공고와 절차에 필요한 범위를 안내합니다.</strong></div></div><div class="bn-route-copy"><div class="bn-section-heading"><p>'+esc(f.name)+' 진행 경로</p><h2 id="bn-route-title">정리부터 기관 절차까지 이어봅니다.</h2><span>아래는 설명을 위한 요약입니다. 실제 신청 단계와 순서는 기관·세부 공고별 안내를 확인해야 합니다.</span></div>'+path(f.steps)+'<button type="button" class="bn-prepare-link" data-site-prepare>상담준비 페이지에서 자료 확인</button></div></section>'+
   '<section class="bn-closing" aria-labelledby="bn-faq-title"><div><p class="bn-kicker">자주 확인하는 내용</p><h2 id="bn-faq-title">신청 전에 헷갈리기 쉬운 부분</h2><p>선택한 자금 분야의 기본 질문입니다. 세부 조건과 현재 모집 여부는 공식 공고에서 다시 확인합니다.</p></div>'+faq(f.faq,'guide')+'<div class="bn-closing-actions"><button type="button" data-site-prepare>준비자료와 절차 보기</button><button type="button" class="fd-action" data-site-contact>다섯 가지 정보로 상담 시작</button></div></section>';
 }
 function renderPreparation(state){
  const f=CONTENT.funds[state.fund];
  const context=root.querySelector('[data-bp-context]');if(context)context.value=state.fund;
  const title=root.querySelector('[data-bp-title]');if(title)title.textContent=f.name+' 상담 준비';
  const leads={operation:'필요한 운영비와 매출·납품 시기를 함께 정리합니다. 첫 상담은 기본 정보로 시작하고, 자료는 필요한 범위에서 이어서 확인합니다.',facility:'설비투자의 목적과 일정, 금액 근거를 함께 정리합니다. 첫 상담은 기본 정보로 시작하고, 자료는 필요한 범위에서 이어서 확인합니다.',support:'공고의 목적, 수행 계획과 자부담 범위를 함께 정리합니다. 첫 상담은 기본 정보로 시작하고, 자료는 필요한 범위에서 이어서 확인합니다.'};
  const lead=root.querySelector('[data-bp-lead]');if(lead)lead.textContent=leads[state.fund]||leads.operation;
  const focus=root.querySelector('[data-bp-focus]');if(focus)focus.innerHTML=h.list(f.fit);
  const materials=root.querySelector('[data-bp-materials]');if(materials)materials.innerHTML=h.items(f.documents);
  const process=root.querySelector('[data-bp-process]');if(process)process.innerHTML=path(f.steps);
  const targetFaq=root.querySelector('[data-bp-faq]');if(targetFaq)targetFaq.innerHTML=faq(f.faq,'prepare');
  const status=root.querySelector('[data-bp-status]');if(status)status.textContent=f.name+' 준비자료를 표시했습니다.';
  checkCount();
 }
 return {
  render,
  renderPreparation,
  onChange(target){
   if(target.hasAttribute('data-bn-context')){api.change({fund:target.value,chapter:'overview',procedure:false,position:0});return true;}
   if(target.hasAttribute('data-bp-context')){api.change({fund:target.value,chapter:'prepare',procedure:true,position:2});return true;}
   return false;
  },
  onClick(button){
   if(button.hasAttribute('data-bn-open-fund')){api.navigate('guide',{fund:button.dataset.bnOpenFund,chapter:'overview',procedure:false,position:0});return true;}
   if(button.hasAttribute('data-bp-check')){const selected=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!selected));checkCount();return true;}
   return false;
  }
 };
}
