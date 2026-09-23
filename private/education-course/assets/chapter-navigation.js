(()=>{
  const bottom=document.querySelector('.bottom');
  if(!bottom||bottom.querySelector('.chapter-jump-wrap'))return;

  const chapters=[
    ['01','온라인 DB','chapter-01-online-db.html#/1','main'],
    ['02','Facebook 페이지','chapter-02-facebook-page.html#/1','main'],
    ['03','Instagram 계정','chapter-03-instagram-account.html#/1','main'],
    ['04','Meta 계정 통합','chapter-04-account-integration.html#/1','main'],
    ['05','광고 결제 설정','chapter-05-ad-payment.html#/1','main'],
    ['06','Meta 광고운영 주의사항','chapter-06-advertiser-safety.html#/1','main'],
    ['07','잠재 고객 광고 설정','chapter-07-ad-settings.html#/1','main'],
    ['08','콘텐츠 게시 실습','social-content-training.html','content'],
    ['09','스타트패키지','chapter-09-startpackage.html#/1','support'],
    ['10','Meta 마케팅 지원','chapter-10-marketing-support.html#/1','support'],
    ['11','관련정보 제출안내','chapter-11-submission-guide.html#/1','support']
  ];
  const currentFile=location.pathname.split('/').pop().toLowerCase();
  const previous=bottom.querySelector('#prev');
  const next=bottom.querySelector('#next');
  const replay=bottom.querySelector('#replay');
  const full=bottom.querySelector('#full');
  const counter=bottom.querySelector('.counter');
  const progress=bottom.querySelector('.progress');

  if(previous)previous.textContent=previous.textContent.trim()||'이전';
  if(next)next.classList.add('primary');
  if(replay)replay.textContent='다시 보기';
  if(full)full.textContent='전체 화면';

  const wrap=document.createElement('div');
  wrap.className='chapter-jump-wrap';
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='chapter-jump-toggle';
  toggle.textContent='챕터 이동';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-haspopup','true');
  const menu=document.createElement('nav');
  menu.className='chapter-jump-menu';
  menu.setAttribute('aria-label','챕터 바로 이동');
  const legend=document.createElement('div');
  legend.className='chapter-jump-legend';
  legend.innerHTML='<span class="main">01–07 Meta 본교육</span><span class="content">08 콘텐츠 별도교육</span><span class="support">09–11 스타트패키지 업무지원</span>';
  menu.append(legend);
  chapters.forEach(([number,title,path,track])=>{
    const link=document.createElement('a');
    link.className=`chapter-jump-link track-${track}`;
    if(currentFile===path.split('#')[0].toLowerCase()){
      link.classList.add('current');
      link.setAttribute('aria-current','page');
    }
    link.href=path;
    link.innerHTML=`<b>${number}</b><span>${title}</span>`;
    menu.append(link);
  });
  const indexLink=document.createElement('a');
  indexLink.className='chapter-jump-index';
  indexLink.href='meta-training-chapters.html';
  indexLink.textContent='전체 과정 목록';
  menu.append(indexLink);
  wrap.append(toggle,menu);

  const assistantEntries=[
    {keywords:['온라인 db','db','고객 데이터','잠재고객'],title:'온라인 DB와 잠재 고객',answer:'Meta 광고는 검색 직후의 고객만 만나는 구조가 아닙니다. 관심과 행동 신호로 발견한 고객에게 광고가 노출되므로 첫 연락에서 거절 응답이 나올 수 있습니다.',href:'chapter-01-online-db.html#/2'},
    {keywords:['용어','광고 세트','캠페인','비즈니스 포트폴리오','잠재고객센터'],title:'Meta 광고 용어집',answer:'캠페인은 목표, 광고 세트는 타겟과 예산, 광고는 고객에게 보이는 소재입니다. 기본 용어 화면에서 메뉴별 역할을 확인하세요.',href:'chapter-01-online-db.html#/26'},
    {keywords:['페이스북 페이지','페이지 만들기','개인 프로필','바둑판 메뉴'],title:'Facebook 페이지 만들기',answer:'Facebook 개인 프로필로 로그인한 홈 화면에서 오른쪽 위 메뉴를 열고 만들기의 페이지를 선택합니다.',href:'chapter-02-facebook-page.html#/2'},
    {keywords:['인스타그램 계정','새 계정','이메일 가입','프로페셔널','크리에이터'],title:'Instagram 계정 만들기',answer:'스마트폰 Instagram 앱에서 사업별 전용 이메일로 새 계정을 만들고 프로페셔널 크리에이터 계정으로 전환합니다.',href:'chapter-03-instagram-account.html#/3'},
    {keywords:['미디어 품질','고화질','화질','업로드 품질'],title:'고화질 업로드 설정',answer:'프로필 오른쪽 위 메뉴에서 설정 및 활동을 열고 앱 및 미디어의 미디어 품질로 이동해 고화질 업로드를 켭니다.',href:'chapter-03-instagram-account.html#/27'},
    {keywords:['인스타그램 비밀번호','비번','PC 로그인','로그인 안됨','비밀번호 재설정'],title:'Instagram PC 로그인 비밀번호 변경',answer:'휴대폰 Instagram 앱에서 계정 센터 > 비밀번호 및 보안 > 비밀번호 변경으로 이동합니다. 계정을 선택한 뒤 비밀번호를 잊으셨나요?를 눌러 이메일 링크로 새 비밀번호를 설정하세요.',href:'chapter-04-account-integration.html#/3'},
    {keywords:['연결된 계정','계정 통합','인스타그램 연결','페이스북 연결'],title:'Facebook과 Instagram 연결',answer:'Facebook 페이지 프로필로 전환한 뒤 페이지 설정의 연결된 계정에서 Instagram을 선택해 승인합니다.',href:'chapter-04-account-integration.html#/10'},
    {keywords:['광고 관리자 추가','광고 계정 만들기','새 광고 계정','광고 관리자'],title:'광고 계정 만들기',answer:'Business Suite의 광고 관리자에서 새 광고 계정을 만들고 이름, Asia/Seoul 시간대와 통화를 확인한 뒤 내 비즈니스용으로 생성합니다.',href:'chapter-05-ad-payment.html#/4'},
    {keywords:['결제수단','결제 수단','토스','toss','카드','원화','달러','통화'],title:'광고 결제수단 등록',answer:'KRW 계정은 Toss 충전결제, USD 계정은 해외결제 가능한 신용카드 또는 체크카드 후불결제를 사용합니다.',href:'chapter-05-ad-payment.html#/10'},
    {keywords:['소액 결제','결제 검증','청구 기준액','자주 결제'],title:'신규 계정 결제 검증',answer:'신규 광고 계정은 작은 결제 기준액부터 청구될 수 있습니다. 정상 결제 이력이 쌓이면 기준액이 점차 높아질 수 있습니다.',href:'chapter-05-ad-payment.html#/17'},
    {keywords:['피싱','스팸','사칭','경고 메일','메신저 사기'],title:'Meta 사칭 메시지 주의',answer:'메신저나 이메일의 인증·경고 링크에는 답장하거나 로그인하지 않습니다. Facebook 알림과 광고 관리자 안의 공식 안내만 확인하세요.',href:'chapter-06-advertiser-safety.html#/2'},
    {keywords:['광고 라이브러리','광고라이브러리','다른 사람 광고','경쟁사 광고','광고 참고'],title:'Meta 광고 라이브러리',answer:'광고 라이브러리에서 대한민국과 모든 광고를 선택한 뒤 광고주 이름이나 키워드를 검색하면 현재 게재 광고의 이미지와 문구를 참고할 수 있습니다.',href:'chapter-07-ad-settings.html#/2'},
    {keywords:['광고 목표','인지도','트래픽','잠재 고객 목표'],title:'광고 목표 선택',answer:'이번 교육은 잠재 고객 목표와 Meta 인스턴트 양식을 기본으로 사용합니다. 홈페이지 접수 구조가 있으면 트래픽 목표를 선택할 수 있습니다.',href:'chapter-07-ad-settings.html#/4'},
    {keywords:['지역 타겟팅','지역 타게팅','위치 타겟','지역 설정','대한민국','반경'],title:'지역 타겟팅 설정',answer:'타겟의 관리 옵션 표시를 누르고 위치를 엽니다. 전국 광고는 대한민국을 유지하고 지역 광고는 영업지역을 검색해 정확한 도시·구와 반경을 확인합니다.',href:'chapter-07-ad-settings.html#/21'},
    {keywords:['예산','일일 예산','20달러','$20','입찰'],title:'광고 예산 기본값',answer:'캠페인 일일 예산은 $20로 설정하고 입찰 전략은 최고 볼륨을 유지합니다. 시작일과 종료일은 기본값을 사용합니다.',href:'chapter-07-ad-settings.html#/13'},
    {keywords:['입력양식','인스턴트 양식','양식 만들기','회사명','전화번호'],title:'인스턴트 양식 만들기',answer:'양식 만들기를 선택하고 회사명, 업종, 이름, 전화번호를 받습니다. 소개 설명과 개인정보처리방침 주소도 입력해야 합니다.',href:'chapter-07-ad-settings.html#/33'},
    {keywords:['콘텐츠','게시물','릴스','reels','쓰레드','threads','게시 실습'],title:'소셜 콘텐츠 게시 실습',answer:'Instagram 게시물, Reels, Threads의 실제 모바일 게시 과정을 콘텐츠 교육에서 확인합니다.',href:'social-content-training.html'},
    {keywords:['스타트패키지','로고','추상 로고','캘리그라피','인쇄물','명함','명찰','대봉투','계약서','홈페이지 스타일'],title:'스타트패키지 제작 범위',answer:'단순 엠블럼과 레퍼런스가 있는 로고를 기준으로 진행하며 홈페이지 9종과 인쇄물 예시를 확인할 수 있습니다.',href:'chapter-09-startpackage.html#/2'},
    {keywords:['추가 인쇄','재인쇄','인쇄 비용','명함 비용','대봉투 비용','계약서 비용'],title:'추가 인쇄비',answer:'명함은 추가 22,000원, 대봉투는 220,000원, 자문계약서는 330,000원이며 모두 VAT 포함 기준입니다.',href:'chapter-09-startpackage.html#/26'},
    {keywords:['8주 지원','마케팅 지원','광고소재 등록','광고계정 설정','접수 알림','접수 자동화'],title:'8주 Meta 마케팅 지원',answer:'8주 동안 광고소재 등록, 광고계정 설정, Meta 양식 접수 알림 자동화를 지원합니다. 지원 종료 후 Meta 접수자동화는 종료되고 홈페이지 자체 접수 알림은 계속 작동합니다.',href:'chapter-10-marketing-support.html#/2'},
    {keywords:['텔레그램','telegram','텔레그램 알림','담당자 텔레그램'],title:'담당자 Telegram 접수 알림',answer:'Meta 양식으로 신규 고객이 접수되면 내부 접수관리 화면과 담당자 Telegram에 고객명, 연락처, 접수경로가 동시에 전달됩니다.',href:'chapter-10-marketing-support.html#/6'},
    {keywords:['접수 자동화','담당자 알림','알림톡','문자 알림','접수관리','고객 통계'],title:'Meta 접수자동화 작동 과정',answer:'광고소재 제작, 광고 설정, 접수폼 설정 후 내부 접수관리와 담당자 Telegram으로 동시에 전달됩니다. 이어서 고객 문자 또는 알림톡과 홈페이지 접수관리로 연결됩니다.',href:'chapter-10-marketing-support.html#/9'},
    {keywords:['광고운영대행','운영대행','콘텐츠대행','대행 상품','99만원','66만원','165만원','33만원','22만원'],title:'폴라애드 대행상품',answer:'광고운영대행은 월 33만원 기준 3개월 99만원, 콘텐츠대행은 월 22만원 기준 3개월 66만원입니다. 함께 신청하면 3개월 합계 165만원입니다.',href:'chapter-10-marketing-support.html#/13'},
    {keywords:['관련정보','자료 제출','gmail','지메일','도메인','cloudflare','클라우드플레어'],title:'관련정보 제출안내',answer:'홈페이지 연결용 Gmail ID/PW와 도메인 주소가 필요합니다. 도메인은 연간 약 13,000원부터 30,000원 내외이며 Cloudflare 구매를 권장합니다.',href:'chapter-11-submission-guide.html#/1'}
  ];
  const assistant=document.createElement('div');
  assistant.className='course-assistant-wrap';
  const assistantToggle=document.createElement('button');
  assistantToggle.type='button';
  assistantToggle.className='course-assistant-toggle';
  assistantToggle.textContent='교육 도우미';
  assistantToggle.setAttribute('aria-expanded','false');
  assistantToggle.setAttribute('aria-haspopup','dialog');
  const assistantPanel=document.createElement('section');
  assistantPanel.className='course-assistant-panel';
  assistantPanel.setAttribute('role','dialog');
  assistantPanel.setAttribute('aria-label','교육 도우미 챗봇');
  assistantPanel.innerHTML='<div class="assistant-head"><div><b>교육 도우미</b><span>메뉴명이나 궁금한 내용을 입력하세요.</span></div><button type="button" class="assistant-close" aria-label="교육 도우미 닫기">×</button></div><div class="assistant-quick"><button type="button">페이지 만들기</button><button type="button">고화질 업로드</button><button type="button">결제수단</button><button type="button">지역 타겟팅</button></div><form class="assistant-form"><input type="text" aria-label="교육 질문" placeholder="예: 지역 타겟팅은 어디서 설정하나요?"><button type="submit">찾기</button></form><div class="assistant-answer" aria-live="polite"><strong>교육내용을 바로 찾아드립니다.</strong><p>질문과 가장 가까운 설명과 이동할 페이지를 표시합니다.</p></div>';
  assistant.append(assistantToggle,assistantPanel);
  const assistantInput=assistantPanel.querySelector('input');
  const assistantAnswer=assistantPanel.querySelector('.assistant-answer');
  const normalize=value=>value.toLowerCase().replace(/[^a-z0-9가-힣$]+/g,' ').trim();
  const answerQuestion=value=>{
    const query=normalize(value);
    if(!query)return;
    let best=null;
    let bestScore=0;
    assistantEntries.forEach(entry=>{
      const score=entry.keywords.reduce((sum,keyword)=>{
        const key=normalize(keyword);
        return sum+(query.includes(key)?key.length+4:0);
      },0);
      if(score>bestScore){best=entry;bestScore=score}
    });
    if(!best){
      assistantAnswer.innerHTML='<strong>교육자료에서 답을 찾지 못했습니다.</strong><p>질문 내용을 그대로 정리해 교육 관리자에게 문의해주세요.</p>';
      return;
    }
    assistantAnswer.innerHTML=`<strong>${best.title}</strong><p>${best.answer}</p><a href="${best.href}">관련 페이지 열기</a>`;
  };
  assistantPanel.querySelector('.assistant-form').addEventListener('submit',event=>{event.preventDefault();answerQuestion(assistantInput.value)});
  assistantPanel.querySelectorAll('.assistant-quick button').forEach(button=>button.addEventListener('click',()=>{assistantInput.value=button.textContent;answerQuestion(button.textContent)}));
  assistantInput.addEventListener('keydown',event=>{event.stopPropagation()});
  assistantPanel.addEventListener('click',event=>event.stopPropagation());
  const closeAssistant=()=>{assistant.classList.remove('open');assistantToggle.setAttribute('aria-expanded','false')};
  assistantToggle.addEventListener('click',event=>{
    event.stopPropagation();
    close();
    const open=!assistant.classList.contains('open');
    assistant.classList.toggle('open',open);
    assistantToggle.setAttribute('aria-expanded',String(open));
    if(open)setTimeout(()=>assistantInput.focus(),0);
  });
  assistantPanel.querySelector('.assistant-close').addEventListener('click',closeAssistant);

  const kakaoContact=document.createElement('a');
  kakaoContact.className='course-kakao-contact';
  kakaoContact.href='https://pf.kakao.com/_CTaiX/chat';
  kakaoContact.target='_blank';
  kakaoContact.rel='noopener noreferrer';
  kakaoContact.textContent='polarad 카카오톡 친구추가 · 문의';
  kakaoContact.setAttribute('aria-label','polarad 카카오톡 채널 친구추가 후 문의');
  kakaoContact.addEventListener('keydown',event=>event.stopPropagation());

  [previous,next,replay,full].forEach(element=>{if(element)bottom.append(element)});
  bottom.append(wrap,assistant,kakaoContact);
  if(counter)bottom.append(counter);
  if(progress)bottom.append(progress);

  const close=()=>{wrap.classList.remove('open');toggle.setAttribute('aria-expanded','false')};
  toggle.addEventListener('click',event=>{
    event.stopPropagation();
    closeAssistant();
    const open=!wrap.classList.contains('open');
    wrap.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',String(open));
  });
  menu.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',()=>{close();closeAssistant()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();closeAssistant()}});
})();
