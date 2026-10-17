// 08F: write a Naver blog post from a Bizinfo (기업마당) notice. Registered as a part builder for ai-setup-course.js.
// The student only registers company info, picks a notice, confirms the fact card, reviews and answers "발행".
// Bizinfo screens follow the live site (2026-10-17 reference captures); post images come from ./assets/blog-sample/.
(() => {
  window.AI_SETUP_PARTS = window.AI_SETUP_PARTS || {};
  window.AI_SETUP_PARTS.F = (h) => {
    const { tg, chrome, termBase, head, inputLine, footerTyping, tline } = h;

    /* ---------- sample data ---------- */
    const SAMPLE = "./assets/blog-sample/";
    const img = (name, cls = "") =>
      `<img class="${cls}" src="${SAMPLE}${name}.jpg" alt="">`;
    const POST_DIR = "C:\\bas_mkt\\posts\\20261017-changwon-sme-fund";
    const PROGRAM = "2026년 창원시 중소기업 육성자금 융자지원 계획";
    const TITLE = `${PROGRAM}, 이차보전 조건과 신청 방법`;
    const COMPANY = "OO경영컨설팅";

    const PROMPT_BRAND = [
      "블로그 글에 넣을 회사 정보를 등록해 줘.",
      "회사명: ",
      "대표 전화: ",
      "홈페이지: ",
      "브랜드 색: ",
      "로고 파일: (있으면 경로)",
      "CTA 디자인: A",
    ].join("\n");
    const PROMPT_POST = [
      "기업마당 공고로 네이버 블로그 글을 준비해 줘.",
      "주소: [기업마당 지원사업 목록 또는 공고 주소를 붙여 넣기]",
      "분야: 정책자금, 지원사업, 소상공인, 창업",
      "AGENTS.md 6장 순서대로 진행해 줘.",
    ].join("\n");
    const FIXES = [
      "카드 2번 문구를 본문 표현에 맞춰 다시 써 줘",
      "한도 표를 막대 차트로 바꿔 줘",
      "실사 3번을 은행 창구 장면으로 바꿔 줘",
    ];

    /* ---------- 기업마당 (bizinfo.go.kr) ---------- */
    const BFAV = '<span class="f-bfav">B</span>';
    const MENU = ["정책정보", "활용정보", "고객알림", "이용안내"];
    const SUBMENU = [
      "지원사업 공고",
      "품목별 법정의무 인증제도",
      "행사정보",
      "정책뉴스",
      "입법·행정예고/고시",
      "월간 중기누리",
    ];
    const bizHead = (drop = "") =>
      `<div class="f-bhead"><div class="f-blogo"><small>중소기업 성공 길잡이</small><b>기업마당</b><i>Biz<br>info</i></div><nav>${MENU.map((m, i) => `<span class="${i === 0 && drop ? "on" : ""}">${m}${i === 0 ? drop : ""}</span>`).join("")}</nav><div class="f-butil"><span>전체메뉴보기</span><span>로그인</span><span>통합회원가입</span></div></div>`;
    const bizHome = (n) =>
      chrome(
        "기업마당",
        BFAV,
        "www.bizinfo.go.kr",
        `<div class="f-biz">${bizHead(
          `<div class="f-bdrop">${SUBMENU.map((s, i) => (i === 0 ? tg(s, n, "지원사업 공고", "f-bdrop-it on") : `<span class="f-bdrop-it">${s}</span>`)).join("")}</div>`,
        )}<div class="f-bhome"><h3>중소벤처기업부가 <em>중소기업</em>과 <em>정책</em>을 연결합니다</h3><div class="f-bsearch"><span>검색어를 입력해주세요.</span><i>⌕</i></div><p class="f-bcount">신청 가능한 지원사업 <small>(2026년 10월 17일 기준)</small> <b>1,437건</b></p><div class="f-bcards"><div><b>지원사업공고</b><span>최신공고 <em>173건</em></span><span>마감임박 <em>140건</em></span></div><div class="ph"></div><div><span>행사정보 <em>265건</em></span><span>최신정책뉴스 <em>1,684건</em></span><span>입법·행정예고/고시 <em>121건</em></span></div></div></div></div>`,
      );

    const FIELDS = [
      ["분야", "1437"],
      ["금융", "229"],
      ["기술", "267"],
      ["인력", "176"],
      ["수출", "174"],
      ["내수", "86"],
      ["창업", "60"],
      ["경영", "432"],
      ["기타", "13"],
    ];
    const ALL_ROWS = [
      [
        "1437",
        "인력",
        "[경남] 김해시 2026년 김해형 중소기업 근로소득 청년지원사업 모집 공고",
        "2026-10-14 ~ 2026-10-29",
        "경상남도",
        "김해인재양성재단",
        "2026-10-16",
      ],
      [
        "1436",
        "창업",
        "[경북] 청도군 2026년 청년농업인 R&D 기술창업 통합관리 지원사업 신청 공고",
        "2026-10-16 ~ 2026-11-03",
        "경상북도",
        "기초자치단체",
        "2026-10-16",
      ],
      [
        "1435",
        "경영",
        "[경남] 통영시 강구안 동네상권 컨설팅 (점포환경개선ㆍVMD)사업 참가자 모집 공고",
        "2026-10-12 ~ 2026-10-23",
        "경상남도",
        "기초자치단체",
        "2026-10-16",
      ],
      [
        "1434",
        "경영",
        "[경북] 상주시 2026년 하반기 영농부산물 안전처리 지원사업 신청 공고",
        "2026-10-21 ~ 2026-10-30",
        "경상북도",
        "기초자치단체",
        "2026-10-16",
      ],
      [
        "1433",
        "내수",
        "[경북] 포항시 2026년 소상공인 대상 무료 택시지붕광고 참여업체 추가모집 공고",
        "2026-10-14 ~ 2026-11-30",
        "경상북도",
        "기초자치단체",
        "2026-10-16",
      ],
      [
        "1432",
        "경영",
        "[경남] 거창군 2026년 하반기 착한가격업소(가격안정 모범업소) 지정 모집 재공고",
        "2026-10-15 ~ 2026-10-19",
        "경상남도",
        "기초자치단체",
        "2026-10-16",
      ],
    ];
    const FIN_ROWS = [
      [
        "229",
        "금융",
        "[경남] 창원시 2026년 중소기업 육성자금 지원계획 변경 공고",
        "예산 소진시까지",
        "경상남도",
        "기초자치단체",
        "2026-10-16",
      ],
      [
        "228",
        "금융",
        "2026년 에너지이용합리화자금 융자사업 변경 공고",
        "예산 소진시까지",
        "기후에너지환경부",
        "한국에너지공단",
        "2026-10-16",
      ],
      [
        "227",
        "금융",
        "2026년 10월 문화산업특화보증 공고",
        "2026-10-01 ~ 2026-10-31",
        "문화체육관광부",
        "한국콘텐츠진흥원",
        "2026-10-15",
      ],
      [
        "226",
        "금융",
        "[경북] 2026년 2차 관광진흥기금 융자사업 공고",
        "2026-10-08 ~ 2026-10-21",
        "경상북도",
        "직접수행",
        "2026-10-13",
      ],
      [
        "224",
        "금융",
        "[서울] 은평구 2026년 4분기 중소기업육성기금 융자지원 계획 수정 공고",
        "2026-10-12 ~ 2026-10-23",
        "서울특별시",
        "기초자치단체",
        "2026-10-07",
      ],
      [
        "223",
        "금융",
        "[강원] 2026년 하반기 농어촌진흥기금 지원계획 공고",
        "2026-10-02 ~ 2026-10-30",
        "강원특별자치도",
        "직접수행",
        "2026-10-06",
      ],
    ];
    const LIST_URL =
      'www.bizinfo.go.kr<span class="path">/web/lay1/bbs/S1T122C128/AS/74/list.do</span>';
    const FIN_URL =
      "www.bizinfo.go.kr/sii/siia/selectSIIA200View.do?pblancId=&amp;hashCode=01&amp;rowsSel=6&amp;rows=15&amp;cpage=1";
    const bizList = (o) => {
      const rows = o.fin ? FIN_ROWS : ALL_ROWS;
      const chips = FIELDS.map(([f, c], i) => {
        const on = o.fin ? f === "금융" : i === 0;
        const html = `<i class="f-bico"></i><span class="f-bchip${on ? " on" : ""}">${f}(${c})</span>`;
        return f === "금융" && o.n !== undefined && !o.fin
          ? tg(html, o.n, "금융(229)", "f-bfield")
          : `<span class="f-bfield">${html}</span>`;
      }).join("");
      return chrome(
        "지원사업 공고 | 기업마당",
        BFAV,
        o.url || LIST_URL,
        `<div class="f-biz">${bizHead()}<div class="f-bcrumb">HOME › 정책정보 › 지원사업 공고</div><h3 class="f-btitle">지원사업 공고</h3><div class="f-bsearch2"><span class="sel">지원사업명 ⌄</span><span class="kw">검색어를 입력해 주세요.</span><i>⌕</i><i>⟳</i></div><div class="f-bfields">${chips}</div><table class="f-btable"><thead><tr><th>번호</th><th>지원분야</th><th>지원사업명</th><th>신청기간</th><th>소관부처·지자체</th><th>사업수행기관</th><th>등록일</th></tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="c${i}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
    };

/* ---------- facts.html (사실 카드) · values from the real sample post folder ---------- */
const FACTS = [
  [
    "경영안정자금 규모",
    "2,100억 원(연중)",
    "가. 경영안정자금 : 2,100억 원(연중)",
  ],
  ["시설자금 규모", "300억 원(연중)", "나. 시설자금 : 300억 원(연중)"],
  [
    "운영 방식",
    "자금 소진 여부에 따라 총액 안에서 탄력 운영",
    "※ 자금소진 여부에 따라 총액 내에서 탄력적으로 운영",
  ],
  [
    "지원대상",
    "창원시에 본사와 사업장을 둔 중소기업 중 공고 업종",
    "가. 지원대상 : 창원시에 본사와 사업장을 둔 중소기업 중",
  ],
  [
    "지원내용",
    "대출금의 이차보전금 지원",
    "다. 지원내용 : 대출금의 이차보전금 지원",
  ],
  [
    "이차보전율",
    "거치기간 2년 연 2.5%, 분기별 균등 상환기간 1년 연 1.5%",
    "이차보전 : 연 2.5%(2년 거치기간), 연 1.5%(1년 분기별 균등 상환기간)",
  ],
  [
    "대출금리",
    "시중 대출금리에서 이차보전율을 뺀 금리",
    "대출금리 : 시중 대출금리에서 이차보전율을 감한 금리",
  ],
];
const SLUG = "20261017-changwon-sme-fund";
const FILE_FAV = '<span class="f-filefav">▤</span>';
const fileUrl = (name) =>
  `<span class="path">파일 |</span> C:/bas_mkt/posts/${SLUG}/${name}`;
const notice = (html) => `<div class="f-notice">${html}</div>`;
const factsPage = (n) =>
  chrome(
    "사실 카드",
    FILE_FAV,
    fileUrl("facts.html"),
    `<div class="f-page"><div class="f-page-h"><small>사실 카드 · 기업마당 PBLN_000000000127285</small><b>${PROGRAM}</b><span>${PROGRAM} 공고(창원시) · 신청기간 예산 소진시까지</span></div><div class="f-page-body">${notice("왼쪽 “글에 쓸 내용”이 오른쪽 “공고 원문”과 같은지 확인해 주세요. 같으면 Codex에게 <b>확인</b>이라고 답하고, 다르면 어느 항목이 어떻게 다른지 알려 주세요.")}<div class="f-card"><h6>공고에서 확인한 사실 19개</h6><table class="f-ftable"><thead><tr><th>항목</th><th>글에 쓸 내용</th><th>공고 원문</th></tr></thead><tbody>${FACTS.map(
      ([k, v, q], i) => {
        const quote = `<div class="f-quote">${q}</div>`;
        return `<tr><td class="k">${k}</td><td class="v">${v}</td><td>${i === 5 ? tg(quote, n, "공고 원문과 비교", "f-quote-t") : quote}</td></tr>`;
      },
    ).join("")}</tbody></table></div></div></div>`,
  );

/* ---------- review.html (검수 화면) · text from the real sample post ---------- */
const P = (text, cls = "") =>
  `<p class="f-pp ${cls}">${text.replace(/\n/g, "<br>")}</p>`;
const LEAD = [
  "창원시가 경영안정자금과\n시설자금의 대출 이자를\n덜어 주는 육성자금 계획을\n변경해 다시 공고했습니다.",
  "공고 이름은 「2026년 창원시\n중소기업 육성자금 융자지원\n계획」입니다.",
  `${COMPANY}이 공고문을\n처음부터 끝까지 읽고\n신청 전에 알아 두실 내용을\n차례대로 정리했습니다.`,
];
const phoneTop = (leadTarget) =>
  `<div class="f-phone-h"><b>${TITLE}</b></div>${img("cover", "sq")}${P(LEAD[0])}${leadTarget ? leadTarget(P(LEAD[1])) : P(LEAD[1])}${P(LEAD[2])}${img("card-1")}${P("이번 계획의 연간 지원 규모는\n경영안정자금 2,100억 원,\n시설자금 300억 원입니다.")}`;
const phoneBottom = (ctaTarget) =>
  `${img("chart-bar")}${P("정부는 비수도권 집중 공급을,\n창원시는 소상공인 융자 확대를\n내세우고 있습니다.")}${P("정리하면 이번 공고는\n창원시에 본사와 사업장을 둔\n중소기업 가운데 정해진 업종에\n해당할 때 신청할 수 있습니다.")}${P("대출 이자의 일부를 시가\n보전해 주는 방식이며,\n예산이 소진되면 접수가\n끝납니다.")}${P(`${COMPANY}은 신청 전에\n지원 대상 해당 여부와\n한도·서류 준비를\n함께 확인해 드립니다.`)}${P("출처\n2026년 창원시 중소기업 육성자금 융자지원\n계획 공고(창원시 지역경제과, 기업마당\n2026년 10월 16일 등록)\n벤처스퀘어 2025년 12월 23일 「중기부,\n2026년 중소기업 정책자금 4조 4,313억 원\n운용 계획 발표」\n쿠키뉴스 2026년 2월 4일 「창원시, 상반기\n소상공인 융자 360억원으로 확대」", "src")}${ctaTarget ? ctaTarget(img("cta")) : img("cta")}<p class="f-pp tags">#창원시 #중소기업육성자금 #이차보전 #경영안정자금 #시설자금 #정책자금 #창원중소기업</p>`;
const phone = (inner, end) =>
  `<div class="f-phone${end ? " f-phone-end" : ""}"><div class="f-phone-scr">${inner}</div></div>`;
const CHECKS = [
  ["사실 대조", "사실 19개·외부 자료 2건 모두 원문과 일치"],
  ["숫자", "원고의 모든 숫자가 원문에 있음"],
  ["고유명사", "사업명·기관명 11개 원문 표기 유지"],
  ["리라이팅", "원문과 겹치는 구절 14.6%"],
  ["분량", "본문 2,909자"],
  ["모바일 폭", "한 줄 20자 이하 · 문단 4줄 이하"],
  ["구조", "이미지 22장(카드 4·소제목 7·실사 5·차트 4) · CTA 맨 아래"],
  ["표현", "단정·과장 표현 없음"],
];
const LIST5 = [
  "사업명·기관명이 공고와 똑같은가",
  "금액·기간·비율이 사실 카드와 같은가",
  "표지와 카드 4장 문구가 본문 내용과 맞는가",
  "이미지 속 글자가 깨지거나 잘리지 않았는가",
  "CTA의 회사명·전화번호·주소가 맞는가",
];
// o.target: 'checks' | 'lead' | 'feed' | 'cta'; o.done: checked items; o.end: phone scrolled to the end
const review = (n, o = {}) => {
  const T = o.target;
  const FIVE = ["cover", "card-1", "card-2", "card-3", "card-4"];
  const feed = `<div class="f-card"><h6>최초 5장 이미지 미리보기 (네이버 검색 결과)</h6><div class="f-feed">${FIVE.map((x) => `<span>${img(x)}</span>`).join("")}</div><div class="f-feed big">${FIVE.slice(
    0,
    4,
  )
    .map((x) => `<span>${img(x)}</span>`)
    .join("")}</div></div>`;
  const list = `<div class="f-card"><h6>발행 전 체크리스트</h6><ol class="f-list">${LIST5.map((c, i) => `<li class="${o.done > i ? "done" : ""}"><i>${o.done > i ? "✓" : ""}</i>${c}</li>`).join("")}</ol></div>`;
  const checks = `<div class="f-card"><h6>자동 검사 결과</h6><ul class="f-checks">${CHECKS.map(([k, v]) => `<li><i>✓</i><b>${k}</b> ${v}</li>`).join("")}</ul></div>`;
  const leadT =
    T === "lead"
      ? (html) => tg(html, n, "사업명 원문 표기 확인", "f-pp-t", "div")
      : null;
  const ctaT =
    T === "cta"
      ? (html) => tg(html, n, "CTA 회사 정보 확인", "f-cta-t", "div")
      : null;
  const right = `${notice("아래 체크리스트로 확인한 뒤, 이대로 올리려면 Codex에게 <b>발행</b>이라고 답해 주세요. 고칠 곳이 있으면 어느 이미지·문단인지 알려 주세요.")}${T === "feed" ? tg(feed, n, "최초 5장 이미지 미리보기", "f-rv-t", "div") : feed}${list}${T === "checks" ? tg(checks, n, "자동 검사 결과", "f-rv-t", "div") : checks}`;
  return chrome(
    "발행 전 검수",
    FILE_FAV,
    fileUrl("review.html"),
    `<div class="f-page"><div class="f-page-h"><small>발행 전 검수 · ${SLUG}</small><b>${TITLE}</b><span>이미지 22장 · 문단 25개 · 태그 7개</span></div><div class="f-rv-body"><div class="f-rv-left">${phone(o.end ? phoneBottom(ctaT) : phoneTop(leadT), o.end)}</div><div class="f-rv-right"><div class="f-rv-scroll" style="transform:translateY(-${o.scroll || 0}cqw)">${right}</div></div></div></div>`,
  );
};
    /* ---------- terminal pieces ---------- */
    const CANDS = [
      [
        "1",
        "2026년 에너지이용합리화자금 융자사업 변경 공고",
        "한국에너지공단",
        "예산 소진시까지",
        "충분",
      ],
      [
        "2",
        "2026년 10월 문화산업특화보증 공고",
        "한국콘텐츠진흥원",
        "2026-10-01 ~ 2026-10-31",
        "충분",
      ],
      [
        "3",
        "[경남] 창원시 2026년 중소기업 육성자금 지원계획 변경 공고",
        "창원시",
        "예산 소진시까지",
        "충분",
      ],
      [
        "4",
        "[경북] 2026년 2차 관광진흥기금 융자사업 공고",
        "경상북도",
        "2026-10-08 ~ 2026-10-21",
        "충분",
      ],
      [
        "5",
        "[서울] 은평구 2026년 4분기 중소기업육성기금 융자지원 계획 수정 공고",
        "은평구",
        "2026-10-12 ~ 2026-10-23",
        "부족",
      ],
    ];
    const candLines = () => [
      "[[dim|•]] 기업마당 목록에서 접수 중인 금융 분야 공고 5개를 골랐습니다.",
      "",
      "  [[dim|번호  사업명 · 기관 · 신청기간 · 글감   (분야: 모두 금융)]]",
      ...CANDS.map(
        ([no, name, org, period, ok]) =>
          `  [[b|${no}]]     ${name} [[dim|·]] ${org} [[dim|·]] ${period} [[dim|·]] ${ok === "충분" ? `[[g|${ok}]]` : `[[y|${ok}]]`}`,
      ),
      "",
      "  후보 공고입니다. 글로 쓸 공고 번호를 알려 주세요.",
      "",
    ];
    const factsAsk = () => [
      "[[b|›]] 3번으로 해 줘",
      "",
      "[[dim|•]] 공고 본문과 첨부 공고문(hwpx)을 읽었습니다 · 공고 사실 19개 · 외부 자료 2건(벤처스퀘어, 쿠키뉴스)",
      "[[dim|•]] 사실 카드 검사를 통과했습니다 · 19개 항목",
      "",
      `  사실 카드를 확인해 주세요: ${POST_DIR}\\facts.html`,
      "  공고 원문과 같으면 '확인'이라고 답해 주세요.",
      "",
    ];
    const work = () => [
      "[[b|›]] 확인",
      "",
      "[[dim|•]] 원고를 썼습니다 · 본문 2,909자 · 문단 25개 · 카드 4 · 소제목 7",
      "[[dim|•]] 실사 이미지를 만들었습니다 · 표지 배경 1장 · 본문 실사 5장",
      "[[dim|•]] 이미지를 조립했습니다 · 22장(표지 1 · 카드 4 · 소제목 7 · 실사 5 · 차트 4 · CTA 1)",
      "[[dim|•]] 검사를 통과했습니다 · [[g|사실 대조 · 숫자 · 고유명사 · 리라이팅 14.6% · 분량 2,909자 · 모바일 폭 · 구조 · 표현]]",
      "",
    ];

    /* ---------- concept: roles ---------- */
    const rolesHtml = `<div class="f-roles">
      <div class="f-roles-col"><h5>직접 하는 일 <em>답 세 번</em></h5>
        <div class="card on"><small>01 · 공고 고르기</small><strong>후보 표에서 번호 답하기</strong><p>Codex가 접수 중인 공고 5개를 보여 주면 글로 쓸 번호를 고릅니다.</p><span class="f-say">3번으로 해 줘</span></div>
        <div class="card on"><small>02 · 사실 확인</small><strong>사실 카드와 공고 원문 비교</strong><p>사업명·금액·기간·비율이 공고 원문과 같은지 확인합니다.</p><span class="f-say">확인</span></div>
        <div class="card on"><small>03 · 검수 · 발행</small><strong>검수 화면 확인 후 발행 답하기</strong><p>체크리스트 5개로 확인하고, 고칠 곳은 말로 요청합니다.</p><span class="f-say">발행</span></div>
      </div>
      <div class="f-roles-col agent"><h5>Codex가 하는 일 <em>키트 규칙대로</em></h5>
        <div class="card"><small>조사</small><strong>공고 본문 · 첨부 공고문 읽기</strong><p>부족하면 관련 기사와 2025~2026년 정책 흐름을 출처와 함께 모읍니다.</p></div>
        <div class="card"><small>원고</small><strong>회사 말투로 다시 쓰기</strong><p>사업명·기관명·숫자는 그대로 두고 표현만 바꿉니다. 본문 2,800자 이상입니다.</p></div>
        <div class="card"><small>실사</small><strong>표지 배경 · 본문 실사 4~5장</strong><p>한국 업무현장 장면을 글자 없이 만듭니다.</p></div>
        <div class="card"><small>조립 · 검사</small><strong>이미지 22장 조립, 검사 8가지</strong><p>검사를 모두 통과해야 검수 화면을 보냅니다.</p></div>
      </div>
    </div>`;

    /* ---------- concept: post structure ---------- */
    const bars = (k = 3) =>
      `<div class="f-bars">${Array.from({ length: k }, (_, i) => `<i style="width:${[92, 78, 86, 64][i % 4]}%"></i>`).join("")}</div>`;
    const PARTS = [
      ["cover", "표지", "1", "대형 타이포 + 주제 실사 배경"],
      ["card-1", "메시지 카드", "4", "최초 5장 이미지 · 대형 타이포"],
      ["band-1", "소제목", "7", "회사 · 소제목 · 번호 3구역"],
      ["chart-bar", "차트", "4", "공고·출처 자료의 숫자로 그린 그림"],
      ["photo-1", "실사", "5", "Codex가 만든 업무현장 사진"],
      ["cta", "CTA", "1", "홈페이지 링크 · 고정 디자인"],
    ];
    const structHtml = `<div class="f-struct">
      <div class="f-sphone"><div class="f-sphone-scr">${img("cover")}${bars()}${img("card-1")}${bars(2)}${img("card-2")}${bars(3)}${img("card-3")}${bars(2)}${img("card-4")}${bars(3)}${img("band-1")}${bars(3)}${img("photo-1")}${bars(2)}${img("chart-bar")}</div></div>
      <div class="f-sparts"><div class="f-sparts-h"><b>이미지 22장</b><span>모든 이미지 사이에 문단이 들어갑니다</span></div>${PARTS.map(([f, name, cnt, d]) => `<div class="f-spart">${img(f)}<div><b>${name} <em>${cnt}</em></b><span>${d}</span></div></div>`).join("")}<p class="f-snote">최초 5장 이미지(표지 + 카드 4장)는 네이버 검색 결과의 이미지 5개 미리보기에 그대로 걸립니다. 글을 열지 않아도 메시지가 전달되도록 대형 타이포로 만듭니다.</p></div>
    </div>`;

    /* ---------- 네이버 블로그 글쓰기 화면 · 예약 발행 목록 ---------- */
    // Header follows the 2026-10-17 editor capture. The reserve list (reserve_btn → item rows, trash shown on hover,
    // native confirm) follows the production reserve tool notes; compare once on a real reserved account.
    const NBFAV = '<span class="f-nbfav">b</span>';
    const RESERVE_AT = "2026. 10. 17. 18:30";
    const TOOLS = [
      "사진",
      "MYBOX",
      "동영상",
      "스티커",
      "인용구",
      "구분선",
      "링크",
      "파일",
      "일정",
      "소스코드",
      "표",
      "수식",
      "장소",
    ];
    const TRASH =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
    const ASK_MANUAL = [
      "[[dim|•]] 예약했거나 올라간 글은 제가 고치지 않습니다.",
      "  네이버 블로그 수정 화면에서 직접 고치시는 것이 가장 정확합니다.",
      "  에이전트가 네이버 글을 고치면 실패할 때가 많습니다.",
    ];
    const nvWrite = (n) =>
      chrome(
        "블로그 글쓰기",
        NBFAV,
        'blog.naver.com<span class="path">/myblog?Redirect=Write&amp;</span>',
        `<div class="f-ed"><div class="f-ed-top"><span class="f-ed-logo"><i>N</i>blog</span><div class="f-ed-act"><span class="f-ed-resv on">예약 발행 <b>1</b>건</span><span class="f-ed-save">저장<em>3</em></span><span class="f-ed-pub">발행</span></div></div><div class="f-ed-tools">${TOOLS.map((t) => `<span><i></i>${t}</span>`).join("")}</div><div class="f-ed-body"><div class="f-ed-title">제목</div><div class="f-ed-text">글감과 함께 나의 일상을 기록해보세요!</div></div><div class="f-ed-layer"><div class="f-ed-layer-h"><b>예약 발행</b><span>1건</span><i>✕</i></div><ul><li class="hover"><div><b>${TITLE}</b><span>${RESERVE_AT} 발행 예정</span></div>${tg(`<span class="f-ed-del">${TRASH}</span>`, n, "삭제", "f-ed-delt")}</li></ul></div></div>`,
      );

    return [
      {
        cover: 1,
        ey: "CHAPTER 08F · BLOG POST",
        title: "기업마당 공고로<br><em>블로그 글 만들기</em>",
        desc: "기업마당의 정부지원사업 공고를 우리 회사가 전하는 소식으로 다시 써서 네이버 블로그에 올립니다. 조사·원고·이미지·검사는 Codex가 맡고, 직접 하는 일은 공고 고르기·사실 확인·발행 승인입니다.",
        route: ["회사 정보", "공고 고르기", "사실 확인", "검수", "발행"],
      },
      {
        concept: 1,
        ey: "ROLES",
        title: "세 번만<br><em>답하면 됩니다</em>",
        desc: "글의 품질 기준은 키트 안의 규칙과 검사 도구에 들어 있습니다. 그래서 Codex에게 보내는 문장은 짧아도 됩니다.",
        html: rolesHtml,
      },
      {
        concept: 1,
        ey: "POST STRUCTURE",
        title: "글 한 편의<br><em>구성</em>",
        desc: "표지 다음에 메시지 카드 4장이 나오고, 소제목 7개 아래에 문단과 차트·실사가 번갈아 들어갑니다. 마지막은 출처와 CTA입니다.",
        note: "<b>이 구성은 권장안입니다.</b> 대표님의 실제 운영 내용에 맞게 조정해도 됩니다. 표지 다음 메시지 카드 4장도 대표님에게 맞는 내용으로 자유롭게 바꿀 수 있습니다. 바꿀 구성은 Codex에게 말로 요청합니다.",
        html: structHtml,
      },
      {
        ey: "STEP 01",
        title: "회사 정보<br><em>한 번 등록</em>",
        desc: "Codex에게 아래 문장을 붙여 넣고 빈칸에 회사 정보를 적은 뒤 Enter를 누릅니다. CTA와 소제목 이미지에 들어갑니다.",
        mode: "복사 → 빈칸 채우기 → Enter",
        tone: "set",
        note: "CTA 디자인은 A 상담 연결형, B 체크리스트형, C 티켓형 중 하나를 적습니다. 처음 한 번만 등록합니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_BRAND, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                `블로그 글에 넣을 회사 정보를 등록해 줘. 회사명: ${COMPANY} · 대표 전화: 055-000-0000 · 홈페이지: https://oo-consulting.co.kr …`,
              ),
              n,
              "회사 정보 문장 붙여넣기 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 02",
        title: "기업마당<br><em>지원사업 공고</em>",
        desc: "Chrome에서 기업마당(bizinfo.go.kr)을 엽니다. 위쪽 메뉴의 정책정보에 마우스를 올리고 지원사업 공고를 누릅니다.",
        mode: "정책정보 → 지원사업 공고",
        tone: "set",
        note: "기업마당은 중소벤처기업부가 운영하는 정부지원사업 안내 사이트입니다. 로그인하지 않아도 공고를 볼 수 있습니다.",
        screen: (n) => bizHome(n),
      },
      {
        ey: "STEP 03",
        title: "분야<br><em>금융 고르기</em>",
        desc: "지원사업 공고 목록이 열립니다. 정책자금 글을 쓰려면 분야 줄에서 금융을 누릅니다. 창업 지원 글이면 창업을 누릅니다.",
        mode: "금융(229) 클릭",
        tone: "set",
        note: "분야를 고르지 않고 전체 목록 주소를 그대로 넘겨도 됩니다. Codex가 요청 문장의 분야에 맞는 공고를 골라 줍니다.",
        screen: (n) => bizList({ n }),
      },
      {
        ey: "STEP 04",
        title: "주소창 주소<br><em>복사하기</em>",
        desc: "금융 분야 공고만 남은 것을 확인한 뒤 주소창을 누릅니다. 주소 전체가 파랗게 선택되면 Ctrl + C로 복사합니다.",
        mode: "주소창 클릭 → Ctrl + C",
        tone: "set",
        note: "특정 공고 하나로 쓰고 싶으면 그 공고를 열고 상세 화면의 주소를 복사합니다. 그러면 후보 고르기 단계를 건너뜁니다.",
        screen: (n) =>
          bizList({
            fin: true,
            url: tg(
              `<span class="f-urlsel">${FIN_URL}</span>`,
              n,
              "주소창 주소 복사",
            ),
          }),
      },
      {
        ey: "STEP 05",
        title: "Codex에게<br><em>글 준비 요청</em>",
        desc: "Codex에게 아래 문장을 붙여 넣고 대괄호 부분을 지운 뒤 복사한 기업마당 주소를 붙여 넣습니다. Enter를 누르면 Codex가 공고 목록을 읽기 시작합니다.",
        mode: "복사 → 주소 붙여 넣기 → Enter",
        tone: "set",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_POST, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "기업마당 공고로 네이버 블로그 글을 준비해 줘. 주소: https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do?…hashCode=01… 분야: 정책자금, 지원사업, 소상공인, 창업 AGENTS.md 6장 순서대로 진행해 줘.",
              ),
              n,
              "글 준비 요청 문장 입력 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 06",
        title: "후보 표 보고<br><em>번호로 답하기</em>",
        desc: "Codex가 접수 중인 공고 후보 5개를 표로 보여 줍니다. 신청기간과 글감을 보고 글로 쓸 공고의 번호를 답합니다.",
        mode: "3번으로 해 줘 → Enter",
        tone: "set",
        note: "글감이 ‘부족’인 공고는 첨부 공고문이 없어 내용이 짧을 수 있습니다. 가능하면 ‘충분’인 공고를 고릅니다.",
        screen: (n) =>
          termBase([
            ...head(),
            ...candLines(),
            tline(inputLine("3번으로 해 줘"), n, "공고 번호 답하기"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 07",
        title: "사실 카드<br><em>원문과 비교</em>",
        desc: "Codex가 알려 준 facts.html 경로를 복사해 Chrome 주소창에 붙여 넣습니다. 항목마다 ‘글에 쓸 내용’이 오른쪽 공고 원문과 같은지 확인합니다.",
        mode: "글에 쓸 내용 ↔ 공고 원문",
        tone: "keep",
        note: "숫자 하나가 틀리면 글 전체가 틀립니다. 금액·비율·기간은 한 글자씩 대조합니다. 다른 곳이 있으면 Codex에게 그 항목을 말해 줍니다.",
        screen: (n) => factsPage(n),
      },
      {
        ey: "STEP 08",
        title: "‘확인’이라고<br><em>답하기</em>",
        desc: "사실 카드가 공고 원문과 같으면 Codex에게 확인이라고 답합니다. 이때부터 원고 작성, 실사 생성, 이미지 조립, 검사를 Codex가 이어서 진행합니다.",
        mode: "확인 → Enter",
        tone: "set",
        screen: (n) =>
          termBase([
            ...head(),
            ...candLines().slice(-2),
            ...factsAsk(),
            tline(inputLine("확인"), n, "확인 답하기"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 09",
        title: "작업이 끝나면<br><em>검수 화면 열기</em>",
        desc: "이 단계에서는 기다리기만 하면 됩니다. Codex가 검사까지 통과하면 review.html 경로를 보내 줍니다. 경로를 복사해 Chrome 주소창에 붙여 넣습니다.",
        mode: "review.html 경로 → Chrome",
        tone: "keep",
        note: "실사 이미지 6장을 만드는 동안 시간이 걸립니다. 이미지 생성은 ChatGPT 사용 한도를 글보다 빨리 쓰므로, 한도가 얼마 남지 않았으면 다음 날 진행합니다.",
        screen: (n) =>
          termBase([
            ...head(),
            ...work(),
            tline(
              `  검수 화면을 확인해 주세요: ${POST_DIR}\\review.html`,
              n,
              "review.html 경로",
            ),
            "",
            "  이대로 올리려면 '발행'이라고 답해 주세요. 고칠 곳이 있으면 말씀해 주세요.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 10",
        title: "검수 화면<br><em>자동 검사 결과</em>",
        desc: "왼쪽은 휴대폰에서 보일 글이고, 오른쪽은 미리보기·체크리스트·자동 검사 결과입니다. 오른쪽 아래 자동 검사 8가지가 모두 초록색 체크인지 먼저 확인합니다.",
        mode: "8가지 모두 ✓ 확인",
        tone: "keep",
        note: "검사는 숫자·고유명사가 공고와 같은지, 원문 표현을 그대로 옮기지 않았는지, 분량과 모바일 줄 폭이 맞는지를 확인합니다.",
        screen: (n) => review(n, { target: "checks", scroll: 22 }),
      },
      {
        ey: "STEP 11",
        title: "사업명과 숫자<br><em>대조하기</em>",
        desc: "리드 문단의 공고 이름이 공고와 한 글자도 다르지 않은지 대조합니다. 본문의 금액·기간·비율이 사실 카드와 같은지도 함께 확인합니다.",
        mode: "체크리스트 1 · 2",
        tone: "keep",
        note: "사업명과 기관명은 줄이거나 바꾸지 않는 것이 규칙입니다. 다르게 적힌 곳이 있으면 Codex에게 그대로 알려 줍니다.",
        screen: (n) => review(n, { target: "lead" }),
      },
      {
        ey: "STEP 12",
        title: "최초 5장 이미지<br><em>대형 타이포</em>",
        desc: "최초 5장 이미지 미리보기에서 표지와 카드 문구가 본문 내용과 맞는지 검토합니다. 작게 보여도 글자가 읽히는지, 깨지거나 잘린 곳이 없는지도 확인합니다.",
        mode: "체크리스트 3 · 4",
        tone: "keep",
        note: "<b>최초 5장 이미지를 대형 타이포로 만드는 이유:</b> 네이버에서 검색하면 글마다 이미지 5개가 미리보기로 나옵니다. 글을 열지 않은 사람에게도 이 다섯 장만으로 메시지가 전달되게 하려는 것입니다.",
        screen: (n) => review(n, { target: "feed", done: 2 }),
      },
      {
        ey: "STEP 13",
        title: "CTA<br><em>회사 정보 확인</em>",
        desc: "휴대폰 미리보기를 맨 아래까지 내려 CTA 이미지의 회사명·전화번호·홈페이지 주소가 맞는지 대조합니다. 출처 문단이 CTA 위에 있는지도 확인합니다.",
        mode: "체크리스트 5",
        tone: "keep",
        note: "CTA 이미지에는 등록한 홈페이지로 가는 링크가 걸립니다. 회사 정보가 바뀌면 STEP 01 문장으로 다시 등록합니다.",
        screen: (n) => review(n, { target: "cta", done: 4, end: true }),
      },
      {
        ey: "STEP 14",
        title: "고칠 곳은<br><em>말로 요청</em>",
        desc: "고칠 곳은 어느 이미지나 문단인지 짚어서 말합니다. Codex가 고치고 검사를 다시 통과하면 검수 화면을 새로 고침(F5)해 확인합니다.",
        mode: "수정 요청 → Enter",
        tone: "set",
        note: "<b>굵게·밑줄 같은 꾸미기는 Codex에게 맡기지 않습니다.</b> 오류가 잦아 글이 올라간 뒤 직접 하는 편이 빠릅니다.",
        copy: FIXES.map((code, i) => ({
          label: `수정 요청 예시 ${i + 1}`,
          code,
          prompt: true,
        })),
        screen: (n) =>
          termBase([
            ...head(),
            ...work().slice(-2),
            `  검수 화면을 확인해 주세요: ${POST_DIR}\\review.html`,
            "",
            tline(inputLine(FIXES[0]), n, "수정 요청 입력"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 15",
        title: "‘발행’이라고<br><em>답하기</em>",
        desc: "검수 화면에 고칠 곳이 없으면 Codex에게 발행이라고 답합니다. Codex가 글쓰기 화면에 제목과 본문을 한 글자씩 입력하고 이미지·태그를 넣은 뒤, 바로 올리지 않고 3시간 뒤로 예약합니다.",
        mode: "발행 → Enter",
        tone: "set",
        note: "<b>네이버 블로그에는 원고를 복사해 붙여 넣지 않습니다.</b> 붙여 넣은 글은 자동 입력으로 감지될 수 있습니다. 입력하는 10분 정도는 Chrome 창을 건드리지 않고, 노트북 덮개도 닫지 않습니다.",
        screen: (n) =>
          termBase([
            ...head(),
            `[[b|›]] ${FIXES[0]}`,
            "",
            "[[dim|•]] 카드 2번 문구를 본문 표현에 맞춰 고치고 검사를 다시 통과했습니다.",
            `  검수 화면을 새로 고쳐 확인해 주세요: ${POST_DIR}\\review.html`,
            "",
            tline(inputLine("발행"), n, "발행 답하기"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 16",
        title: "예약 결과<br><em>확인하기</em>",
        desc: "입력이 끝나면 Codex가 예약 시각과 글 제목, 결과 코드를 알려 줍니다. 결과 코드 0이면 예약이 정상으로 잡힌 것입니다. 예약 시각이 되면 글이 블로그에 올라옵니다.",
        mode: "결과 코드 0 · 예약 시각",
        tone: "keep",
        note: "시각을 정하고 싶으면 발행 대신 ‘내일 오전 9시에 예약해 줘’처럼 답합니다. 결과 코드가 0이 아니면 Codex가 다음 행동을 알려 줍니다. 같은 글을 다시 올리라고 요청하지 않습니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 발행",
            "",
            "[[dim|•]] 네이버 세션을 확인했습니다 · [[g|[myblog] 성공]] · NID_AUT 영속",
            "[[dim|•]] 제목·본문을 한 글자씩 입력하고 이미지 22장·태그 7개를 넣었습니다.",
            "[[dim|•]] 3시간 뒤로 예약하고 예약 목록에서 제목을 확인했습니다.",
            "",
            tline(
              `  [[g|예약 완료]] · 2026-10-17 18:30 발행 예정 · ${TITLE} · 결과 코드 0`,
              n,
              "예약 결과 · 결과 코드 0",
            ),
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 17",
        title: "올라간 글은<br><em>직접 고치기</em>",
        desc: "예약했거나 이미 올라간 글은 네이버 블로그에서 직접 고칩니다. Codex에게 고쳐 달라고 하면 Codex는 고치지 않고 직접 고치도록 안내합니다.",
        mode: "네이버에서 직접 수정",
        tone: "keep",
        note: "<b>에이전트가 네이버 글을 고치면 실패할 때가 많고, 자동 수정으로 문제가 생길 수도 있습니다.</b> 고칠 곳은 ‘발행’이라고 답하기 전에 검수 화면에서 모두 요청합니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 예약한 글에서 카드 2번 문구를 고쳐 줘",
            "",
            ASK_MANUAL[0],
            tline(ASK_MANUAL[1], n, "직접 수정 안내"),
            ASK_MANUAL[2],
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 18",
        title: "예약 글 확인은<br><em>예약 발행 목록</em>",
        desc: "글쓰기 화면 위쪽의 ‘예약 발행 1건’을 누르면 예약해 둔 글 목록이 나옵니다. 올리지 않기로 한 글은 줄에 마우스를 올려 휴지통을 누르고 확인합니다.",
        mode: "예약 발행 1건 → 휴지통",
        tone: "set",
        note: "고칠 곳이 있으면 글이 올라간 뒤 그 글의 수정 화면에서 직접 고칩니다. 예약을 지우기 전에는 제목을 확인합니다.",
        screen: (n) => nvWrite(n),
      },
      {
        final: 1,
        ey: "CHAPTER 08F COMPLETE",
        title: "블로그 글<br><em>예약 완료</em>",
        desc: "회사 정보 등록부터 공고 고르기, 사실 확인, 검수, 예약 발행까지 마쳤습니다. 다음 공고부터는 STEP 05 문장 하나로 같은 과정을 반복합니다. 다음은 Meta SNS 자동화입니다.",
        route: [
          "회사 정보",
          "공고 고르기",
          "사실 확인",
          "검수 · 발행",
          "다음 챕터",
        ],
      },
    ];
  };
})();
