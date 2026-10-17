/* 08D 에이전트 키트 연결: 사람이 직접 해야 하는 일만 보여 주는 목업 튜토리얼 */
window.AI_SETUP_PARTS = window.AI_SETUP_PARTS || {};
window.AI_SETUP_PARTS.D = (h) => {
  const {
    tg,
    I,
    chrome,
    termBase,
    tline,
    head,
    inputLine,
    footerTyping,
    desk,
  } = h;

  /* ---------- 아이콘 ---------- */
  const gptMark = (c = "#fff") =>
    `<svg viewBox="0 0 48 48"><g fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round">${[
      0, 60, 120,
    ]
      .map(
        (r) =>
          `<ellipse cx="24" cy="24" rx="7.2" ry="14.4" transform="rotate(${r} 24 24)"/>`,
      )
      .join("")}</g></svg>`;
  const gptApp = `<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#0d0d0d"/><g transform="translate(8 8) scale(.667)">${gptMark().replace(/<\/?svg[^>]*>/g, "")}</g></svg>`;
  const gptRound = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#0d0d0d"/><g transform="translate(9 9) scale(.625)">${gptMark().replace(/<\/?svg[^>]*>/g, "")}</g></svg>`;
  const allApps = `<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#b4a2ff"/><path d="M13 12l15 7-6 2-2 6z" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const edgeIco = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#0b7fd0"/><path d="M8 27c2-9 12-14 20-11 6 2 8 8 4 11-5 3-12 0-14 5 3 6 13 6 20 0-2 8-9 12-16 12-9 0-15-7-14-17z" fill="#34d399"/><path d="M13 20c3-6 12-8 18-4 4 3 3 8-1 8-6-2-12 0-17-4z" fill="#fff" opacity=".35"/></svg>`;
  const zipIco = `<svg viewBox="0 0 48 48"><path fill="#f0b429" d="M8 5h22l10 10v28H8z"/><path fill="#ffd96b" d="M30 5v10h10z"/><path d="M20 6v3h4V6M20 12v3h4v-3M20 18v3h4v-3M20 24v3h4v-3" stroke="#7a5a00" stroke-width="1.6" fill="none"/><rect x="18" y="29" width="8" height="8" rx="2" fill="#7a5a00"/></svg>`;
  const nodeIco = `<svg viewBox="0 0 48 48"><path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="#5fa04e"/><text x="24" y="31" text-anchor="middle" font-family="Segoe UI,Arial" font-weight="700" font-size="17" fill="#fff">JS</text></svg>`;
  const shield = `<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z" fill="#0067c0"/><path d="m8.2 12 2.7 2.8 5-5.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ico = (p, c = "#555") =>
    `<svg viewBox="0 0 24 24"><path d="${p}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const IC = {
    home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
    box: "M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10",
    clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2",
    at: "M12 3a9 9 0 1 0 5 16.5M16 8v5a2.2 2.2 0 0 0 4.4 0V12M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    dots: "M5 12h.1M12 12h.1M19 12h.1",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 17h6M17 14v6",
    dl: "M12 4v11M7 11l5 5 5-5M5 20h14",
    gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8",
    gauge: "M4 17a8 8 0 1 1 16 0M12 17l4-5",
    pet: "M12 4c4 0 7 3 7 7.5S16 20 12 20s-7-4-7-8.5S8 4 12 4ZM9.5 11h.1M14.5 11h.1M10 15c1 1 3 1 4 0",
    send: "M20 4 4 11l6 2 2 6zM10 13l10-9",
    help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4M12 16.5h.1",
    out: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h11",
    cu: "M7 4l12 7-5 1.6L12 18z",
    web: "M4 5h16v14H4zM4 9h16M8 13l3 3 3-5",
  };

  /* ---------- 앱 창 공통 ---------- */
  const RAIL = ["home", "box", "clock", "at", "dots", "grid"];
  const rail = (menuOpen) =>
    `<nav class="d-rail">${RAIL.map((k, i) => `<i${i === 0 ? ' class="dotted"' : ""}>${ico(IC[k])}</i>`).join("")}<span class="grow"></span><i class="dlb">${ico(IC.dl, "#fff")}</i><i class="av${menuOpen ? " open" : ""}">내</i></nav>`;
  const NAVS = [
    [
      "개인",
      [
        "일반",
        "알림",
        "가져오기",
        "프로필",
        "모양",
        "계정",
        "Archived chats",
        "자녀 보호",
        "신뢰할 수 있는 연락처",
        "음성 스타일",
        "저장 공간",
        "구성",
        "개인 맞춤 설정",
        "Mini 및 펫",
        "키보드 단축키",
        "사용량 및 청구",
        "데이터 관리",
      ],
    ],
    [
      "통합",
      ["플러그인", "비밀번호", "컴퓨터 사용", "브라우저", "클라우드 컴퓨터"],
    ],
    ["코딩", ["Hook", "연결", "Codex 클라우드"]],
  ];
  const setNav = (on) =>
    `<aside class="d-nav"><h4>설정<i>≡</i></h4><div class="d-search">⌕ 검색</div>${NAVS.map(
      ([g, items]) =>
        `<h5>${g}</h5>${items.map((x) => `<div class="${x === on ? "on" : ""}"><i></i>${x}</div>`).join("")}`,
    ).join("")}</aside>`;
  const appTitle = (name) =>
    `<div class="d-atitle"><span class="arrows">←&nbsp;&nbsp;→</span><span class="m">파일</span><span class="m">편집</span><span class="m">보기</span><span class="m">도움말</span><div class="wctl"><i>—</i><i>▢</i><i class="x">✕</i></div></div>`;
  const appWin = (navHtml, mainHtml, overlay = "", menuOpen = false) =>
    `<div class="screen light"><div class="d-app">${appTitle()}<div class="d-abody${navHtml ? " with-nav" : ""}">${rail(menuOpen)}${navHtml}<main class="d-main">${mainHtml}</main></div>${overlay}</div></div>`;

  /* ---------- 설정 화면 ---------- */
  const tog = (on, n, label) =>
    n === undefined
      ? `<span class="d-tog${on ? " on" : ""}"><i></i></span>`
      : tg("<i></i>", n, label, `d-tog${on ? " on" : ""}`, "span");
  const btn = (text, n, label) =>
    n === undefined
      ? `<span class="d-btn">${text}</span>`
      : tg(text, n, label, "d-btn", "span");
  const row = (icon, title, sub, right) =>
    `<div class="d-row"><span class="d-ic">${icon}</span><div class="d-rt"><b>${title}</b><span>${sub}</span></div><div class="d-ra">${right}</div></div>`;
  const dotSub = (red, text) =>
    `<i class="d-dot ${red ? "red" : "green"}"></i>${text}`;
  const pageHead = (t, p) => `<h1>${t}</h1><p class="d-sub">${p}</p>`;

  // t: 'all' | 'install' | 'chrome' : 어느 요소가 누를 곳인지
  const computerUse = (n, o) => {
    const T = o.target;
    const allRight = tog(
      o.all,
      T === "all" ? n : undefined,
      "모든 앱 스위치 켜기",
    );
    const chromeRight =
      o.chrome === "none"
        ? btn(
            "설치하기",
            T === "install" ? n : undefined,
            "Google Chrome · 설치하기",
          )
        : `${btn("관리")}${tog(true, T === "chrome" ? n : undefined, "Chrome 연결 켜짐 확인")}`;
    const chromeSub =
      o.chrome === "none"
        ? dotSub(true, "브라우저 확장 프로그램이 설치되지 않음")
        : dotSub(false, "브라우저 확장 프로그램 설치함");
    const main = `<div class="d-page">${pageHead("컴퓨터 사용", "ChatGPT가 컴퓨터의 다른 앱을 사용하는 방식을 관리합니다")}<h3>제어</h3><div class="d-card">${row(allApps, "모든 앱", "ChatGPT가 컴퓨터의 앱을 제어하도록 허용합니다", allRight)}${row(I.chrome, "Google Chrome", chromeSub, chromeRight)}${row(edgeIco, "Microsoft Edge", dotSub(true, "브라우저 확장 프로그램이 설치되지 않음"), btn("설치하기"))}</div></div>`;
    return appWin(setNav("컴퓨터 사용"), main);
  };

  const browserPage = (n) => {
    const main = `<div class="d-page">${pageHead("브라우저", "브라우저 사용 환경설정 및 사이트 접근 권한을 관리합니다.")}<div class="d-card first">${row(ico(IC.web, "#222"), "브라우저", "ChatGPT가 내장 브라우저를 제어하도록 허용", btn("설정 진행", n, "설정 진행"))}</div></div>`;
    return appWin(setNav("브라우저"), main);
  };

  /* ---------- 앱 홈 + 프로필 메뉴 ---------- */
  const homeMain = `<div class="d-home"><div class="d-gmark">${gptRound}</div><b>무엇을 도와드릴까요?</b><div class="d-composer"><span>ChatGPT에게 요청하기</span><i>↑</i></div></div>`;
  const avatarMenu = (n) =>
    `<div class="d-avmenu"><div class="hd"><i>내</i><b>내 계정</b></div><div class="mi">${ico(IC.gauge)}<span>사용량</span><em>90% 남음</em></div><div class="mi">${ico(IC.pet)}<span>Show Pet</span><em>Alt+Win+P</em></div><div class="mi">${ico(IC.send)}<span>친구 초대</span></div>${tg(`${ico(IC.gear)}<span>설정</span><em>Ctrl+,</em>`, n, "설정", "mi", "div")}<hr><div class="mi">${ico(IC.help)}<span>도움말</span><em>›</em></div><div class="mi">${ico(IC.out)}<span>로그아웃</span></div></div>`;

  /* ---------- 네이버 ---------- */
  const nvLogo = `<img class="d-nvlogo" src="./assets/naver-wordmark.svg" alt="NAVER">`;
  const nvFav = `<span class="d-nvfav">N</span>`;
  const nvHost = (path) => `nid.naver.com<span class="path">${path}</span>`;
  const nvLogin = (n) =>
    chrome(
      "NAVER : 로그인",
      nvFav,
      nvHost("/nidlogin.login"),
      `<div class="d-nv"><div class="d-nvbox">${nvLogo}<div class="d-nvtabs"><span class="on">ID/전화번호</span><span>일회용 번호</span><span>QR코드</span></div><div class="d-nvin"><i class="u"></i><span>myblog</span></div><div class="d-nvin pw"><i class="k"></i><span>••••••••••</span></div><div class="d-nvopt"><span class="keep"><i class="ck">✓</i>로그인 상태 유지</span><span class="ip">IP보안<i class="d-nvtog"><b></b></i></span></div>${tg("로그인", n, "로그인 버튼", "d-nvbtn", "div")}<div class="d-nvlinks">비밀번호 찾기 <i></i> 아이디 찾기 <i></i> 회원가입</div></div></div>`,
    );
  const nvDevice = (n) =>
    chrome(
      "NAVER : 로그인",
      nvFav,
      nvHost("/nidlogin.login"),
      `<div class="d-nv"><div class="d-nvbox dev">${nvLogo}<h2>새로운 기기(브라우저)에서<br>로그인되었습니다.</h2><p>자주 사용하는 기기라면 등록해 주세요.</p><div class="d-nvbtns"><span class="reg">등록</span>${tg("등록안함", n, "등록안함", "off", "span")}</div></div></div>`,
    );

  /* ---------- 크롬 웹 스토어 ---------- */
  const cwsBody = (btnHtml) =>
    `<div class="d-cws"><div class="d-cws-top"><b><i></i>Chrome 웹 스토어</b><span class="s">⌕ 확장 프로그램 및 테마 검색</span></div><div class="d-cws-main"><div class="d-cws-ico">${gptApp}</div><div class="d-cws-info"><h2>ChatGPT</h2><p class="by">제공: <u>openai.com</u></p><p class="kind">확장 프로그램</p></div><div class="d-cws-act">${btnHtml}</div></div><div class="d-cws-tabs"><span class="on">개요</span><span>개인정보 보호</span><span>관련</span></div><div class="d-cws-desc"><h4>개요</h4><p>Control your browser with ChatGPT.</p></div></div>`;
  const cwsFav = `<span class="d-cwsfav"></span>`;
  const cwsHost = `chromewebstore.google.com<span class="path">/detail/chatgpt</span>`;

  /* ---------- 장면 ---------- */
  const KIT_PROMPT =
    "다운로드 폴더의 bas_mkt-agent-kit.zip 파일을 C:\\bas_mkt 폴더에 압축 풀고, AGENTS.md를 읽은 뒤 0번 항목부터 진행해 줘.";

  return [
    {
      cover: 1,
      ey: "CHAPTER 08D · AGENT KIT",
      title: "에이전트 키트<br><em>연결하기</em>",
      desc: "에이전트 키트를 Codex에게 전달하고 사람이 직접 눌러야 하는 승인과 로그인만 차례로 따라 합니다. 나머지 설치와 점검은 Codex가 맡습니다.",
      route: [
        "키트 내려받기",
        "Codex에게 전달",
        "관리자 승인",
        "ChatGPT 앱 설정",
        "네이버 첫 로그인",
      ],
    },
    {
      concept: 1,
      ey: "ROLES",
      title: "사람이 할 일<br><em>다섯 가지</em>",
      desc: "도구 설치와 점검은 Codex가 합니다. 사람은 승인과 로그인처럼 본인만 할 수 있는 일만 합니다.",
      html: `<div class="cards two d-roles"><div class="card on"><small>PERSON</small><strong>사람이 하는 일</strong><ul class="d-list"><li>키트 내려받기와 Codex에게 전달</li><li>관리자 승인 창에서 ‘예’ 누르기</li><li>ChatGPT 앱 로그인과 설정</li><li>네이버 첫 로그인</li><li>발행 전 미리보기 확인</li></ul></div><div class="card"><small>CODEX</small><strong>Codex가 하는 일</strong><ul class="d-list"><li>도구 점검과 설치</li><li>ChatGPT 앱 설치</li><li>네이버 세션 확인과 매일 연장</li><li>원고 검사와 발행</li></ul></div></div>`,
    },
    {
      ey: "STEP 01",
      title: "에이전트 키트<br><em>내려받기</em>",
      desc: "아래 파란 링크를 눌러 bas_mkt-agent-kit.zip 파일을 내려받습니다. 내려받기가 끝나면 Chrome 오른쪽 위 다운로드 창에 파일이 나타납니다.",
      mode: "다운로드 완료 확인",
      tone: "set",
      note: `이 안내 화면에서 바로 받을 수 있습니다.<br><a class="d-kit-dl" href="./assets/downloads/bas_mkt-agent-kit.zip" download>에이전트 키트 내려받기 (zip)</a>`,
      screen: (n) =>
        chrome(
          "에이전트 키트 · 비즈액터스쿨",
          `<span class="d-cwsfav"></span>`,
          `polaai.co.kr<span class="path">/education/course</span>`,
          `<div class="d-kitpage"><small>CHAPTER 08D</small><h2>에이전트 키트</h2><p>Codex에게 전달할 파일입니다.</p><span class="d-kitbtn">에이전트 키트 내려받기 (zip)</span></div>`,
          `<div class="dl-bubble"><h6>최근 다운로드 기록</h6>${tg(`<span>${zipIco}</span><span><b>bas_mkt-agent-kit.zip</b><span>61.1 KB · 완료</span></span><span style="color:#5f6368">📁</span>`, n, "bas_mkt-agent-kit.zip 파일", "dl-item", "div")}<div class="all">전체 다운로드 기록</div></div>`,
        ),
    },
    {
      ey: "STEP 02",
      title: "Codex에게<br><em>키트 전달하기</em>",
      desc: "VS Code 터미널에서 Codex를 열고 아래 문장을 붙여넣은 뒤 Enter를 누릅니다. 압축 풀기부터 도구 설치까지 Codex가 차례로 진행합니다.",
      mode: "복사 → 붙여넣기 → Enter",
      tone: "set",
      copy: [{ label: "Codex에게 보낼 문장", code: KIT_PROMPT, prompt: true }],
      screen: (n) =>
        termBase([
          ...head(),
          "",
          "",
          tline(inputLine(KIT_PROMPT), n, "키트 전달 문장 입력"),
          ...footerTyping(),
        ]),
    },
    {
      ey: "STEP 03",
      title: "관리자 승인<br><em>예 누르기</em>",
      desc: "프로그램을 설치하는 도중 ‘사용자 계정 컨트롤’ 창이 뜨면 게시자를 확인하고 예를 누릅니다. 예를 누르면 설치가 이어집니다.",
      mode: "게시자 확인 → 예",
      tone: "set",
      note: "설치하는 프로그램마다 이 창이 여러 번 뜰 수 있습니다. 게시자가 낯선 이름이면 아니요를 누르고 Codex에게 알려 줍니다.",
      screen: (n) =>
        desk(
          `<div class="d-dim"></div><div class="d-uac"><div class="d-uac-h">${shield}<span>사용자 계정 컨트롤</span></div><div class="d-uac-q">이 앱이 디바이스를 변경할 수 있도록 허용하시겠어요?</div><div class="d-uac-app"><i>${nodeIco}</i><div><b>Node.js</b><span>확인된 게시자: OpenJS Foundation</span><span>파일 원본: 이 컴퓨터의 하드 드라이브</span></div></div><u class="d-uac-more">세부 정보 표시</u><div class="d-uac-btn">${tg("예", n, "예", "go", "span")}<span>아니요</span></div></div>`,
        ),
    },
    {
      ey: "STEP 04",
      title: "ChatGPT 앱<br><em>열기</em>",
      desc: "Codex가 ChatGPT 앱 설치를 마치면 키보드의 Windows 키를 누르고 ChatGPT를 입력합니다. 검색 결과에 나온 ChatGPT 앱을 누릅니다.",
      mode: "Windows 키 → ChatGPT → 앱 클릭",
      tone: "set",
      screen: (n) =>
        desk(
          `<div class="startm"><div class="sbox">⌕ <span>ChatGPT</span></div><div class="best">가장 일치하는 항목</div>${tg(`<span class="d-startico">${gptApp}</span><span><b>ChatGPT</b><span>앱</span></span>`, n, "ChatGPT 앱", "hit", "div")}<div class="right"><span class="d-startico big">${gptApp}</span><b>ChatGPT</b><span>앱</span><div class="hl">↗ 열기</div><div>🛡 관리자 권한으로 실행</div><div>📁 파일 위치 열기</div></div></div>`,
        ),
    },
    {
      ey: "STEP 05",
      title: "ChatGPT 앱<br><em>로그인</em>",
      desc: "앱을 처음 열면 로그인 화면이 나옵니다. 로그인을 눌러 평소 쓰는 ChatGPT 계정으로 로그인합니다.",
      mode: "로그인 클릭",
      tone: "set",
      note: "Codex를 쓸 때와 같은, 평소 쓰는 ChatGPT 계정으로 로그인합니다. 계정 정보는 이 로그인 창에만 입력하고 Codex 채팅에는 적지 않습니다.",
      screen: (n) =>
        `<div class="screen light"><div class="d-app">${appTitle()}<div class="d-signin"><div class="d-gmark lg">${gptRound}</div><h2>ChatGPT</h2><p>계정에 로그인해서 시작합니다.</p>${tg("로그인", n, "로그인", "d-signbtn", "div")}</div></div></div>`,
    },
    {
      ey: "STEP 06",
      title: "프로필 메뉴에서<br><em>설정 열기</em>",
      desc: "왼쪽 아래 동그란 프로필 버튼을 누르면 메뉴가 열립니다. 메뉴에서 설정을 누릅니다.",
      mode: "프로필 → 설정",
      tone: "set",
      note: "키보드 단축키 Ctrl과 쉼표(,)를 함께 눌러도 설정이 열립니다.",
      screen: (n) => appWin("", homeMain, avatarMenu(n), true),
    },
    {
      ey: "STEP 07",
      title: "컴퓨터 사용<br><em>모든 앱 켜기</em>",
      desc: "설정 왼쪽 목록의 통합 아래에서 컴퓨터 사용을 엽니다. 제어 영역의 모든 앱 스위치를 켜면 ChatGPT가 PC의 다른 앱을 다룰 수 있습니다.",
      mode: "모든 앱 켜기",
      tone: "set",
      note: "처음에는 스위치가 꺼져 있어 회색입니다. 켜지면 파란색으로 바뀝니다.",
      screen: (n) =>
        computerUse(n, { all: false, chrome: "none", target: "all" }),
    },
    {
      ey: "STEP 08",
      title: "Google Chrome<br><em>설치하기</em>",
      desc: "모든 앱이 켜지면 Google Chrome 줄이 보입니다. 빨간 점과 ‘브라우저 확장 프로그램이 설치되지 않음’이 보이면 오른쪽 설치하기를 누릅니다.",
      mode: "설치하기 클릭",
      tone: "set",
      note: "설치하기를 누르면 Chrome이 열리고 확장 프로그램을 설치하는 Chrome 웹 스토어 화면으로 이어집니다.",
      screen: (n) =>
        computerUse(n, { all: true, chrome: "none", target: "install" }),
    },
    {
      ey: "STEP 09",
      title: "Chrome 웹 스토어<br><em>확장 프로그램</em>",
      desc: "Chrome에 ‘ChatGPT’ 확장 프로그램 페이지가 열립니다. 제공자가 openai.com인지 확인한 뒤 Chrome에 추가를 누릅니다.",
      mode: "Chrome에 추가",
      tone: "set",
      note: "이름이 ChatGPT이고 제공자가 openai.com인 확장 프로그램만 추가합니다.",
      screen: (n) =>
        chrome(
          "ChatGPT - Chrome 웹 스토어",
          cwsFav,
          cwsHost,
          cwsBody(tg("Chrome에 추가", n, "Chrome에 추가", "d-cws-add", "span")),
        ),
    },
    {
      ey: "STEP 10",
      title: "확장 프로그램<br><em>추가 확인</em>",
      desc: "확장 프로그램 추가 확인 창에 ‘ChatGPT’을(를) 추가하시겠습니까? 문구가 보이면 확장 프로그램 추가를 누릅니다.",
      mode: "확장 프로그램 추가",
      tone: "set",
      screen: (n) =>
        chrome(
          "ChatGPT - Chrome 웹 스토어",
          cwsFav,
          cwsHost,
          cwsBody(`<span class="d-cws-add">Chrome에 추가</span>`),
          `<div class="d-cdlg"><h5>‘ChatGPT’을(를) 추가하시겠습니까?</h5><div class="bt">${tg("확장 프로그램 추가", n, "확장 프로그램 추가", "add", "span")}<span class="cancel">취소</span></div></div>`,
        ),
    },
    {
      ey: "STEP 11",
      title: "설치 확인<br><em>Chrome 연결</em>",
      desc: "ChatGPT 앱의 컴퓨터 사용 화면으로 돌아옵니다. Google Chrome 줄에 초록 점과 ‘브라우저 확장 프로그램 설치함’이 보이고 스위치가 켜져 있으면 연결이 끝난 것입니다.",
      mode: "초록 점 · 스위치 켜짐",
      tone: "keep",
      screen: (n) =>
        computerUse(n, { all: true, chrome: "on", target: "chrome" }),
    },
    {
      ey: "STEP 12",
      title: "브라우저<br><em>설정 진행</em>",
      desc: "설정 왼쪽 목록에서 브라우저를 엽니다. ‘ChatGPT가 내장 브라우저를 제어하도록 허용’ 줄의 설정 진행을 누릅니다.",
      mode: "설정 진행 클릭",
      tone: "set",
      note: "네이버 블로그 작성은 앱 안 사이드 탭에서 차단됩니다. 네이버에는 앱 안 브라우저를 쓰지 않고 Codex가 여는 Chrome 창을 씁니다.",
      screen: (n) => browserPage(n),
    },
    {
      ey: "STEP 13",
      title: "네이버<br><em>첫 로그인</em>",
      desc: "Codex가 연 Chrome 창에 네이버 로그인 화면이 나타납니다. 아이디와 비밀번호를 입력하고 로그인을 누릅니다.",
      mode: "아이디 · 비밀번호 입력 → 로그인",
      tone: "set",
      note: "아이디와 비밀번호는 Codex 채팅에 적지 않고 이 창에 직접 입력합니다. 로그인 상태 유지는 켜진 그대로 둡니다.",
      screen: (n) => nvLogin(n),
    },
    {
      ey: "STEP 14",
      title: "새 기기<br><em>등록 화면</em>",
      desc: "‘새로운 기기(브라우저)에서 로그인되었습니다’ 화면이 나오면 등록안함을 누릅니다. 이 창은 Codex가 쓰는 창이므로 기기로 등록하지 않습니다.",
      mode: "등록안함 클릭",
      tone: "set",
      screen: (n) => nvDevice(n),
    },
    {
      ey: "STEP 15",
      title: "Codex 결과<br><em>확인하기</em>",
      desc: "로그인이 끝나면 Codex가 네이버 세션을 확인하고 결과를 터미널에 알려 줍니다. ‘성공’이 보이면 첫 로그인이 끝난 것입니다.",
      mode: "성공 · NID_AUT 영속",
      tone: "keep",
      note: "매일 세션 연장은 24시간 뒤 Codex가 등록합니다. 사람이 따로 할 일은 없습니다.",
      screen: (n) =>
        termBase([
          ...head(),
          "[[b|›]] 네이버 로그인을 마쳤어. 세션 상태를 확인해 줘.",
          "",
          "[[dim|•]] 네이버 로그인 세션을 확인했습니다.",
          "",
          tline(
            "  [[g|[myblog] 성공]] · NID_AUT 영속 · 만료 2026. 11. 15. 오후 6:10:00. 세션 연장(touch.mjs)은 24시간 뒤부터 가능합니다.",
            n,
            "Codex 결과 · 성공 · NID_AUT 영속",
          ),
          "",
          inputLine(),
          ...footerTyping().slice(0, 2),
        ]),
    },
    {
      final: 1,
      ey: "CHAPTER 08D COMPLETE",
      title: "에이전트 키트<br><em>연결 완료</em>",
      desc: "키트 전달, 관리자 승인, ChatGPT 앱 설정, 네이버 첫 로그인까지 마쳤습니다. 08E에서는 네이버 블로그 기본 설정을 진행합니다.",
      route: [
        "키트 전달",
        "관리자 승인",
        "ChatGPT 앱 설정",
        "네이버 로그인",
        "08E 이어서",
      ],
    },
  ];
};
