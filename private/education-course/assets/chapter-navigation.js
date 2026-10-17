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
    ['07A','광고 설정 · 캠페인','chapter-07-ad-settings.html#/1','main'],
    ['07B','광고 설정 · 양식','chapter-07b-ad-form.html#/1','main'],
    ['08A','AI 설정 · VS Code','chapter-08-ai-vscode.html#/1','ai'],
    ['08B','AI 설정 · Codex','chapter-08b-ai-codex.html#/1','ai'],
    ['08C','AI 설정 · 세션과 한도','chapter-08c-ai-session.html#/1','ai'],
    ['08D','AI 설정 · 에이전트 키트','chapter-08d-ai-kit.html#/1','ai'],
    ['08E','블로그 기본 설정','chapter-08e-blog-setup.html#/1','ai'],
    ['08F','블로그 글 만들기','chapter-08f-blog-write.html#/1','ai'],
    ['08G','Meta SNS 자동화','chapter-08g-sns.html#/1','ai'],
    ['08H','Meta 광고 자동화','chapter-08h-ads.html#/1','ai'],
    ['09','콘텐츠 게시 실습','social-content-training.html','content'],
    ['10','스타트패키지','chapter-09-startpackage.html#/1','support'],
    ['11','Meta 마케팅 지원','chapter-10-marketing-support.html#/1','support'],
    ['12','관련정보 제출안내','chapter-11-submission-guide.html#/1','support'],
    ['13','진행 규칙과 비용','chapter-12-rules-costs.html#/1','support'],
    ['14','알림 연결 준비','chapter-13-alert-setup.html#/1','support']
  ];
  const currentFile=location.pathname.split('/').pop().toLowerCase();
  const progressKey='polarad-course-progress';
  const saveProgress=()=>{
    try{
      const scene=parseInt(bottom.querySelector('#current')?.textContent||'',10);
      const total=parseInt(bottom.querySelector('#total')?.textContent||'',10);
      if(!scene||!total||!currentFile)return;
      const data=JSON.parse(localStorage.getItem(progressKey)||'{}');
      data.seen=data.seen||{};data.totals=data.totals||{};
      data.seen[currentFile]=Math.max(data.seen[currentFile]||0,scene);
      data.totals[currentFile]=total;
      data.last={file:currentFile,scene,at:Date.now()};
      localStorage.setItem(progressKey,JSON.stringify(data));
    }catch{}
  };
  const currentNode=bottom.querySelector('#current');
  if(currentNode)new MutationObserver(saveProgress).observe(currentNode,{childList:true,characterData:true,subtree:true});
  setTimeout(saveProgress,0);
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
  legend.innerHTML='<span class="main">01–07 Meta 본교육</span><span class="ai">08 AI 자동화 설정</span><span class="content">09 콘텐츠 별도교육</span><span class="support">10–14 스타트패키지 업무지원</span>';
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
    {keywords:['용어','광고 세트','캠페인','비즈니스 포트폴리오','잠재고객센터','용어집','광고 용어'],title:'Meta 광고 용어집',answer:'캠페인은 목표, 광고 세트는 타겟과 예산, 광고는 고객에게 보이는 소재입니다. 기본 용어 화면에서 메뉴별 역할을 확인하세요.',href:'chapter-01-online-db.html#/23'},
    {keywords:['페이스북 페이지','페이지 만들기','개인 프로필','바둑판 메뉴'],title:'Facebook 페이지 만들기',answer:'Facebook 개인 프로필로 로그인한 홈 화면에서 오른쪽 위 메뉴를 열고 만들기의 페이지를 선택합니다.',href:'chapter-02-facebook-page.html#/2'},
    {keywords:['인스타그램 계정','새 계정','이메일 가입','프로페셔널','크리에이터','instagram 계정'],title:'Instagram 계정 만들기',answer:'스마트폰 Instagram 앱에서 사업별 전용 이메일로 새 계정을 만들고 프로페셔널 크리에이터 계정으로 전환합니다.',href:'chapter-03-instagram-account.html#/3'},
    {keywords:['미디어 품질','고화질','화질','업로드 품질'],title:'고화질 업로드 설정',answer:'프로필 오른쪽 위 메뉴에서 설정 및 활동을 열고 앱 및 미디어의 미디어 품질로 이동해 고화질 업로드를 켭니다.',href:'chapter-03-instagram-account.html#/27'},
    {keywords:['인스타그램 비밀번호','비번','PC 로그인','로그인 안됨','비밀번호 재설정'],title:'Instagram PC 로그인 비밀번호 변경',answer:'휴대폰 Instagram 앱에서 계정 센터 > 비밀번호 및 보안 > 비밀번호 변경으로 이동합니다. 계정을 선택한 뒤 비밀번호를 잊으셨나요?를 눌러 이메일 링크로 새 비밀번호를 설정하세요.',href:'chapter-04-account-integration.html#/3'},
    {keywords:['연결된 계정','계정 통합','인스타그램 연결','페이스북 연결','instagram 연결','facebook과 instagram'],title:'Facebook과 Instagram 연결',answer:'Facebook 페이지 프로필로 전환한 뒤 페이지 설정의 연결된 계정에서 Instagram을 선택해 승인합니다.',href:'chapter-04-account-integration.html#/10'},
    {keywords:['광고 관리자 추가','광고 계정 만들기','새 광고 계정','광고 관리자'],title:'광고 계정 만들기',answer:'Business Suite의 광고 관리자에서 새 광고 계정을 만들고 이름, Asia/Seoul 시간대와 통화를 확인한 뒤 내 비즈니스용으로 생성합니다.',href:'chapter-05-ad-payment.html#/4'},
    {keywords:['결제수단','결제 수단','토스','toss','카드','원화','달러','통화','카드 앞면','대신 등록','대리 등록'],title:'광고 결제수단 등록',answer:'KRW 계정은 Toss 충전결제, USD 계정은 해외결제 가능한 신용카드 또는 체크카드 후불결제를 사용합니다. 직접 등록이 어려우면 자료 제출 › 마케팅에 신용카드 앞면을 올려 주시면 폴라애드가 대신 등록합니다.',href:'chapter-05-ad-payment.html#/10'},
    {keywords:['소액 결제','결제 검증','청구 기준액','자주 결제'],title:'신규 계정 결제 검증',answer:'신규 광고 계정은 작은 결제 기준액부터 청구될 수 있습니다. 정상 결제 이력이 쌓이면 기준액이 점차 높아질 수 있습니다.',href:'chapter-05-ad-payment.html#/17'},
    {keywords:['피싱','스팸','사칭','경고 메일','메신저 사기'],title:'Meta 사칭 메시지 주의',answer:'메신저나 이메일의 인증·경고 링크에는 답장하거나 로그인하지 않습니다. Facebook 알림과 광고 관리자 안의 공식 안내만 확인하세요.',href:'chapter-06-advertiser-safety.html#/2'},
    {keywords:['광고 라이브러리','광고라이브러리','다른 사람 광고','경쟁사 광고','광고 참고'],title:'Meta 광고 라이브러리',answer:'광고 라이브러리에서 대한민국과 모든 광고를 선택한 뒤 광고주 이름이나 키워드를 검색하면 현재 게재 광고의 이미지와 문구를 참고할 수 있습니다.',href:'chapter-07-ad-settings.html#/2'},
    {keywords:['광고 목표','인지도','트래픽','잠재 고객 목표'],title:'광고 목표 선택',answer:'이번 교육은 잠재 고객 목표와 Meta 인스턴트 양식을 기본으로 사용합니다. 홈페이지 접수 구조가 있으면 트래픽 목표를 선택할 수 있습니다.',href:'chapter-07-ad-settings.html#/4'},
    {keywords:['지역 타겟팅','지역 타게팅','위치 타겟','지역 설정','대한민국','반경'],title:'지역 타겟팅 설정',answer:'타겟의 관리 옵션 표시를 누르고 위치를 엽니다. 전국 광고는 대한민국을 유지하고 지역 광고는 영업지역을 검색해 정확한 도시·구와 반경을 확인합니다.',href:'chapter-07-ad-settings.html#/17'},
    {keywords:['예산','일일 예산','20달러','$20','28,000원','28000','입찰'],title:'광고 예산 기본값',answer:'캠페인 일일 예산은 원화 계정 28,000원, 달러 계정 $20로 설정하고 입찰 전략은 최고 볼륨을 유지합니다. 시작일과 종료일은 기본값을 사용합니다.',href:'chapter-07-ad-settings.html#/9'},
    {keywords:['입력양식','인스턴트 양식','양식 만들기','회사명','전화번호'],title:'인스턴트 양식 만들기',answer:'양식 만들기를 선택하고 회사명, 업종, 이름, 전화번호를 받습니다. 소개 설명과 개인정보처리방침 주소도 입력해야 합니다.',href:'chapter-07b-ad-form.html#/6'},
    {keywords:['준비물','준비할 것','노트북','chatgpt plus','plus 구독','유료 구독','사전 준비'],title:'08장 시작 전 준비물',answer:'08장 AI 자동화 전체(블로그, Meta SNS, Meta 광고)에는 노트북과 ChatGPT Plus 이상 구독이 필요합니다. 08A·08B·08C를 순서대로 따라 하면 Codex를 켜고 모델과 권한까지 설정한 상태가 됩니다.',href:'chapter-08-ai-vscode.html#/2'},
    {keywords:['vs code 설치','vscode 설치','vs code 내려받기','내려받기와 설치','vs code 다운로드','vscode 다운로드','비주얼 스튜디오','visual studio','vscodeusersetup','설치 파일'],title:'VS Code 내려받기와 설치',answer:'Chrome에서 code.visualstudio.com에 접속해 Download for Windows를 누르고, 내려받은 VSCodeUserSetup 파일을 실행합니다. 설치 위치는 그대로 두고 바탕 화면 바로가기를 체크한 뒤 설치합니다.',href:'chapter-08-ai-vscode.html#/3'},
    {keywords:['bas_mkt','폴더 만들기','새 폴더','c 드라이브','폴더 이름','파일 탐색기'],title:'C 드라이브에 bas_mkt 폴더 만들기',answer:'Windows 키와 E를 함께 눌러 파일 탐색기를 열고 로컬 디스크 (C:)에서 새로 만들기 → 폴더를 누릅니다. 이름은 영문 소문자와 밑줄로 bas_mkt라고 정확히 입력합니다.',href:'chapter-08-ai-vscode.html#/10'},
    {keywords:['구글 로그인','vs code 로그인','첫 실행','첫 화면','vs code 첫','첫 실행 화면','welcome to vs code','github 버튼','테마','get started','언어 팩','한국어로 변경'],title:'VS Code 첫 실행 화면',answer:'Welcome to VS Code 창에서는 GitHub 버튼 오른쪽의 G(구글) 버튼으로 로그인합니다. 테마는 바꾸지 않고 Get Started를 누르고, 한국어 언어 팩 알림은 ✕로 닫아 메뉴를 영어로 유지합니다.',href:'chapter-08-ai-vscode.html#/14'},
    {keywords:['vs code','vscode','작업 폴더','add folder','워크스페이스','workspace','폴더 연결','폴더 신뢰','untitled'],title:'VS Code에 bas_mkt 폴더 연결',answer:'☰ 메뉴의 File → Add Folder to Workspace...를 누르고 C 드라이브의 bas_mkt를 골라 Add를 누릅니다. 폴더 신뢰 창에서는 Yes를 누르고, 위쪽에 Untitled (Workspace)가 보이면 연결된 것입니다.',href:'chapter-08-ai-vscode.html#/19'},
    {keywords:['터미널','terminal','new terminal','터미널 열기','chat 닫기'],title:'VS Code 터미널 열기',answer:'☰ 메뉴의 Terminal → New Terminal을 누르거나 Ctrl + Shift + `를 누릅니다. 오른쪽 Chat 창은 닫고 터미널을 크게 키운 뒤, 첫 줄에 PS C:\\bas_mkt>가 보이는지 확인합니다.',href:'chapter-08b-ai-codex.html#/2'},
    {keywords:['codex','코덱스','codex 설치','코덱스 설치','설치 명령','installed successfully','start codex now','cmdlet','인식되지 않습니다'],title:'Codex 설치',answer:'교육 화면의 설치 명령을 복사해 터미널에 붙여 넣고 Enter를 누릅니다. installed successfully가 보이면 Start Codex now 질문에는 Enter만 누르고, VS Code를 껐다 켠 뒤 codex를 입력합니다. cmdlet 이름으로 인식되지 않는다는 오류가 나오면 VS Code를 한 번 더 껐다 켭니다.',href:'chapter-08b-ai-codex.html#/4'},
    {keywords:['chatgpt 로그인','chatgpt로 로그인','sign in with chatgpt','codex 로그인','코덱스 로그인','signed in','로그인 방법'],title:'Codex에 ChatGPT로 로그인',answer:'codex를 처음 실행하면 1번 Sign in with ChatGPT에서 Enter를 누릅니다. 자동으로 열린 브라우저에서 ChatGPT에 로그인하고, 터미널에 Signed in이 보이면 Enter를 누릅니다.',href:'chapter-08b-ai-codex.html#/8'},
    {keywords:['샌드박스','sandbox','update now','update available','업데이트','codex update'],title:'샌드박스·업데이트 안내가 나올 때',answer:'샌드박스 안내가 나오면 1번 Set up default sandbox에서 Enter를 누르고 관리자 권한 창에서 예를 누릅니다. Update available 안내가 나오면 Update now를 고르고, 업데이트가 끝나면 codex를 다시 입력합니다.',href:'chapter-08b-ai-codex.html#/13'},
    {keywords:['모델','model','모델 설정','gpt 6 1','astra','추론','extra high','xhigh','reasoning'],title:'모델과 추론 설정',answer:'/model을 입력해 GPT-6.1-Sol을 고르고, 추론은 4번 Extra high를 고릅니다. GPT-6-Astra 같은 최상위 모델은 사용 한도가 훨씬 빨리 줄어서 고르지 않습니다. 한도에 자주 걸리면 추론을 3번 High로 낮춥니다.',href:'chapter-08b-ai-codex.html#/16'},
    {keywords:['권한','permissions','full access','풀 액세스','권한 설정','yes continue'],title:'권한은 Full Access',answer:'/permissions를 입력하고 3번 Full Access를 고른 뒤 경고창에서 1번 Yes, continue anyway를 고릅니다. Full Access는 그 세션에만 적용되므로 Codex를 새로 켤 때마다 다시 고릅니다.',href:'chapter-08b-ai-codex.html#/20'},
    {keywords:['세션','컨텍스트','context','context left','context window','기억'],title:'세션과 컨텍스트',answer:'codex를 실행해 대화를 시작하고 끝낼 때까지가 세션 하나입니다. 한 세션에서 Codex가 기억할 수 있는 양에는 한도가 있어서, 남은 양을 아래 상태 줄의 context left와 /status의 Context window 줄에서 확인합니다.',href:'chapter-08c-ai-session.html#/3'},
    {keywords:['핸드오프','handoff','clear','새 세션','세션 정리','이어서 진행','컨텍스트가 차'],title:'세션 핸드오프와 /clear',answer:'컨텍스트가 거의 차면 교육 화면의 핸드오프 문장으로 HANDOFF.md에 정리를 요청합니다. 파일이 생기면 /clear로 비우고, 새 세션에서 HANDOFF.md를 읽고 이어서 진행해 달라고 보냅니다.',href:'chapter-08c-ai-session.html#/5'},
    {keywords:['다음 날','resume','codex resume','resume last','어제 작업','다시 시작','이어가기'],title:'다음 날 다시 시작하기',answer:'VS Code를 열고 ☰ → Terminal → New Terminal에서 codex를 입력합니다. 어제 세션을 그대로 이어가려면 codex resume --last를 입력하고, Codex를 새로 켰으면 /permissions에서 Full Access를 다시 고릅니다.',href:'chapter-08c-ai-session.html#/8'},
    {keywords:['사용 한도','한도','남은 한도','5시간','주간 한도','weekly limit','5h limit','한도 초과','status'],title:'사용 한도 확인',answer:'/status를 입력하면 5시간 한도와 주간 한도의 남은 비율, 초기화 시각이 보입니다. 큰 작업을 맡기기 전에 확인하고, 한도를 다 쓰면 초기화될 때까지 기다립니다. 추론을 Extra high로 쓰면 한도가 더 빨리 줄어듭니다.',href:'chapter-08c-ai-session.html#/10'},
    {keywords:['오류 번호','오류 코드','에러 번호','에러 코드','codex 오류','codex 에러','401','403','429','500','502','503','504','과부하','codex 느려','코덱스 느려','답이 느려'],title:'Codex 오류 번호',answer:'401은 로그인 만료라 codex를 다시 실행해 로그인하고, 403은 요금제와 로그인한 계정을 확인합니다. 429는 한도 초과라 /status로 초기화 시각을 확인하고 기다립니다. 500·502·503은 잠시 뒤 같은 요청을 다시 보내고, 504는 요청을 작게 나눠 보냅니다.',href:'chapter-08c-ai-session.html#/11'},
    {keywords:['stream disconnected','연결 끊김','인터넷 끊김','멈췄','멈춤','번호 없이','멈출 때','codex 멈','코덱스 멈','응답이 없','답이 안'],title:'Codex가 번호 없이 멈출 때',answer:'stream disconnected가 보이면 인터넷 연결이 끊긴 것이니 같은 요청을 다시 보냅니다. Codex는 오류를 번호 없이 문장으로 보여 줄 때가 많습니다.',href:'chapter-08c-ai-session.html#/12'},
    {keywords:['에이전트 키트','키트','agent kit','zip','키트 내려받기','키트 다운로드','압축','agents md'],title:'에이전트 키트 내려받기와 전달',answer:'08D STEP 01의 파란 링크로 bas_mkt-agent-kit.zip을 내려받습니다. 교육 화면 문장을 Codex에게 보내면 C:\\bas_mkt에 압축을 풀고 AGENTS.md를 읽은 뒤 도구 설치까지 진행합니다.',href:'chapter-08d-ai-kit.html#/3'},
    {keywords:['관리자 승인','사용자 계정 컨트롤','uac','예 누르기','게시자','설치 승인'],title:'관리자 승인 창',answer:'설치 중 사용자 계정 컨트롤 창이 뜨면 게시자를 확인하고 예를 누릅니다. 창이 여러 번 뜰 수 있고, 게시자가 낯선 이름이면 아니요를 누르고 Codex에게 알립니다.',href:'chapter-08d-ai-kit.html#/5'},
    {keywords:['chatgpt 앱','컴퓨터 사용','모든 앱','앱 설정','computer use'],title:'ChatGPT 앱 컴퓨터 사용 켜기',answer:'Windows 키를 누르고 ChatGPT를 입력해 앱을 열고 평소 쓰는 ChatGPT 계정으로 로그인합니다. 프로필 → 설정 → 컴퓨터 사용에서 모든 앱 스위치를 켭니다.',href:'chapter-08d-ai-kit.html#/9'},
    {keywords:['크롬 확장','chrome 확장','확장 프로그램','웹 스토어','openai com','브라우저 확장','설치되지 않음'],title:'Chrome 확장 프로그램 연결',answer:'컴퓨터 사용 화면의 Google Chrome 줄에서 설치하기를 누르고, 제공자가 openai.com인 ChatGPT 확장 프로그램만 추가합니다. 초록 점과 브라우저 확장 프로그램 설치함이 보이면 연결된 것입니다.',href:'chapter-08d-ai-kit.html#/10'},
    {keywords:['네이버 첫 로그인','네이버 로그인','새 기기','등록안함','기기 등록','로그인 상태 유지','nid aut','세션 연장'],title:'네이버 첫 로그인',answer:'Codex가 연 Chrome 창에 네이버 아이디와 비밀번호를 직접 입력합니다. Codex 채팅에는 적지 않고, 로그인 상태 유지는 켜진 그대로 둡니다. 새 기기 등록 화면에서는 등록안함을 누르고, 터미널에 성공이 보이면 끝난 것입니다.',href:'chapter-08d-ai-kit.html#/15'},
    {keywords:['블로그 기본 설정','블로그 설정','직접 설정','10가지'],title:'네이버 블로그 기본 설정',answer:'블로그 설정은 모두 직접 하고, Codex는 이미지 3장 제작만 돕습니다. 블로그 아이디부터 블로그 정보, 블로그씨 중지, 레이아웃·메뉴, 상단 배경까지 차례로 진행합니다.',href:'chapter-08e-blog-setup.html#/2'},
    {keywords:['이미지 규격','블로그 이미지','top bg','3000','상단 배경 크기','배경 크기','mobile cover','profile png','640','이미지 3장'],title:'블로그 이미지 3장 규격',answer:'PC 상단 배경은 3000×500px로, 글자는 가운데 966px 안에 넣고 맨 위 33px은 비웁니다. 모바일 배경은 1080×1080px, 프로필은 640×640px입니다. 교육 화면의 요청 문장을 보내면 Codex가 C:\\bas_mkt\\blog-setup 폴더에 만들어 줍니다.',href:'chapter-08e-blog-setup.html#/3'},
    {keywords:['블로그 아이디','블로그 주소','아이디 만들기','blog naver com','아이디 변경'],title:'블로그 아이디 만들기',answer:'네이버 첫 화면 블로그 탭에서 블로그 아이디 만들기를 누릅니다. 아이디가 blog.naver.com/아이디 주소가 되고 나중에 바꿀 수 없으므로 상호나 브랜드를 짧은 영문으로 정합니다. 이미 아이디가 있으면 STEP 09로 갑니다.',href:'chapter-08e-blog-setup.html#/7'},
    {keywords:['블로그 정보','소개글','프로필 이미지','모바일 배경','커버 이미지','모바일앱 커버','블로그명','별명'],title:'소개글·프로필·모바일 배경 등록',answer:'내 블로그의 관리 → 블로그 정보에서 소개글을 입력하고 profile.png와 mobile-cover.png를 등록합니다. 화면 맨 아래 초록색 확인을 눌러야 저장됩니다.',href:'chapter-08e-blog-setup.html#/13'},
    {keywords:['블로그씨','블로그씨 질문','글배달','배달중지'],title:'블로그씨 질문 배달 중지',answer:'메뉴·글·동영상 관리 → 글배달의 블로그씨 질문에서 배달중지를 고르고 확인을 누릅니다. 블로그씨 질문이 내 블로그 화면에 배달되지 않게 하는 설정입니다.',href:'chapter-08e-blog-setup.html#/19'},
    {keywords:['레이아웃','2단','위젯','메뉴 사용','이웃커넥트','글 영역','중앙 정렬','달력','카운터'],title:'레이아웃·메뉴·위젯 설정',answer:'꾸미기 설정 → 레이아웃·위젯 설정에서 왼쪽 사이드바가 있는 2단 레이아웃을 고르고 전체정렬 중앙, 글 영역 넓게로 맞춥니다. 이웃커넥트·태그·최근댓글·이웃블로그 메뉴와 켜진 위젯은 모두 끄고 적용합니다.',href:'chapter-08e-blog-setup.html#/21'},
    {keywords:['스킨배경','상단 배경','리모콘','세부 디자인','타이틀','영역 높이','높이 500','직접등록','블로그 제목'],title:'상단 배경 등록과 영역 높이',answer:'꾸미기 설정 → 세부 디자인 설정의 리모콘에서 스킨배경 → 직접등록 → 상단 영역에 top-bg.png를 올립니다. 타이틀에서 블로그 제목 표시를 끄고 영역 높이에 500을 입력한 뒤 적용을 누릅니다.',href:'chapter-08e-blog-setup.html#/27'},
    {keywords:['블로그 글','블로그 글 만들기','세 번만','글쓰기 자동'],title:'기업마당 공고로 블로그 글 만들기',answer:'조사·원고·이미지·검사는 Codex가 맡고, 직접 하는 일은 공고 고르기·사실 확인·발행 승인 세 가지입니다. 회사 정보를 한 번 등록한 뒤에는 STEP 05 문장 하나로 같은 과정을 반복합니다.',href:'chapter-08f-blog-write.html#/2'},
    {keywords:['글 구성','글 한 편','한 편의 구성','메시지 카드','소제목','권장안','구성 바꾸'],title:'블로그 글 한 편의 구성',answer:'표지 다음에 메시지 카드 4장이 나오고, 소제목 7개 아래에 문단과 차트·실사가 번갈아 들어갑니다. 마지막은 출처와 CTA입니다. 권장안이라서 바꿀 구성은 Codex에게 말로 요청하면 됩니다.',href:'chapter-08f-blog-write.html#/3'},
    {keywords:['회사 정보','cta','대표 전화','브랜드 색','로고 파일','cta 디자인','상담 연결형','티켓형'],title:'회사 정보와 CTA 등록',answer:'STEP 01 문장에 회사명·대표 전화·홈페이지·브랜드 색·로고 파일·CTA 디자인(A 상담 연결형, B 체크리스트형, C 티켓형)을 적어 처음 한 번만 보냅니다. 회사 정보가 바뀌면 같은 문장으로 다시 등록합니다.',href:'chapter-08f-blog-write.html#/4'},
    {keywords:['기업마당','bizinfo','지원사업 공고','정책정보','금융 분야','공고 주소','주소 복사'],title:'기업마당 공고 주소 가져오기',answer:'Chrome에서 bizinfo.go.kr을 열고 정책정보 → 지원사업 공고를 누릅니다. 정책자금 글이면 분야에서 금융을 고른 뒤 주소창 주소를 Ctrl + C로 복사합니다. 특정 공고 하나로 쓰려면 그 공고 상세 화면의 주소를 복사합니다.',href:'chapter-08f-blog-write.html#/5'},
    {keywords:['글 준비','후보 표','공고 번호','후보 5개','글감','공고 고르기','정책자금 글'],title:'글 준비 요청과 후보 고르기',answer:'STEP 05 문장에 기업마당 주소를 붙여 보내면 Codex가 접수 중인 공고 후보 5개를 표로 보여 줍니다. 신청기간과 글감을 보고 ‘3번으로 해 줘’처럼 번호로 답합니다. 글감이 ‘충분’인 공고를 고르는 편이 좋습니다.',href:'chapter-08f-blog-write.html#/8'},
    {keywords:['사실 카드','facts html','facts','원문 비교','공고 원문','숫자 확인','확인이라고'],title:'사실 카드 확인',answer:'Codex가 알려 준 facts.html 경로를 Chrome 주소창에 붙여 넣고, 글에 쓸 내용이 공고 원문과 같은지 금액·비율·기간을 한 글자씩 대조합니다. 같으면 확인이라고 답하고, 다르면 그 항목을 말해 줍니다.',href:'chapter-08f-blog-write.html#/10'},
    {keywords:['검수 화면','review html','자동 검사','체크리스트','8가지','검사 결과'],title:'검수 화면 확인',answer:'review.html 경로를 Chrome에서 열고, 오른쪽 아래 자동 검사 8가지가 모두 초록색 체크인지 먼저 확인합니다. 이어서 사업명과 숫자, 최초 5장 이미지, CTA 회사 정보를 체크리스트에 적힌 차례대로 대조합니다.',href:'chapter-08f-blog-write.html#/13'},
    {keywords:['최초 5장','5장 이미지','대형 타이포','미리보기 이미지','표지 문구'],title:'최초 5장 이미지',answer:'네이버 검색 결과에는 글마다 이미지 5개가 미리보기로 나옵니다. 그래서 표지와 메시지 카드를 대형 타이포로 만들고, 문구가 본문과 맞는지와 글자가 잘리지 않았는지 확인합니다.',href:'chapter-08f-blog-write.html#/15'},
    {keywords:['수정 요청','고칠 곳','검수 화면에서 고칠','고칠 곳 요청','고쳐 줘','바꿔 줘','차트로','굵게','밑줄','꾸미기'],title:'검수 화면에서 고칠 곳 요청',answer:'고칠 곳은 ‘카드 2번’, ‘실사 3번’처럼 어느 이미지나 문단인지 짚어서 말합니다. Codex가 고치고 검사를 다시 통과하면 검수 화면을 F5로 새로 고쳐 확인합니다. 굵게·밑줄 같은 꾸미기는 글이 올라간 뒤 직접 합니다.',href:'chapter-08f-blog-write.html#/17'},
    {keywords:['발행','발행이라고','3시간','한 글자씩','붙여넣기','노트북 덮개'],title:'발행과 3시간 뒤 예약',answer:'검수 화면에 고칠 곳이 없으면 발행이라고 답합니다. Codex가 제목과 본문을 한 글자씩 입력하고 3시간 뒤로 예약합니다. 네이버에는 원고를 복사해 붙여 넣지 않고, 입력하는 10분 정도는 Chrome 창을 건드리거나 노트북 덮개를 닫지 않습니다.',href:'chapter-08f-blog-write.html#/18'},
    {keywords:['예약 결과','결과 코드','예약 시각','시각 지정','내일 오전','예약 시간'],title:'예약 결과와 시각 지정',answer:'입력이 끝나면 Codex가 예약 시각, 글 제목, 결과 코드를 알려 줍니다. 결과 코드 0이면 정상입니다. 시각을 정하려면 발행 대신 ‘내일 오전 9시에 예약해 줘’처럼 답합니다.',href:'chapter-08f-blog-write.html#/19'},
    {keywords:['올라간 글','글 수정','발행한 글','예약한 글 수정','네이버에서 수정','블로그 글 수정'],title:'올라간 글은 직접 고치기',answer:'예약했거나 이미 올라간 글은 네이버 블로그에서 직접 고칩니다. Codex는 네이버 글을 고치지 않으므로, 고칠 곳은 발행이라고 답하기 전에 검수 화면에서 모두 요청합니다.',href:'chapter-08f-blog-write.html#/20'},
    {keywords:['예약 발행 목록','예약 취소','예약 지우기','예약 삭제','예약 글 확인','휴지통'],title:'예약 글 확인과 취소',answer:'글쓰기 화면 위쪽의 ‘예약 발행 1건’을 누르면 예약해 둔 글 목록이 나옵니다. 올리지 않기로 한 글은 제목을 확인한 뒤 줄에 마우스를 올려 휴지통을 누릅니다.',href:'chapter-08f-blog-write.html#/21'},
    {keywords:['메타 자동화','meta 자동화','sns 자동화','인스타 자동화','인스타그램 자동화'],title:'Meta SNS 자동화',answer:'Meta 연결은 폴라애드에서 미리 끝냈고, 메일로 받은 토큰 두 개만 Codex에게 주면 됩니다. 직접 하는 일은 토큰 전달, 계정 확인, 게시 승인, 앱에서 확인입니다.',href:'chapter-08g-sns.html#/2'},
    {keywords:['인스타 예약','인스타그램 예약','그날 설정','게시는 그날','sns 예약','쓰레드 예약','페이지 예약','예약 게시','미리 작성','분산','고급과정','pc가 꺼','노트북이 꺼'],title:'SNS 게시는 그날 설정',answer:'인스타그램·페이스북·쓰레드는 PC나 노트북이 켜져 있어야 올라가고, API로는 다른 날짜 예약이 되지 않습니다. 그래서 필요할 때 그날 올릴 것만 설정합니다. 예약이나 미리 쓴 글을 나눠 올리는 방식은 폴라애드 고급과정 개별교육에서 다룹니다.',href:'chapter-08g-sns.html#/3'},
    {keywords:['토큰','시스템사용자 토큰','시스템 사용자 토큰','쓰레드 토큰','토큰 붙여넣기','토큰 경고','env'],title:'토큰 두 개 붙여넣기',answer:'메일의 시스템사용자 토큰과 쓰레드 토큰을 앞뒤 빈칸 없이 복사해 교육 화면 문장의 대괄호 자리에 넣고 보냅니다. Codex가 .env 파일에 저장하고 깃 업로드 대상에서 뺍니다. 채팅에 넣지 말라는 경고가 나와도 무시하고 진행합니다.',href:'chapter-08g-sns.html#/5'},
    {keywords:['연결 확인','계정 확인','연결된 계정','다른 회사 계정','권한 오류','계정 이름'],title:'연결된 계정 확인',answer:'Codex가 연결을 검증하고 페이지, 인스타그램, 쓰레드 계정 이름을 보여 줍니다. 모두 본인 계정이면 확인이라고 답하고, 다른 회사 계정이나 권한 오류가 보이면 확인하지 말고 폴라애드에 알립니다.',href:'chapter-08g-sns.html#/6'},
    {keywords:['카드뉴스','카드 뉴스','1080×1440','1080x1440','1440','프로필 그리드','블로그 글로'],title:'블로그 글로 카드뉴스 만들기',answer:'08F에서 만든 블로그 글 폴더를 적어 카드뉴스를 요청하면 표지, 메시지 카드 4장, 회사 카드까지 6장이 1080×1440(3:4)으로 만들어집니다. 카드 속 숫자와 사업명은 블로그 사실 카드에 있는 값만 씁니다.',href:'chapter-08g-sns.html#/7'},
    {keywords:['캡션','줄바꿈','이모지','해시태그','모바일 폭','14 20자'],title:'인스타그램 캡션 확인',answer:'검수 화면에서 캡션이 한 줄 14~20자로 끊기고, 문단마다 이모지가 있고, 문장 덩어리가 아닌 문단으로 읽히는지 확인합니다. 해시태그는 마지막 한 줄에 모입니다.',href:'chapter-08g-sns.html#/9'},
    {keywords:['게시','게시라고','인스타 게시','인스타그램 게시','페이지 동시','동시 게시','게시 승인','바로 올라'],title:'게시 승인',answer:'검수 화면의 체크리스트 4개를 확인하고 고칠 곳이 없으면 게시라고 답합니다. 인스타그램과 페이스북 페이지에 같은 내용이 동시에 올라가고, 인스타그램 API에는 예약 기능이 없어 답하는 즉시 올라갑니다.',href:'chapter-08g-sns.html#/10'},
    {keywords:['게시 결과','게시물 주소','9로 끝','12로 끝','다시 올려','중복 게시','앱에서 확인'],title:'게시 결과 확인',answer:'Codex가 두 채널을 다시 읽어 확인하고 게시물 주소를 알려 줍니다. 결과가 9나 12로 끝나면 Codex가 다시 올리지 않고 확인을 요청하므로 같은 게시물을 다시 올려 달라고 하지 않습니다. 휴대폰 앱에서 카드 6장과 캡션도 직접 확인합니다.',href:'chapter-08g-sns.html#/11'},
    {keywords:['직접 만든','사진 올리기','이미지 올리기','영상 올리기','동영상','캐러셀','릴스 올리기','내 사진','파일 위치'],title:'직접 만든 이미지·영상 올리기',answer:'교육 화면 문장에 파일 위치와 전할 내용을 적어 보내면 Codex가 크기를 점검하고 캡션을 써서 검수 화면을 보냅니다. 이미지 여러 장은 캐러셀, 세로 영상은 릴스로 올라가고, 직접 쓴 캡션은 줄바꿈과 이모지만 다듬습니다.',href:'chapter-08g-sns.html#/13'},
    {keywords:['크기 점검','크기','사이즈','1080×1920','1080x1920','1920','해상도','비율'],title:'이미지·영상 크기 점검',answer:'카드뉴스·사진은 1080×1440, 릴스 영상은 1080×1920입니다. 크기가 맞지 않아 ❌가 나온 파일은 올리지 않고, Codex가 어떤 크기로 다시 만들지 알려 줍니다. Codex는 비율을 억지로 늘리거나 자르지 않습니다.',href:'chapter-08g-sns.html#/14'},
    {keywords:['쓰레드 컨셉','쓰레드 말투','쓰레드 주제','컨셉','독자','말투'],title:'쓰레드 컨셉 정하기',answer:'누구에게, 어떤 정보를, 어떤 말투로 전할지 교육 화면 문장의 빈칸을 바꿔 보냅니다. 정하지 않은 부분은 존댓말, 정보 전달형, 상담 권유·회사명·링크 없음이라는 키트 기본값을 따릅니다.',href:'chapter-08g-sns.html#/15'},
    {keywords:['쓰레드','threads','쓰레드 4편','4편','하루 4번','쓰레드 시간','08 00','11 30','그날 글','오늘 올릴'],title:'쓰레드 그날 4편 올리기',answer:'Codex가 컨셉대로 쓴 4편을 보여 주면 확인이라고 답합니다. PC가 켜져 있는 동안 08:00·11:30·15:00·18:30에 한 편씩 올라가고, 못 올린 글은 다음 날로 넘어가지 않습니다. 올리는 날마다 ‘오늘 올릴 쓰레드 글 4편 준비해 줘’라고 요청합니다.',href:'chapter-08g-sns.html#/18'},
    {keywords:['첫 글','첫글','쓰레드 첫 글','첫 글 규칙','이미지 링크','링크 넣','노출 불리','자동 답글','자동 좋아요','추가 글'],title:'쓰레드 첫 글 규칙',answer:'첫 글에 이미지나 링크를 넣으면 검색과 노출에 불리해서 첫 글은 정보만 담고, 추가 글은 첫 글에 답글로 붙습니다. 자동 답글이나 자동 좋아요처럼 티 나는 활동은 하지 않습니다.',href:'chapter-08g-sns.html#/17'},
    {keywords:['토큰 만료','쓰레드 토큰 만료','토큰이 만료','만료되','60일','토큰 갱신','만료'],title:'쓰레드 토큰 만료',answer:'쓰레드 토큰은 60일마다 만료되지만 Codex가 자동으로 갱신합니다. 직접 할 일은 없습니다.',href:'chapter-08g-sns.html#/19'},
    {keywords:['메타 광고','meta 광고','광고 자동화','잠재 고객 광고','직접 하는 일'],title:'Meta 광고 자동화',answer:'08G에서 연결한 시스템사용자 토큰을 그대로 씁니다. 광고 설정은 Codex가 키트 표준대로 하고, 직접 하는 일은 요청 문장 보내기, 광고 확인, 게재 시작입니다. Meta 정책 동의는 폴라애드에서 미리 끝냈습니다.',href:'chapter-08h-ads.html#/2'},
    {keywords:['표준 광고','광고 설정표','표준 설정','25세','제주','인스타그램만','노출 위치','광고 이름','신청하기 버튼'],title:'표준 광고 설정',answer:'한국어, 대한민국(제주 제외), 25세 이상, 노출 위치는 인스타그램만, 버튼은 신청하기로 만듭니다. 이름은 YYMMDD_소재·목표명으로 캠페인·세트·광고·양식을 통일합니다. 만든 뒤 Meta에서 다시 읽어 이 표와 한 줄씩 대조합니다.',href:'chapter-08h-ads.html#/3'},
    {keywords:['지역 광고','특정 지역','지역만','단가','시 전체','지역 이름'],title:'지역 광고와 단가',answer:'전국을 기본으로 하고, 지역 광고가 필요하면 광고 요청 문장의 지역에 ‘창원시 전체’처럼 지역 이름을 적습니다. Codex가 그 지역 전체를 덮는 중심 좌표와 반경 10km 이상으로 잡습니다. 특정 지역만 공략하면 단가가 3~4배 오를 수 있습니다.',href:'chapter-08h-ads.html#/9'},
    {keywords:['고객이 보는','양식 화면','신청하기 누르면','자동 입력','이름 연락처'],title:'고객이 보는 입력양식',answer:'광고에서 신청하기를 누른 고객에게 질문, 개인정보, 완료 화면이 차례로 나옵니다. 질문 네 개에 답하면 이름과 연락처는 Facebook·Instagram 정보로 자동 입력됩니다.',href:'chapter-08h-ads.html#/4'},
    {keywords:['광고 계정 점검','계정 점검','점검 요청','광고 권한'],title:'광고 계정 점검',answer:'‘Meta 광고 계정을 점검해 줘’ 문장을 보내면 Codex가 광고 권한, 광고 계정, 결제 수단, 잠재 고객 광고 약관 동의 상태를 확인합니다. 08G에서 토큰 연결과 계정 확인을 마친 뒤 진행합니다.',href:'chapter-08h-ads.html#/5'},
    {keywords:['점검 결과','결제 수단이 없','결제수단 없','약관 동의','약관','차별 금지','정책 동의','준비 완료'],title:'점검 결과와 대처',answer:'모두 준비됐으면 바로 입력양식으로 넘어갑니다. 결제 수단이 없다고 나오면 교육 05장대로 등록하고, 약관 동의가 반영되지 않았다고 나오면 폴라애드에 알립니다. 잠재 고객 광고 약관과 차별 금지 정책 동의는 폴라애드에서 미리 처리합니다.',href:'chapter-08h-ads.html#/6'},
    {keywords:['입력폼','입력양식','양식 요청','양식 질문','질문 바꾸','완료 화면','정보 취급','양식 이름'],title:'입력양식 요청 문장',answer:'교육 화면의 입력폼 요청 문장을 그대로 보냅니다. 사업자 종류, 지역, 업종/회사명, 직전년도 매출 네 질문과 정보 취급 설명, 완료 화면 문구가 모두 들어 있습니다. 질문이나 문구를 바꾸고 싶으면 문장에서 고쳐 보내면 그대로 만들어집니다.',href:'chapter-08h-ads.html#/7'},
    {keywords:['개인정보처리방침','privacy','양식 수정','양식 고치','양식 대조','7줄'],title:'입력양식 대조와 개인정보처리방침',answer:'Codex가 양식을 만든 뒤 Meta에서 다시 읽어 일곱 줄을 대조하고, 모두 ✅이면 준비된 것입니다. 개인정보처리방침은 회사 홈페이지 주소 뒤에 /privacy를 붙여 씁니다. 양식은 만든 뒤 고칠 수 없어서 문구를 바꾸려면 새 이름으로 다시 요청합니다.',href:'chapter-08h-ads.html#/8'},
    {keywords:['광고 만들기','광고 요청','광고 만들어','하루 예산'],title:'광고 만들기 요청 문장',answer:'교육 화면 문장에서 하루 예산, 광고 이미지, 지역을 바꿔 보냅니다. 직접 만든 이미지는 파일 경로를 적습니다. Codex가 광고를 꺼진 상태로 만들고 설정 확인표를 보여 줍니다.',href:'chapter-08h-ads.html#/9'},
    {keywords:['광고 이미지','1080×1350','1080x1350','1350','금지 표현','무조건','승인 보장','광고 거부','광고 문구','본문 첫 줄'],title:'광고 이미지와 문구 규칙',answer:'블로그 글 표지를 인스타그램 피드 광고 크기 1080×1350(4:5)으로 다시 그립니다. 본문 첫 줄에는 대상과 혜택을, 마지막 줄에는 신청하기 버튼 안내를 씁니다. ‘무조건’, ‘100%’, ‘승인 보장’처럼 결과를 약속하는 말은 광고 검토에서 거부되어 쓰지 않습니다.',href:'chapter-08h-ads.html#/10'},
    {keywords:['설정 확인표','확인표','일시 중지','꺼진 상태','광고비가 나가','표준과 다른'],title:'설정 확인표',answer:'Codex가 광고를 꺼진 상태로 만들고 Meta에서 다시 읽은 값을 표로 보여 줍니다. 모든 줄이 ✅이고 상태가 일시 중지인지 확인합니다. 꺼져 있는 동안에는 광고비가 나가지 않고, 표준과 다른 줄이 있으면 게재를 시작하지 않습니다.',href:'chapter-08h-ads.html#/11'},
    {keywords:['광고 관리자 주소','광고 관리자 확인','광고 관리자 열기','잠재 고객 센터','잠재고객센터','리드센터','leads center','ctrl 클릭','주소 클릭'],title:'광고 관리자·잠재 고객 센터 열기',answer:'Codex가 알려 준 주소를 VS Code 터미널에서 Ctrl 키를 누른 채 클릭하면 바로 열립니다. 08H STEP 08의 버튼으로도 열 수 있습니다. 광고 관리자에서는 캠페인 이름, 꺼짐 상태, 하루 예산을 확인만 하고 직접 켜지 않습니다.',href:'chapter-08h-ads.html#/12'},
    {keywords:['게재 시작','광고 켜기','광고 켜','광고 시작','검토 시간','노출 시작','언제 노출'],title:'게재 시작',answer:'확인이 끝나면 게재 시작이라고 답합니다. Codex가 한 번 더 대조한 뒤 광고, 광고 세트, 캠페인을 켭니다. Meta 광고 검토가 끝나면 노출이 시작되고, 보통 몇 분에서 24시간 걸립니다.',href:'chapter-08h-ads.html#/13'},
    {keywords:['광고 상태','광고 끄','광고를 끄','광고 꺼','광고 중지','광고 멈추','광고 수정','문구 바꾸','이미지 바꾸','노출 수','클릭 수'],title:'광고 상태 확인과 끄기',answer:'‘광고 상태 알려 줘’, ‘광고 꺼 줘’처럼 말로 요청합니다. 노출·클릭 수는 광고 관리자에서 직접 확인합니다. 게재 중인 광고는 고치지 않고, 문구나 이미지를 바꾸려면 끈 뒤 새 이름으로 새 광고를 요청합니다.',href:'chapter-08h-ads.html#/14'},
    {keywords:['상담신청','상담 신청','접수 확인','신청 확인','리드 확인','신청이 들어','db 확인'],title:'광고 접수 확인',answer:'광고로 들어온 상담 신청은 제작한 홈페이지 관리자 대시보드의 상담신청에 쌓이고 텔레그램 메시지로도 바로 옵니다. 이 자동 전달은 8주 지원 기간에 작동합니다(11장). Meta에서 직접 보려면 잠재 고객 센터를 엽니다.',href:'chapter-08h-ads.html#/15'},
    {keywords:['콘텐츠','게시물','릴스','reels','쓰레드','threads','게시 실습'],title:'소셜 콘텐츠 게시 실습',answer:'Instagram 게시물, Reels, Threads의 실제 모바일 게시 과정을 콘텐츠 교육에서 확인합니다.',href:'social-content-training.html'},
    {keywords:['스타트패키지','로고','추상 로고','캘리그라피','인쇄물','명함','명찰','대봉투','계약서','홈페이지 스타일'],title:'스타트패키지 제작 범위',answer:'단순 엠블럼과 레퍼런스가 있는 로고를 기준으로 진행하며 홈페이지 10종과 인쇄물 예시를 확인할 수 있습니다.',href:'chapter-09-startpackage.html#/2'},
    {keywords:['추가 인쇄','재인쇄','인쇄 비용','명함 비용','대봉투 비용','계약서 비용'],title:'추가 인쇄비',answer:'명함은 추가 22,000원, 대봉투는 220,000원, 자문계약서는 330,000원이며 모두 VAT 포함 기준입니다.',href:'chapter-12-rules-costs.html#/14'},
    {keywords:['8주 지원','마케팅 지원','광고소재 등록','광고계정 설정','접수 알림','접수 자동화'],title:'8주 Meta 마케팅 지원',answer:'교육 시작일부터 8주 동안 광고소재 등록, 광고계정 설정, Meta 양식 접수 알림 자동화를 지원합니다. 지원 종료 후 Meta 접수자동화는 종료되고 홈페이지 자체 접수 알림은 계속 작동합니다.',href:'chapter-10-marketing-support.html#/2'},
    {keywords:['텔레그램','telegram','텔레그램 알림','담당자 텔레그램'],title:'담당자 Telegram 접수 알림',answer:'Meta 양식으로 신규 고객이 접수되면 내부 접수관리 화면과 담당자 Telegram에 고객명, 연락처, 접수경로가 동시에 전달됩니다.',href:'chapter-10-marketing-support.html#/6'},
    {keywords:['접수 자동화','담당자 알림','알림톡','문자 알림','접수관리','고객 통계','접수자동화'],title:'Meta 접수자동화 작동 과정',answer:'광고소재 제작, 광고 설정, 접수폼 설정 후 내부 접수관리와 담당자 Telegram으로 동시에 전달됩니다. 이어서 고객 문자 또는 알림톡과 홈페이지 접수관리로 연결됩니다.',href:'chapter-10-marketing-support.html#/9'},
    {keywords:['광고운영대행','운영대행','콘텐츠대행','대행 상품','99만원','66만원','165만원','33만원','22만원','대행상품'],title:'폴라애드 대행상품',answer:'광고운영대행은 월 33만원 기준 3개월 99만원, 콘텐츠대행은 월 22만원 기준 3개월 66만원입니다. 함께 신청하면 3개월 합계 165만원입니다.',href:'chapter-10-marketing-support.html#/11'},
    {keywords:['관련정보','자료 제출','gmail','지메일','도메인','cloudflare','클라우드플레어'],title:'관련정보 제출안내',answer:'홈페이지 연결용 Gmail ID/PW와 도메인 주소가 필요합니다. 도메인은 연간 약 13,000원부터 30,000원 내외이며 Cloudflare 구매를 권장합니다.',href:'chapter-11-submission-guide.html#/1'},
    {keywords:['유지비','서버비','서버 비용','호스팅','월 비용','vercel','github','서버리스','정적 사이트'],title:'홈페이지 유지비',answer:'홈페이지 제작 후에는 매달 나가는 서버 비용이 없고 1년에 한 번 도메인 비용만 결제합니다. 사용량이 늘어 유료 구간에 들어가도 개인 사용자는 월 4만원을 넘기 어렵습니다.',href:'chapter-12-rules-costs.html#/3'},
    {keywords:['디자인 요청','디자이너','문의하기','영업시간','전화 문의'],title:'디자인 요청 방법',answer:'스타트패키지 메뉴의 문의하기에 요청을 남기면 담당 디자이너가 영업시간(오전 9시~오후 6시) 안에 안내합니다. 개별 전화보다 문의 내용으로 남기는 것을 권장합니다.',href:'chapter-12-rules-costs.html#/8'},
    {keywords:['고급스럽게','깔끔하게','로고 요청','ai 로고','ai 시안','로고 시안'],title:'로고 요청 기준',answer:'느낌 표현만으로는 로고를 제작할 수 없습니다. 정확한 모양과 들어갈 내용이 필요하며, 자료가 없으면 AI 시안을 만든 뒤 인쇄용 일러스트 파일로 단순화합니다.',href:'chapter-12-rules-costs.html#/10'},
    {keywords:['인쇄 색상','색상 차이','색이 달라','모니터 색','컬러 프로파일'],title:'화면과 인쇄 색상 차이',answer:'모니터와 휴대폰은 디스플레이마다 컬러 프로파일이 달라 같은 시안도 색이 다르게 보이며 실제 인쇄 색상과도 차이가 날 수 있습니다.',href:'chapter-12-rules-costs.html#/13'},
    {keywords:['도메인 구매','대리구매','도메인 대리','도메인 계정','인쇄 지연','도메인 준비'],title:'인쇄 전 도메인 준비',answer:'명함과 봉투에 홈페이지 주소가 들어가므로 인쇄 전에 도메인을 확정해야 합니다. 이미 있으면 구매한 사이트의 ID와 PW를 전달하고, 없으면 폴라애드에 대리구매를 요청합니다. 결제는 대표자 본인 카드로 하며 자료 제출 › 마케팅에 올린 카드 앞면으로 진행합니다.',href:'chapter-11-submission-guide.html#/6'},
    {keywords:['8주 이후','지원 종료','지원 기간 이후','개별 비용'],title:'8주 이후 작업 비용',answer:'마케팅 지원기간은 교육 시작일부터 8주입니다. 이후에도 상담은 가능하지만 실제 작업은 건별로 비용이 발생합니다.',href:'chapter-12-rules-costs.html#/15'},
    {keywords:['시안 비용','추가 시안','시안 추가','2만원','20,000원'],title:'추가 시안 비용',answer:'스타트패키지 디자인은 시안 작업 2회까지 별도 요금이 없고, 3회차부터 회당 20,000원이 추가됩니다.',href:'chapter-12-rules-costs.html#/16'},
    {keywords:['시안 확정','발주 확정','오탈자','재인쇄 책임','본인 부담'],title:'시안 확정과 재인쇄 책임',answer:'시안 확정 화면의 시안 표기 정보, 배송지 확인, 최종 동의를 대표자가 직접 확인해야 발주가 확정됩니다. 확인 없이 확정해 오탈자가 인쇄되면 재인쇄 비용은 대표자 본인이 부담합니다.',href:'chapter-12-rules-costs.html#/17'},
    {keywords:['네이버클라우드','네이버 클라우드','ncloud','sens','sms 발송'],title:'네이버클라우드 가입',answer:'문자와 알림톡은 네이버클라우드 SENS에서 보냅니다. Gmail로 가입한 뒤 사업자 정보를 바꾸고 결제수단을 등록하는 영상을 따라하세요.',href:'chapter-13-alert-setup.html#/3'},
    {keywords:['발신번호','통신서비스 이용증명원','이용증명원','재직증명서','신분증'],title:'문자 발신번호 등록 서류',answer:'사업자등록증, 대표자 신분증, 통신서비스 이용증명원을 번호와 명의를 가리지 않고 제출합니다. 대표자와 발신번호 명의가 다르면 재직증명서도 필요합니다.',href:'chapter-13-alert-setup.html#/4'},
    {keywords:['카카오 채널','카카오톡 채널','비즈니스 심사','채널 심사','알림톡 채널','관리자 초대'],title:'카카오톡 채널 개설과 심사',answer:'대표자 본인 카카오계정으로 채널을 만들고 비즈니스 심사를 신청한 뒤 polarad@kakao.com을 관리자로 초대합니다. 심사는 영업일 3~7일 걸립니다.',href:'chapter-13-alert-setup.html#/5'},
    {keywords:['텔레그램 설정','텔레그램 알림 설정','전화번호 숨기기','텔레그램 진동','텔레그램 소리','텔레그램 기본설정','텔레그램 기본 설정'],title:'텔레그램 기본설정',answer:'홈페이지 제작 후 받은 링크로 알림 채널에 참여한 뒤 전화번호 보호와 채널 알림을 설정합니다.',href:'chapter-13-alert-setup.html#/7'},
    {keywords:['텔레그램 웹','pc 텔레그램','웹에서 보기','텔레그램 pc','qr 로그인','pc 웹','웹에서 텔레그램'],title:'PC 웹에서 텔레그램 보기',answer:'프로그램 설치 없이 PC 브라우저에서 web.telegram.org를 열고 휴대폰 텔레그램의 설정 › 기기 › 기기 추가로 QR을 스캔합니다.',href:'chapter-13-alert-setup.html#/8'},
    {keywords:['자료 제출 위치','어디에 제출','제출 위치','자료 제출','문의하기','보내는 곳'],title:'자료를 보내는 곳',answer:'사업 정보와 디자인 자료는 자료 제출 메뉴에, 홈페이지 스타일과 Gmail은 홈페이지 제작요청 메뉴에 입력합니다. 디자인 요청과 도메인 정보는 문의하기로, 진행 일정 문의는 카카오톡으로 보냅니다.',href:'chapter-11-submission-guide.html#/13'},
    {keywords:['계정 보안','비밀번호 보안','비밀번호 전달','암호화','계정 정보'],title:'계정 정보 보관',answer:'제출 화면에 입력한 비밀번호는 암호화되어 저장되고, 신분증, 통신서비스 이용증명원, 카드 앞면은 서버에 저장하지 않고 담당자에게만 전달됩니다. 연결이 끝나면 비밀번호 변경을 권장합니다.',href:'chapter-11-submission-guide.html#/5'},
    {keywords:['광고비','문자 비용','알림톡 비용','발송비','카드 결제','나가는 비용'],title:'대표님 카드로 나가는 비용',answer:'도메인은 1년에 한 번, Meta 광고비는 설정한 일 예산만큼, 문자와 알림톡은 보낸 건수만큼 대표님 카드로 결제됩니다. 홈페이지 서버는 대부분 0원입니다.',href:'chapter-12-rules-costs.html#/7'},
    {keywords:['제작 기간','시안 언제','인쇄 기간','배송 기간','며칠'],title:'시안과 인쇄물 제작 기간',answer:'시안은 오전 11시 전 요청 시 영업일 2일차, 이후 요청 시 3일차에 전달됩니다. 인쇄물은 발주 확정 후 명함 2~3일, 명찰 3~4일, 대봉투 4~5일, 자문계약서 7일이 걸립니다.',href:'chapter-12-rules-costs.html#/18'}
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
  assistantPanel.innerHTML='<div class="assistant-head"><div><b>교육 도우미</b><span>메뉴명이나 궁금한 내용을 입력하세요.</span></div><button type="button" class="assistant-close" aria-label="교육 도우미 닫기">×</button></div><div class="assistant-quick"></div><form class="assistant-form"><input type="text" aria-label="교육 질문" placeholder="예: 지역 타겟팅은 어디서 설정하나요?"><button type="submit">찾기</button></form><div class="assistant-answer" aria-live="polite"><strong>교육내용을 바로 찾아드립니다.</strong><p>질문과 가장 가까운 설명과 이동할 페이지를 표시합니다.</p></div>';
  const quickByFile={'chapter-08-ai-vscode.html':['준비물','VS Code 설치','bas_mkt 폴더','작업 폴더 연결'],'chapter-08b-ai-codex.html':['터미널 열기','Codex 설치','모델 설정','Full Access 권한','샌드박스'],'chapter-08c-ai-session.html':['핸드오프','사용 한도','오류 번호','다음 날 이어서','stream disconnected'],'chapter-08d-ai-kit.html':['키트 내려받기','관리자 승인','ChatGPT 앱','크롬 확장','네이버 첫 로그인'],'chapter-08e-blog-setup.html':['이미지 규격','블로그 아이디','블로그씨','레이아웃','상단 배경'],'chapter-08f-blog-write.html':['회사 정보','사실 카드','검수 화면','수정 요청','예약 결과','올라간 글'],'chapter-08g-sns.html':['토큰 붙여넣기','카드뉴스','캡션','크기 점검','쓰레드 4편','인스타 예약'],'chapter-08h-ads.html':['광고 계정 점검','입력폼','광고 이미지','설정 확인표','게재 시작','광고 끄기','상담신청']};
  const quickBox=assistantPanel.querySelector('.assistant-quick');
  (quickByFile[currentFile]||['페이지 만들기','고화질 업로드','결제수단','지역 타겟팅','자료 제출 위치','시안 비용']).forEach(label=>{const button=document.createElement('button');button.type='button';button.textContent=label;quickBox.append(button)});
  assistant.append(assistantToggle,assistantPanel);
  const assistantInput=assistantPanel.querySelector('input');
  const assistantAnswer=assistantPanel.querySelector('.assistant-answer');
  const normalize=value=>value.toLowerCase().replace(/[^a-z0-9가-힣$]+/g,' ').trim();
  const answerQuestion=value=>{
    const query=normalize(value);
    if(!query)return;
    const ranked=assistantEntries.map(entry=>{
      let score=entry.keywords.reduce((sum,keyword)=>{
        const key=normalize(keyword);
        return sum+(query.includes(key)?key.length+4:0);
      },0);
      if(score&&entry.href.split('#')[0].toLowerCase()===currentFile)score+=3;
      return {entry,score};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
    if(!ranked.length){
      assistantAnswer.innerHTML='<strong>교육자료에서 답을 찾지 못했습니다.</strong><p>질문 내용을 그대로 정리해 교육 관리자에게 문의해주세요.</p>';
      return;
    }
    const best=ranked[0].entry;
    const more=ranked.slice(1,3).map(item=>`<a href="${item.entry.href}">${item.entry.title}</a>`).join('');
    assistantAnswer.innerHTML=`<strong>${best.title}</strong><p>${best.answer}</p><a href="${best.href}">관련 페이지 열기</a>${more?`<div class="assistant-more"><span>함께 보기</span>${more}</div>`:''}`;
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
