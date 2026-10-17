// 08E: Naver blog default settings the student does by hand. Registered as a part builder for ai-setup-course.js.
// Screens follow 2024–2026 screenshots of the real Naver blog UI (blog ID flow, admin, layout·widget, remote panel).
(() => {
  window.AI_SETUP_PARTS = window.AI_SETUP_PARTS || {};
  window.AI_SETUP_PARTS.E = (h) => {
    const { tg, chrome, termBase, head, inputLine, footerTyping, tline } = h;

    /* ---------- sample brand used in every screen ---------- */
    const B = {
      id: "bomnalflower",
      name: "봄날플라워 꽃 이야기",
      nick: "봄날플라워",
      intro: "매일 들어오는 제철 꽃과\n꽃다발 만드는 과정을 기록합니다.",
    };
    const BFAV = '<span class="e-bfav">b</span>';
    const NFAV = '<span class="e-bfav">N</span>';
    const br = (s) => s.replace("\n", "<br>");

    /* ---------- sample images drawn with CSS ---------- */
    const topArt = () =>
      `<div class="e-topart"><div class="e-topart-safe"><small>FLOWER STUDIO</small><b>${B.nick}</b><span>제철 꽃으로 전하는 오늘의 마음</span></div></div>`;
    const coverArt = () =>
      `<div class="e-coverart"><small>FLOWER STUDIO</small><b>${B.nick}</b></div>`;
    const profArt = (cls = "") => `<span class="e-profart ${cls}">봄</span>`;

    /* ---------- naver.com main (blog ID entry) ---------- */
    const naverMain = (panelBtn, extra = "") =>
      chrome(
        "NAVER",
        NFAV,
        "www.naver.com",
        `<div class="e-nmain"><div class="e-nsearch"><b>N</b><span></span></div><div class="e-nsvc">${["메일", "카페", "블로그", "쇼핑", "뉴스", "증권", "부동산", "지도", "웹툰"].map((s) => `<span><i></i>${s}</span>`).join("")}</div><div class="e-nbody"><div class="e-nnews"><span class="ph"></span><span class="ph"></span><span class="ph short"></span><span class="ph"></span><span class="ph short"></span></div><aside class="e-nme"><div class="e-nme-top"><span class="e-avatar sm"></span><div><b>내 계정</b><small>네이버 아이디로 로그인됨</small></div></div><div class="e-nme-tabs"><span>메일</span><span>카페</span><span class="on">블로그</span><span>페이</span></div><div class="e-nme-blog"><b>블로그 아이디가 필요해요</b><p>다양한 이웃과 소식을 만나보세요.<br>지금 시작해 볼까요?</p>${panelBtn}</div></aside></div></div>`,
        extra,
      );
    const layer = (inner, cls = "") =>
      `<div class="e-dim"></div><div class="e-layer ${cls}">${inner}</div>`;
    const people = '<div class="e-illus"><i></i><i></i><span></span></div>';

    /* ---------- naver blog page ---------- */
    const gnb = () =>
      `<div class="e-gnb"><b class="e-blogo"><i>N</i>blog</b><span class="sp"></span><span>이웃블로그</span><span>블로그 홈</span><span>내 메뉴 ▾</span></div>`;
    // A new blog uses the 1-column basic skin: posts first, profile·category·activity at the bottom.
    const freshBlog = (manage) =>
      chrome(
        `${B.name} : 네이버 블로그`,
        BFAV,
        `blog.naver.com/${B.id}`,
        `<div class="e-blog">${gnb()}<div class="e-head"><div class="e-head-plain"><b>${B.name}</b></div></div><div class="e-bmenu"><span>프롤로그</span><span class="on">블로그</span></div><div class="e-empty"><b>아직 작성된 글이 없습니다.</b><p>생각이나 기분, 일기 등 다양한 이야기로 나만의 공간을 채워보세요!</p><span class="e-wbtn">✎ 글쓰기</span></div><div class="e-foot1"><div class="e-foot-prof"><p>${B.nick}님의 블로그입니다.</p><small>프로필 ▸</small><div class="e-prof-links"><span>✎ 글쓰기</span>${manage}<span>통계</span></div></div><div class="e-foot-col"><b>카테고리</b><span>전체보기 (0)</span><span>게시판 (0)</span></div><div class="e-foot-col"><b>활동정보</b><span>블로그 이웃 0 명</span><span>글 보내기 0 회</span></div></div></div>`,
      );
    // After the settings: 2-column layout, top background, title text off.
    const styledBlog = (headTarget) =>
      chrome(
        `${B.name} : 네이버 블로그`,
        BFAV,
        `blog.naver.com/${B.id}`,
        `<div class="e-blog styled">${gnb()}<div class="e-head">${headTarget ? headTarget(topArt()) : topArt()}</div><div class="e-bmenu"><span>프롤로그</span><span class="on">블로그</span></div><div class="e-cols"><aside><div class="e-prof">${profArt("lg")}<b>${B.nick}</b><small>(${B.id})</small><p>${br(B.intro)}</p><div class="e-prof-links"><span>✎ 글쓰기</span><span>⚙ 관리</span><span>통계</span></div></div><div class="e-side-box"><b>카테고리</b><span>전체보기 (1)</span></div></aside><div class="e-posts"><div class="e-post-h">전체글 보기 <em>1개의 글</em></div><div class="e-post"><b>블로그를 시작합니다</b><span>2026. 10. 16.</span></div><div class="e-post-ph"></div><div class="e-post-ph short"></div></div></div></div>`,
      );

    /* ---------- admin.blog.naver.com ---------- */
    const TABS = [
      "기본 설정",
      "꾸미기 설정",
      "메뉴·글·동영상 관리",
      "내 블로그 통계",
    ];
    const NAV = {
      "기본 설정": [
        ["기본 정보 관리", ["블로그 정보", "기본 서체 설정"]],
        [
          "사생활 보호",
          ["블로그 초기화", "방문집계 보호 설정", "콘텐츠 공유 설정"],
        ],
        ["스팸 차단 관리", ["차단 설정", "차단된 글목록", "댓글·안부글 권한"]],
        [
          "이웃 관리",
          ["내가 추가한 이웃", "나를 추가한 이웃", "서로이웃 신청"],
        ],
      ],
      "꾸미기 설정": [
        ["스킨", ["스킨 선택", "내 스킨 관리"]],
        [
          "디자인 설정",
          [
            "레이아웃·위젯 설정",
            "세부 디자인 설정",
            "타이틀 꾸미기",
            "글·댓글 스타일",
          ],
        ],
        ["아이템 설정", ["퍼스나콘", "뮤직"]],
        ["네이버 페이·선물 내역", []],
      ],
      "메뉴·글·동영상 관리": [
        ["메뉴 관리", ["상단메뉴 설정", "블로그", "메모게시판", "프롤로그"]],
        ["글배달", ["블로그씨 질문"]],
        ["글 관리", ["댓글", "태그", "글 저장"]],
        ["동영상 관리", ["내 동영상"]],
      ],
    };
    const navHtml = (tab, active, n, label) =>
      (NAV[tab] || [])
        .map(
          ([group, items]) =>
            `<div class="e-nav-g"><b>${group}</b>${items
              .map((it) =>
                label && it === label
                  ? tg(it, n, label, `e-nav-it ${it === active ? "on" : ""}`)
                  : `<span class="e-nav-it ${it === active ? "on" : ""}">${it}</span>`,
              )
              .join("")}</div>`,
        )
        .join("");
    const admin = (o) =>
      chrome(
        "블로그 관리 : 네이버 블로그",
        BFAV,
        `admin.blog.naver.com/${B.id}`,
        `<div class="e-adm"><div class="e-adm-head"><b class="e-blogo light"><i>N</i>blog</b><span>관리</span><em><i>내 블로그</i><i>이웃블로그</i><i>블로그 홈</i><i>내 메뉴 ▾</i></em></div><div class="e-adm-tabs">${TABS.map((t) => `<span class="${t === o.tab ? "on" : ""}">${t}</span>`).join("")}<span class="all">전체보기 ⌄</span><span class="sp"></span><span class="tbtn">블로그 쉽게 꾸미기</span><span class="tbtn">블로그 글쓰기</span></div>${
          o.full
            ? `<div class="e-adm-full"><div style="transform:translateY(-${o.scroll || 0}cqw)">${o.body}</div></div>`
            : `<div class="e-adm-main"><nav class="e-adm-nav">${navHtml(o.tab, o.nav, o.n, o.navTarget)}</nav><div class="e-adm-body"><div class="e-scroll" style="transform:translateY(-${o.scroll || 0}cqw)">${o.body}</div></div></div>`
        }</div>`,
        o.extra || "",
      );

    /* blog info page (기본 설정 › 블로그 정보) */
    const row = (label, value, hint = "") =>
      `<div class="e-row"><b>${label}</b><div class="v">${value}</div><p class="hint">${hint}</p></div>`;
    const reg = '<span class="e-sbtn">등록</span>';
    const btn2 = (r) =>
      `<span class="e-sbtns">${r || reg}<span class="e-sbtn">삭제</span></span>`;
    const blogInfo = (o = {}) =>
      `<h4 class="e-h4">블로그 정보</h4>` +
      row(
        "블로그 주소",
        `<span class="e-addr">https://blog.naver.com/${B.id}</span>`,
        "블로그 아이디가 블로그 주소로 사용됩니다.",
      ) +
      row(
        "블로그명",
        `<span class="e-inp">${B.name}</span>`,
        "한글, 영문, 숫자 혼용가능 (한글 기준 25자 이내)",
      ) +
      row(
        "별명",
        `<span class="e-inp">${B.nick}</span>`,
        "한글, 영문, 숫자 혼용가능 (한글 기준 10자 이내)",
      ) +
      row(
        "소개글",
        o.intro || `<span class="e-ta">${br(B.intro)}</span>`,
        "블로그 프로필 영역의<br>프로필 이미지 아래에 반영됩니다.<br>(한글 기준 200자 이내)",
      ) +
      row(
        "블로그 프로필 이미지",
        `<div class="e-imgrow">${o.profThumb || '<span class="e-thumb empty"></span>'}<div>${btn2(o.profReg)}<small>프로필 이미지는 가로 161px 섬네일로 생성됩니다.</small><small class="lnk">세부 디자인 설정에서 조정해 보세요.</small><small><i class="e-cb on"></i>네이버 프로필에도 적용합니다.</small></div></div>`,
      ) +
      row(
        "모바일앱 커버 이미지",
        `<div class="e-imgrow">${o.coverThumb || '<span class="e-thumb empty"></span>'}<div>${btn2(o.coverReg)}<small>커버 이미지는 모바일 기기의 해상도에 맞는 크기로 변환되어 보여집니다.</small><small class="lnk">커버 이미지 예시 보기</small></div></div>`,
      ) +
      row(
        "사업자 확인",
        `<small class="e-muted">블로그를 상거래 목적으로 운영하는 경우, 전자상거래법에 따라 사업자 정보를 표시합니다.</small>`,
      ) +
      `<div class="e-save">${o.save || '<span class="e-gbtn">확인</span>'}</div>`;

    const uploadPop = (file, okBtn) =>
      `<div class="e-pop"><div class="e-pop-bar">${BFAV}<span>네이버 블로그 :: 이미지 첨부 - Chrome</span><i>—</i><i>▢</i><i>✕</i></div><div class="e-pop-url">blog.naver.com/upload/SimplePhotoUploadForm…</div><div class="e-pop-in"><h6>이미지 첨부</h6><div class="e-pop-file"><span>${file}</span><b>찾아보기</b></div><p><em>10M</em>미만의 파일만 등록할 수 있습니다.</p><div class="e-pop-btns">${okBtn}<span>취소</span></div></div></div>`;

    /* layout · widget settings (full width, no left nav) */
    const thumb = (kind, on) =>
      `<span class="e-lt ${kind} ${on ? "on" : ""}"><i></i><i></i><i></i></span>`;
    const thumbs = (n, o) => {
      const g1 = ["two-l", "two-r", "two-l2", "two-r2"].map((k, i) => {
        const t = thumb(k, i === 0 && o.picked);
        return i === 0 && o.pickTarget
          ? tg(thumb(k, true), n, o.pickTarget, "e-lt-wrap")
          : t;
      });
      const g2 = ["three", "three", "three", "three", "three-l", "three-r"].map(
        (k) => thumb(k),
      );
      const g3 = [thumb("one", !o.picked && !o.pickTarget), thumb("one2")];
      return `<div class="e-lthumbs"><div class="g">${g1.join("")}</div><div class="g">${g2.join("")}</div><div class="g">${g3.join("")}</div></div>`;
    };
    const MENU_USE = [
      ["타이틀", true],
      ["카테고리", true, "펼치기"],
      ["이웃커넥트", true, "", "off"],
      ["태그", true, "", "off"],
      ["최근댓글", true, "펼치기 · 3줄", "off"],
      ["이웃블로그", true, "펼치기", "off"],
      ["블로그정보", false],
      ["네이버로고", false],
    ];
    const WIDGETS = [
      ["사업자정보", false],
      ["콩저금통", false],
      ["달력", true, "달력보기"],
      ["카운터", true],
      ["시계", true],
      ["날씨", true],
      ["방문자그래프", false],
    ];
    const ckRow = ([name, on, sub, flag], st) =>
      `<div class="e-lrowck ${st.warn && flag ? "warn" : ""} ${st.warn && st.isWidget && on ? "warn" : ""}"><i class="e-cb ${on ? "on" : ""}"></i><span>${name}${sub ? `<small>${sub} ▾</small>` : ""}</span></div>`;
    const layoutPage = (o, n) => {
      const menuRows = MENU_USE.map(([a, on, sub, flag]) => [
        a,
        o.menuDone && flag ? false : on,
        sub,
        flag,
      ]);
      const widgetRows = WIDGETS.map(([a, on, sub]) => [
        a,
        o.widgetDone ? false : on,
        sub,
      ]);
      const mHead = menuRows
        .slice(0, 2)
        .map((r) => ckRow(r, {}))
        .join("");
      const mOff = menuRows
        .slice(2, 6)
        .map((r) => ckRow(r, { warn: !!o.menuTarget }))
        .join("");
      const mTail = menuRows
        .slice(6)
        .map((r) => ckRow(r, {}))
        .join("");
      const wRows = widgetRows
        .map((r) => ckRow(r, { warn: !!o.widgetTarget, isWidget: true }))
        .join("");
      const wide = '<span class="e-rd"><i class="on"></i>넓게</span>';
      const side = (label) =>
        `<div class="e-lset"><b>${label}</b><span class="e-dd">기본사용 ▾</span><span class="e-dd">펼친상태 ▾</span></div>`;
      const panel = `<div class="e-lpanel"><h6>레이아웃 설정</h6><div class="e-lbox"><div class="e-lset"><b>전체정렬</b><span class="e-rd"><i class="${o.picked ? "on" : "on"}"></i>중앙</span><span class="e-rd"><i></i>좌측</span></div><div class="e-lset"><b>글 영역</b>${o.wideTarget ? tg(wide, n, o.wideTarget, "e-rd-wrap") : `<span class="e-rd"><i class="${o.wide ? "on" : ""}"></i>넓게</span>`}<span class="e-rd"><i class="${o.wide || o.wideTarget ? "" : "on"}"></i>보통</span></div>${side("사이드바1")}<div class="e-lset"><b>기본 메뉴</b><span class="e-rd"><i class="on"></i>국문</span><span class="e-rd"><i></i>영문</span></div></div><h6>메뉴 사용 설정</h6><div class="e-lbox list">${mHead}${o.menuTarget ? tg(mOff, n, o.menuTarget, "e-lgrp") : mOff}${mTail}</div><h6>위젯 사용 설정</h6><div class="e-lbox list">${o.widgetTarget ? tg(wRows, n, o.widgetTarget, "e-lgrp") : wRows}</div></div>`;
      const offBlocks = o.menuDone
        ? ""
        : '<span class="blk">이웃커넥트 <i>×</i></span><span class="blk">태그 <i>×</i></span><span class="blk">최근댓글 <i>×</i></span><span class="blk">이웃블로그 <i>×</i></span>';
      const widgetBlocks = o.widgetDone
        ? ""
        : '<span class="blk">달력</span><span class="blk">카운터 · 시계 · 날씨</span>';
      const canvas = o.picked
        ? `<div class="e-canvas"><p>⬚ 마우스로 드래그해서 원하는 위치에 놓으세요.</p><span class="blk nmenu">네이버메뉴</span><span class="blk wide">타이틀 <i>×</i></span><span class="blk wide">메뉴 형태</span><div class="e-ccols"><div class="side"><span class="blk">프로필영역</span><span class="blk">카테고리</span><span class="blk">검색</span>${offBlocks}${widgetBlocks}</div><span class="blk post">글 영역<em>(${o.wide || o.wideTarget ? "넓게" : "보통"})</em></span></div></div>`
        : `<div class="e-canvas"><p>⬚ 마우스로 드래그해서 원하는 위치에 놓으세요.</p><span class="blk nmenu">네이버메뉴</span><span class="blk wide">타이틀 <i>×</i></span><span class="blk wide">메뉴 형태</span><span class="blk post one">글 영역<em>(보통)</em></span><div class="e-crow"><span class="blk">프로필영역</span><span class="blk">카테고리</span><span class="blk">이웃커넥트 <i>×</i></span><span class="blk">태그 <i>×</i></span></div></div>`;
      const apply = '<span class="e-gbtn">적용</span>';
      return `<div class="e-layout"><h4 class="e-h4 flat">레이아웃·위젯 설정</h4>${thumbs(n, o)}<div class="e-lmain">${canvas}${panel}</div><div class="e-lfoot"><span class="e-wbtn">미리보기</span>${o.applyTarget ? tg(apply, n, o.applyTarget) : apply}</div></div>`;
    };

    /* remote control panel, docked right inside the admin page (세부 디자인 설정) */
    const REMO = [
      "스킨배경",
      "타이틀",
      "네이버 메뉴",
      "블로그 메뉴",
      "전체 박스",
      "구성 박스",
      "그룹 박스",
      "글·댓글 스타일",
      "프로필",
      "RSS / 블로그 로고",
      "위젯",
    ];
    const remocon = (o, n) => {
      const list = REMO.map(
        (it) => `<span class="${it === o.item ? "on" : ""}">${it}</span>`,
      ).join("");
      let body;
      if (o.item === "스킨배경") {
        const file = '<span class="e-rbtn">파일 등록</span>';
        body = `<div class="e-rsec"><b>디자인</b><div class="e-rtabs"><span>스타일</span><span>컬러</span><span class="on">직접등록</span></div></div><div class="e-rsec"><b>상단 영역</b><div class="e-rbtns"><span class="e-rbtn">무료 이미지</span>${o.fileTarget ? tg(file, n, o.fileTarget) : file}</div><small>- 가로 최대 3000px</small><small>- 무료 이미지는 OGQ 에서 제공합니다.</small></div><div class="e-rsec"><b>하단 영역 (패턴)</b><div class="e-rbtns"><span class="e-rbtn">컬러 □</span><span class="e-rbtn">파일 등록</span></div></div>`;
      } else {
        const show = `<span class="e-ck"><i class="e-cb ${o.titleOff ? "" : "on"}"></i>표시</span>`;
        body = `<div class="e-rsec row"><b>블로그 제목</b>${o.titleTarget ? tg(show, n, o.titleTarget, "e-ck-wrap") : show}</div><div class="e-rsec"><b>영역 높이</b><div class="e-slider"><span class="bar"><i style="left:${(((o.height || 250) - 50) / 5.5).toFixed(1)}%"></i></span>${o.heightTarget ? tg(`<span class="e-inp sm">${o.height}</span>`, n, o.heightTarget, "e-ck-wrap") : `<span class="e-inp sm">${o.height || 250}</span>`}</div><small class="e-scale"><span>50</span><span>325</span><span>600</span></small></div><div class="e-rsec"><b>디자인</b><div class="e-rtabs"><span class="on">스타일</span><span>컬러</span><span>직접등록</span></div><div class="e-rswatch"><i></i><i></i><i></i><i></i></div></div>`;
      }
      const apply = '<span class="e-gbtn block">적용</span>';
      return `<div class="e-remo"><div class="e-remo-h"><b>리모콘</b><span>⟲ ${o.item} 원래대로 | 도움말</span></div><div class="e-remo-b"><div class="e-remo-list">${list}<hr><span>스킨 변경</span><span>레이아웃 변경</span><span class="chk"><i class="e-cb on"></i>스크롤시 이동</span><span class="e-wbtn block">취소</span>${o.applyTarget ? tg(apply, n, o.applyTarget, "e-block-tg") : apply}</div><div class="e-remo-body">${body}</div></div></div>`;
    };
    const designPage = (o, n) =>
      admin({
        tab: "꾸미기 설정",
        full: true,
        body: `<div class="e-design"><div class="e-dprev"><div class="e-dprev-gnb"><span>이웃블로그 | 블로그 홈 | 내 메뉴</span></div><div class="e-dprev-head ${o.bg ? "bg" : ""}">${o.bg ? topArt() : ""}${o.titleOff ? "" : `<b class="e-dprev-title">${B.name}</b>`}</div><div class="e-dprev-menu"><span>프롤로그</span><span class="on">블로그</span></div><div class="e-dprev-body"><span class="ph"></span><span class="ph short"></span></div></div>${remocon(o, n)}</div>`,
      });

    /* ---------- concept slides ---------- */
    const specHtml = `<div class="e-spec">
      <div class="e-spec-card wide"><small>PC 상단 배경 · top-bg.png</small><strong>3000 × 500 px</strong>
        <div class="e-spec-pc"><span class="gnb">네이버 상단 바 · 33px 비움</span><span class="side l">좌우는 반복되는 배경만</span><span class="safe">안전 영역 · 가운데 966px<br><em>블로그 이름·핵심 요소</em></span><span class="side r">좌우는 반복되는 배경만</span></div>
        <p>글자는 가로 1017~1983px 안에만 넣고 맨 위 33px은 비웁니다. 타이틀 영역 높이를 500으로 맞추면 블로그 메뉴는 배경 아래에 붙습니다. 3000px보다 넓은 모니터에서는 좌우가 반복되어 보입니다.</p></div>
      <div class="e-spec-card"><small>모바일 배경 · mobile-cover.png</small><strong>1080 × 1080 px</strong>
        <div class="e-spec-mo"><span class="bar">상태 표시줄</span><span class="ico">아이콘</span><span class="safe">안전 영역<br><em>가로 6~94% · 세로 13~47%</em></span><span class="over">블로그명 · 프로필 · 버튼이 덮는 영역</span></div></div>
      <div class="e-spec-card"><small>프로필 이미지 · profile.png</small><strong>640 × 640 px</strong>
        <div class="e-spec-pf"><span>원 안에 로고</span></div><p>가로 161px 섬네일로 줄어들어도 알아볼 수 있게 단순하게 만듭니다.</p></div>
    </div>`;

    const checklistHtml = `<div class="cards two e-cards">
      <div class="card"><small>01 · 02</small><strong>블로그 개설 · 주소</strong><p>블로그 아이디를 만듭니다. 아이디가 곧 blog.naver.com 주소이고 나중에 바꿀 수 없습니다.</p></div>
      <div class="card on"><small>03 · 04 · 05</small><strong>이미지 3장</strong><p>상단 배경, 모바일 배경, 프로필 이미지를 Codex에게 규격에 맞춰 만들어 달라고 요청합니다.</p></div>
      <div class="card"><small>04 · 05 · 06</small><strong>블로그 정보</strong><p>프로필 이미지와 소개 문구를 넣고 모바일 배경을 등록합니다.</p></div>
      <div class="card"><small>07</small><strong>블로그씨 글배달 중지</strong><p>블로그씨 질문이 내 블로그에 배달되지 않게 끕니다.</p></div>
      <div class="card"><small>08 · 09 · 10</small><strong>레이아웃 · 메뉴 정리</strong><p>2단 · 글 영역 넓게 · 가운데 정렬로 맞추고 이웃커넥트·이웃블로그·태그·최근댓글·위젯을 끕니다.</p></div>
      <div class="card"><small>03</small><strong>상단 배경 등록</strong><p>세부 디자인 설정의 리모콘에서 배경을 올리고 블로그 제목 글자를 끕니다.</p></div>
    </div>`;

    const PROMPT = [
      "C:\\bas_mkt\\blog-setup 폴더에 네이버 블로그 이미지 3장을 만들어 줘.",
      "블로그 이름: [블로그 이름] / 업종: [업종] / 분위기: [원하는 분위기]",
      "1) top-bg.png 3000×500px: 블로그 이름과 핵심 요소는 가운데 가로 966px(x 1017~1983) 안에만 넣고 맨 위 33px은 비워 줘. 좌우 바깥에는 글자 없이 배경만 두고, 왼쪽 끝과 오른쪽 끝의 색과 무늬를 맞춰 줘.",
      "2) mobile-cover.png 1080×1080px: 핵심 요소는 가로 6~94%, 세로 13~47% 안에만 넣고, 오른쪽 위 모서리와 아래 절반에는 글자를 넣지 마.",
      "3) profile.png 640×640px: 로고나 대표 이미지를 가운데 원 안에 들어가게 배치해 줘.",
      "다 만들면 세 파일의 크기를 확인해서 알려 줘.",
    ].join("\n");

    const TOPICS = [
      "일상·생각",
      "비즈니스·경제",
      "맛집",
      "건강·의학",
      "패션·미용",
      "상품리뷰",
      "교육·학문",
      "문학·책",
      "육아·결혼",
      "인테리어·DIY",
      "국내여행",
      "취미",
      "스타·연예인",
      "자동차",
      "IT·컴퓨터",
      "반려동물",
      "드라마",
      "세계여행",
      "원예·재배",
      "스포츠",
      "공연·전시",
      "만화·애니",
      "사회·정치",
      "방송",
      "좋은글·이미지",
      "게임",
      "미술·디자인",
      "음악",
      "사진",
      "어학·외국어",
      "요리·레시피",
      "영화",
    ];
    const idInput = (typed) =>
      `<h6 class="big">사용하실 블로그 아이디를 입력해주세요.</h6><small class="e-idlbl">blog.naver.com/블로그아이디</small><div class="e-idinput ${typed ? "ok" : ""}"><span>${typed || '<i class="ph-txt">블로그아이디</i>'}</span>${typed ? "<i>ⓧ</i>" : ""}</div>${typed ? '<p class="ok">멋져요! 이 아이디를 사용할 수 있어요.</p>' : ""}<ul class="e-idnote"><li>설정한 아이디는 나중에 변경할 수 없으니 신중하게 입력해주세요.</li><li class="red">네이버 아이디 또는 개인정보가 포함된 문자 사용은 피해주세요.</li></ul>`;

    return [
      {
        cover: 1,
        ey: "CHAPTER 08E · BLOG SETUP",
        title: "네이버 블로그<br><em>기본 설정</em>",
        desc: "Codex가 글을 올리기 전에 블로그의 기본 모습을 직접 갖춥니다. 블로그 아이디를 만들고 배경·프로필·레이아웃을 맞춘 뒤 필요 없는 메뉴를 정리합니다.",
        route: [
          "이미지 3장",
          "블로그 개설",
          "블로그 정보",
          "블로그씨 중지",
          "레이아웃 · 메뉴",
          "상단 배경",
        ],
      },
      {
        concept: 1,
        ey: "CHECKLIST",
        title: "직접 설정할<br><em>10가지</em>",
        desc: "블로그 설정은 모두 교육생이 직접 합니다. Codex는 블로그 설정을 바꾸지 않고 이미지 제작만 돕습니다.",
        html: checklistHtml,
      },
      {
        concept: 1,
        ey: "IMAGE SPEC",
        title: "이미지 규격<br><em>먼저 확인</em>",
        desc: "네이버 화면 요소가 겹치는 영역을 피해서 만들어야 글자가 잘리지 않습니다. 이 규격은 다음 단계의 요청 문장에 그대로 들어 있습니다.",
        html: specHtml,
      },
      {
        ey: "STEP 01",
        title: "Codex에게<br><em>이미지 요청</em>",
        desc: "VS Code 터미널의 Codex에게 아래 문장을 붙여넣고 대괄호 부분을 내 블로그에 맞게 바꿉니다. 완성된 이미지는 C:\\bas_mkt\\blog-setup 폴더에 저장됩니다.",
        mode: "복사 → 대괄호 수정 → Enter",
        tone: "set",
        copy: [{ label: "이미지 요청 문장", code: PROMPT, prompt: true }],
        screen: (n) =>
          termBase([
            ...head(),
            tline(
              inputLine(
                "C:\\bas_mkt\\blog-setup 폴더에 네이버 블로그 이미지 3장을 만들어 줘. 블로그 이름: 봄날플라워 …",
              ),
              n,
              "요청 문장 붙여넣기 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 02",
        title: "네이버 첫 화면<br><em>블로그 탭</em>",
        desc: "네이버에 로그인한 첫 화면에서 오른쪽 내 정보 영역의 블로그 탭을 엽니다. “블로그 아이디가 필요해요” 아래의 블로그 아이디 만들기를 누릅니다.",
        mode: "블로그 탭 → 블로그 아이디 만들기",
        tone: "set",
        note: "이미 블로그 아이디가 있는 계정이면 STEP 02~08은 건너뛰고 STEP 09로 갑니다.",
        screen: (n) =>
          naverMain(
            tg(
              '<span class="e-obtn">블로그 아이디 만들기</span>',
              n,
              "블로그 아이디 만들기",
            ),
          ),
      },
      {
        ey: "STEP 03",
        title: "안내 창에서<br><em>아이디 만들기</em>",
        desc: "“블로그 아이디가 필요해요!” 창이 열립니다. 초록색 블로그 아이디 만들기를 누릅니다.",
        mode: "블로그 아이디 만들기",
        tone: "set",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `<span class="e-x">✕</span>${people}<h6 class="center">블로그 아이디가 필요해요!</h6><p class="center">블로그에서 진짜 나를 기록하고<br>다양한 이웃과 소식을 만나보세요. 지금 시작해볼까요?</p>${tg('<span class="e-gbtn wide">블로그 아이디 만들기</span>', n, "블로그 아이디 만들기", "e-block-tg")}`,
              "sm",
            ),
          ),
      },
      {
        ey: "STEP 04",
        title: "아이디가<br><em>블로그 주소</em>",
        desc: "사용할 블로그 아이디를 입력합니다. “멋져요! 이 아이디를 사용할 수 있어요.”가 보이면 확인을 누릅니다.",
        mode: "아이디 입력 → 확인",
        tone: "set",
        note: "이 아이디가 blog.naver.com/아이디 주소가 되고 나중에 바꿀 수 없습니다. 상호나 브랜드를 짧은 영문으로 정하고 네이버 로그인 아이디나 전화번호는 넣지 않습니다.",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `${idInput(B.id)}<div class="e-lbtns"><span class="e-gray">나중에 할게요</span>${tg('<span class="e-gbtn">확인</span>', n, "확인", "e-block-tg")}</div>`,
              "md",
            ),
          ),
      },
      {
        ey: "STEP 05",
        title: "이 아이디로<br><em>블로그 만들기</em>",
        desc: "“이 아이디로 블로그를 만들까요?” 창이 한 번 더 뜹니다. 아이디를 다시 확인하고 확인을 누릅니다.",
        mode: "아이디 다시 확인 → 확인",
        tone: "keep",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `<div class="e-rocket">🚀</div><b class="e-idbig">${B.id}</b><span class="e-idurl">blog.naver.com/${B.id}</span><p class="red center">블로그 아이디는 한번 정하면<br>다시 변경이 불가능합니다.</p><p class="center"><b>이 아이디로 블로그를 만들까요?</b></p><div class="e-lbtns"><span class="e-gray">취소</span>${tg('<span class="e-gbtn">확인</span>', n, "확인", "e-block-tg")}</div>`,
              "sm",
            ),
          ),
      },
      {
        ey: "STEP 06",
        title: "환영 화면에서<br><em>추가정보 입력하기</em>",
        desc: "“환영합니다! 블로그 아이디가 만들어졌어요.” 화면이 나옵니다. 오른쪽 초록색 추가정보 입력하기를 누릅니다.",
        mode: "추가정보 입력하기",
        tone: "set",
        note: "왼쪽 바로 시작하기는 누르지 않습니다. 추가정보 입력하기로 별명과 블로그명을 먼저 정합니다.",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `<h6 class="center big">환영합니다!<br>블로그 아이디가 만들어졌어요.</h6>${people}<b class="e-idbig">${B.id}</b><span class="e-idurl">blog.naver.com/${B.id}</span><div class="e-lbtns"><span class="e-bbtn">바로 시작하기</span>${tg('<span class="e-gbtn">추가정보 입력하기</span>', n, "추가정보 입력하기", "e-block-tg")}</div>`,
              "sm",
            ),
          ),
      },
      {
        ey: "STEP 07",
        title: "기본정보<br><em>입력하기</em>",
        desc: "별명과 블로그명을 입력하고 블로그 주제를 하나 고른 뒤 다음을 누릅니다.",
        mode: "별명 · 블로그명 · 주제 → 다음",
        tone: "set",
        note: "블로그명은 한글 25자, 별명은 한글 10자까지 쓸 수 있습니다. 나중에 블로그 정보에서 바꿀 수 있습니다.",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `<div class="e-step-top"><span>‹</span><i class="dots"><b></b><em></em><em></em></i></div><h6>기본정보를 입력해주세요.</h6><small class="e-muted">나중에 언제든지 변경할 수 있어요.</small><div class="e-avatar-in"><span>봄</span><i>+</i></div><label>별명</label><span class="e-inp">${B.nick}</span><label>블로그명</label><span class="e-inp">${B.name}</span><label>블로그 주제</label><span class="e-inp sel">비즈니스·경제 ⌄</span><div class="e-lbtns"><span class="e-gray">나중에 할게요</span>${tg('<span class="e-gbtn">다음</span>', n, "다음", "e-block-tg")}</div>`,
              "md",
            ),
          ),
      },
      {
        ey: "STEP 08",
        title: "관심 주제<br><em>고르고 다음</em>",
        desc: "추천받고 싶은 주제를 고르고 다음을 누릅니다. 마지막 화면에서 블로그 시작하기를 누르면 내 블로그가 열립니다.",
        mode: "주제 선택 → 다음 → 블로그 시작하기",
        tone: "set",
        screen: (n) =>
          naverMain(
            '<span class="e-obtn">블로그 아이디 만들기</span>',
            layer(
              `<div class="e-step-top"><span>‹</span><i class="dots"><em></em><b></b><em></em></i></div><h6>주제를 선택해 주세요.</h6><small class="e-muted">선택한 주제의 글과 이웃을 추천받을 수 있어요.</small><div class="e-topics">${TOPICS.map((t) => `<span class="${["비즈니스·경제", "인테리어·DIY", "사진"].includes(t) ? "on" : ""}">${t}</span>`).join("")}</div><div class="e-lbtns">${tg('<span class="e-gbtn">다음</span>', n, "다음", "e-block-tg")}</div>`,
              "lg",
            ),
          ),
      },
      {
        ey: "STEP 09",
        title: "내 블로그에서<br><em>관리 열기</em>",
        desc: "새 블로그는 프로필이 화면 아래쪽에 있습니다. 프로필 아래의 관리를 누르면 블로그 관리 화면이 열립니다.",
        mode: "프로필 아래 관리",
        tone: "set",
        note: "오른쪽 위 내 메뉴를 열어도 관리가 있습니다.",
        screen: (n) =>
          freshBlog(tg("<span>⚙ 관리</span>", n, "관리", "e-manage")),
      },
      {
        ey: "STEP 10",
        title: "블로그 정보<br><em>소개글 입력</em>",
        desc: "기본 설정의 블로그 정보 화면이 열립니다. 소개글 칸에 블로그를 소개하는 문구를 입력합니다.",
        mode: "소개글 입력",
        tone: "set",
        note: "소개글은 한글 200자까지 쓸 수 있고 PC 블로그의 프로필 이미지 아래에 보입니다.",
        screen: (n) =>
          admin({
            tab: "기본 설정",
            nav: "블로그 정보",
            body: blogInfo({
              intro: tg(
                `<span class="e-ta">${br(B.intro)}<i class="cur"></i></span>`,
                n,
                "소개글 입력",
                "e-ta-wrap",
              ),
            }),
          }),
      },
      {
        ey: "STEP 11",
        title: "프로필 이미지<br><em>등록</em>",
        desc: "아래로 내려 블로그 프로필 이미지의 등록을 누릅니다.",
        mode: "블로그 프로필 이미지 → 등록",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "기본 설정",
            nav: "블로그 정보",
            scroll: 18,
            body: blogInfo({ profReg: tg(reg, n, "프로필 이미지 등록") }),
          }),
      },
      {
        ey: "STEP 12",
        title: "profile.png<br><em>올리기</em>",
        desc: "이미지 첨부 창에서 찾아보기를 누르고 C:\\bas_mkt\\blog-setup 폴더의 profile.png를 고른 뒤 확인을 누릅니다.",
        mode: "찾아보기 → profile.png → 확인",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "기본 설정",
            nav: "블로그 정보",
            scroll: 18,
            body: blogInfo(),
            extra: uploadPop(
              "C:\\bas_mkt\\blog-setup\\profile.png",
              tg('<span class="ok">확인</span>', n, "확인"),
            ),
          }),
      },
      {
        ey: "STEP 13",
        title: "모바일 배경<br><em>등록</em>",
        desc: "모바일앱 커버 이미지의 등록을 누르고 같은 방법으로 mobile-cover.png를 올립니다.",
        mode: "모바일앱 커버 이미지 → 등록",
        tone: "set",
        note: "모바일 배경은 PC 상단 배경과 따로 보입니다. 휴대폰에서 위치를 다시 맞추려면 블로그 앱의 홈편집 → 이미지 변경에서 조정합니다.",
        screen: (n) =>
          admin({
            tab: "기본 설정",
            nav: "블로그 정보",
            scroll: 18,
            body: blogInfo({
              profThumb: profArt("thumb"),
              coverReg: tg(reg, n, "모바일앱 커버 이미지 등록"),
            }),
          }),
      },
      {
        ey: "STEP 14",
        title: "맨 아래<br><em>확인으로 저장</em>",
        desc: "화면 맨 아래 초록색 확인을 눌러야 지금까지 입력한 내용이 저장됩니다.",
        mode: "확인",
        tone: "keep",
        screen: (n) =>
          admin({
            tab: "기본 설정",
            nav: "블로그 정보",
            scroll: 26,
            body: blogInfo({
              profThumb: profArt("thumb"),
              coverThumb: `<span class="e-thumb">${coverArt()}</span>`,
              save: tg('<span class="e-gbtn">확인</span>', n, "확인 · 저장"),
            }),
          }),
      },
      {
        ey: "STEP 15",
        title: "글배달<br><em>블로그씨 질문</em>",
        desc: "위쪽 메뉴·글·동영상 관리 탭을 열고 왼쪽 글배달의 블로그씨 질문을 누릅니다.",
        mode: "메뉴·글·동영상 관리 → 블로그씨 질문",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "메뉴·글·동영상 관리",
            nav: "상단메뉴 설정",
            navTarget: "블로그씨 질문",
            n,
            body: `<h4 class="e-h4">상단메뉴 설정</h4><div class="e-ph-block"></div>`,
          }),
      },
      {
        ey: "STEP 16",
        title: "블로그씨<br><em>배달중지</em>",
        desc: "오늘의 질문 배달에서 배달중지를 고르고 오른쪽 아래 확인을 누릅니다.",
        mode: "배달중지 선택 → 확인",
        tone: "set",
        note: "블로그씨 질문이 내 블로그 화면에 배달되지 않게 합니다.",
        screen: (n) =>
          admin({
            tab: "메뉴·글·동영상 관리",
            nav: "블로그씨 질문",
            body: `<h4 class="e-h4">블로그씨 질문</h4><div class="e-row two"><b>오늘의 질문 배달</b><div class="v"><span class="e-rd"><i></i>배달</span>${tg('<span class="e-rd"><i class="on"></i>배달중지</span>', n, "배달중지", "e-rd-wrap")}</div></div><div class="e-save right"><span class="e-gbtn">확인</span></div>`,
          }),
      },
      {
        ey: "STEP 17",
        title: "꾸미기 설정<br><em>레이아웃·위젯 설정</em>",
        desc: "꾸미기 설정 탭을 열고 왼쪽 디자인 설정의 레이아웃·위젯 설정을 누릅니다.",
        mode: "꾸미기 설정 → 레이아웃·위젯 설정",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            nav: "스킨 선택",
            navTarget: "레이아웃·위젯 설정",
            n,
            body: `<h4 class="e-h4">스킨 선택</h4><p class="e-using">사용중인 스킨 <b>베이직</b> <u>레이아웃 설정 ›</u> <u>세부 디자인 설정 ›</u></p><div class="e-skins"><span></span><span></span><span></span></div>`,
          }),
      },
      {
        ey: "STEP 18",
        title: "레이아웃은<br><em>2단</em>",
        desc: "위쪽 레이아웃 목록의 첫 번째 묶음에서 왼쪽 사이드바와 넓은 글 영역으로 된 첫 번째 레이아웃을 고릅니다.",
        mode: "2단 레이아웃 선택",
        tone: "set",
        note: "새 블로그는 위젯이 글 아래에 모이는 1단 레이아웃으로 시작합니다.",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            full: true,
            body: layoutPage({ pickTarget: "2단 레이아웃" }, n),
          }),
      },
      {
        ey: "STEP 19",
        title: "가운데 정렬<br><em>글 영역 넓게</em>",
        desc: "오른쪽 레이아웃 설정에서 전체정렬이 중앙인지 확인하고 글 영역을 넓게로 바꿉니다.",
        mode: "중앙 · 넓게",
        tone: "set",
        note: "이렇게 맞춰야 상단 배경의 가운데 966px 안전 영역이 블로그 제목 자리와 겹칩니다.",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            full: true,
            body: layoutPage({ picked: 1, wideTarget: "글 영역 넓게" }, n),
          }),
      },
      {
        ey: "STEP 20",
        title: "메뉴 사용 설정<br><em>4개 끄기</em>",
        desc: "메뉴 사용 설정에서 이웃커넥트, 태그, 최근댓글, 이웃블로그의 체크를 풉니다.",
        mode: "체크 4개 해제",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            full: true,
            body: layoutPage(
              {
                picked: 1,
                wide: 1,
                menuTarget:
                  "이웃커넥트 · 태그 · 최근댓글 · 이웃블로그 체크 해제",
              },
              n,
            ),
          }),
      },
      {
        ey: "STEP 21",
        title: "위젯 사용 설정<br><em>모두 끄기</em>",
        desc: "위젯 사용 설정에서 켜져 있는 달력·카운터·시계·날씨 같은 위젯의 체크를 모두 풉니다.",
        mode: "켜진 위젯 체크 해제",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            full: true,
            body: layoutPage(
              {
                picked: 1,
                wide: 1,
                menuDone: 1,
                widgetTarget: "켜진 위젯 체크 모두 해제",
              },
              n,
            ),
          }),
      },
      {
        ey: "STEP 22",
        title: "미리보기 후<br><em>적용</em>",
        desc: "미리보기로 확인한 뒤 맨 아래 적용을 누릅니다.",
        mode: "적용",
        tone: "keep",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            full: true,
            body: layoutPage(
              {
                picked: 1,
                wide: 1,
                menuDone: 1,
                widgetDone: 1,
                applyTarget: "적용",
              },
              n,
            ),
          }),
      },
      {
        ey: "STEP 23",
        title: "세부 디자인 설정<br><em>열기</em>",
        desc: "꾸미기 설정 왼쪽의 세부 디자인 설정을 누릅니다. 내 블로그 미리보기 오른쪽에 리모콘이 열립니다.",
        mode: "꾸미기 설정 → 세부 디자인 설정",
        tone: "set",
        screen: (n) =>
          admin({
            tab: "꾸미기 설정",
            nav: "스킨 선택",
            navTarget: "세부 디자인 설정",
            n,
            body: `<h4 class="e-h4">스킨 선택</h4><p class="e-using">사용중인 스킨 <b>베이직</b> <u>레이아웃 설정 ›</u> <u>세부 디자인 설정 ›</u></p><div class="e-skins"><span></span><span></span><span></span></div>`,
          }),
      },
      {
        ey: "STEP 24",
        title: "스킨배경<br><em>상단 영역 등록</em>",
        desc: "리모콘 왼쪽의 스킨배경을 누르고 직접등록 탭을 엽니다. 상단 영역의 파일 등록을 누르고 top-bg.png를 고릅니다.",
        mode: "스킨배경 → 직접등록 → 파일 등록",
        tone: "set",
        note: "파일을 고르는 창이 열리면 C:\\bas_mkt\\blog-setup 폴더의 top-bg.png를 선택합니다.",
        screen: (n) =>
          designPage(
            { item: "스킨배경", fileTarget: "상단 영역 파일 등록" },
            n,
          ),
      },
      {
        ey: "STEP 25",
        title: "타이틀<br><em>제목 글자 끄기</em>",
        desc: "리모콘 왼쪽의 타이틀을 누르고 블로그 제목의 표시 체크를 풉니다.",
        mode: "블로그 제목 표시 해제",
        tone: "set",
        note: "블로그 이름은 배경 이미지 가운데에 디자인으로 들어가 있으므로 글자를 겹쳐 표시하지 않습니다.",
        screen: (n) =>
          designPage(
            {
              item: "타이틀",
              bg: 1,
              titleTarget: "블로그 제목 표시 체크 해제",
            },
            n,
          ),
      },
      {
        ey: "STEP 26",
        title: "영역 높이<br><em>500으로 맞추기</em>",
        desc: "표시 바로 아래의 영역 높이 오른쪽 칸에 500을 입력합니다. 상단 배경 이미지의 높이 500px과 같게 맞추는 단계입니다.",
        mode: "영역 높이 500",
        tone: "set",
        note: "슬라이더를 끌어도 되지만 칸에 500을 직접 입력해야 정확합니다.",
        screen: (n) =>
          designPage(
            {
              item: "타이틀",
              bg: 1,
              titleOff: 1,
              height: 500,
              heightTarget: "영역 높이 500 입력",
            },
            n,
          ),
      },
      {
        ey: "STEP 27",
        title: "리모콘<br><em>적용</em>",
        desc: "리모콘 왼쪽 목록 맨 아래의 초록색 적용을 눌러 저장합니다.",
        mode: "적용",
        tone: "keep",
        screen: (n) =>
          designPage(
            {
              item: "타이틀",
              bg: 1,
              titleOff: 1,
              height: 500,
              applyTarget: "리모콘 적용",
            },
            n,
          ),
      },
      {
        ey: "STEP 28",
        title: "완성된 블로그<br><em>확인</em>",
        desc: "내 블로그를 새로 고칩니다. 블로그 이름이 가운데에서 잘리지 않는지, 창 너비를 줄여도 핵심 글자가 남는지 확인합니다.",
        mode: "가운데 블로그 이름 확인",
        tone: "keep",
        note: "휴대폰 블로그 앱에서도 모바일 배경의 글자가 블로그명·프로필과 겹치지 않는지 확인합니다.",
        screen: (n) =>
          styledBlog((art) =>
            tg(art, n, "가운데 안전 영역 · 블로그 이름", "e-head-tg"),
          ),
      },
      {
        final: 1,
        ey: "CHAPTER 08E COMPLETE",
        title: "블로그 기본 설정<br><em>완료</em>",
        desc: "작업 공간, Codex, 에이전트 키트, 블로그 기본 설정까지 마쳤습니다. 08F에서는 기업마당 공고로 첫 블로그 글을 만들어 발행합니다.",
        route: [
          "VS Code",
          "Codex",
          "에이전트 키트",
          "블로그 기본 설정",
          "08F 이어서",
        ],
      },
    ];
  };
})();
