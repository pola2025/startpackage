// 08H: Meta lead ads automation (instant form + standard lead ad). Part builder for ai-setup-course.js.
// The student sends copy-ready request sentences, checks the settings table and says "게재 시작"; the kit (tools/meta/ads.mjs) does the rest.
// Polarad accepts the lead ads terms and the non-discrimination policy in advance, so there is no consent step here.
// Reuses the 08G phone/roles styles (ai-setup-08g.css); the ad image comes from ./assets/ads-sample/ (cards.mjs --ad on the 08F sample post).
(() => {
  window.AI_SETUP_PARTS = window.AI_SETUP_PARTS || {};
  window.AI_SETUP_PARTS.H = (h) => {
    const { tg, chrome, termBase, head, inputLine, footerTyping, tline } = h;

    /* ---------- sample data ---------- */
    const COMPANY = "OO경영컨설팅";
    const HANDLE = "oo.consulting";
    const NAME = "261017_정책자금광고";
    const AD_DIR = "C:\\bas_mkt\\ads\\20261017-policy-fund";
    const AD_IMG = '<img src="./assets/ads-sample/ad.jpg" alt="">';
    const MESSAGE = [
      "📌 정책자금 신청,",
      "어디서부터 시작할지",
      "막막하신가요?",
      "",
      "✅ 우리 회사가 받을 수 있는",
      "자금부터 확인해 드립니다.",
      "",
      "👇 아래 신청하기를 눌러",
      "상담을 신청하세요.",
    ];

    const PROMPT_CHECK = [
      "Meta 광고 계정을 점검해 줘.",
      "AGENTS.md 8장 순서대로 진행해 줘.",
    ].join("\n");
    // The whole form is in the sentence: the agent copies it into ad.json word for word and creates it without asking again.
    const PROMPT_FORM = [
      "Meta 광고용 입력양식을 만들어 줘.",
      `양식 이름: ${NAME}`,
      "질문 1: 사업자 종류 (선택: 개인사업자 / 법인사업자)",
      "질문 2: 지역 (예: 서울 강남구)",
      "질문 3: 업종 / 회사명",
      "질문 4: 직전년도 매출",
      "이름·전화번호: 자동 입력",
      "정보 취급 설명: 접수된 정보는 상담 후 폐기됩니다.",
      "완료 화면 제목: 상담접수 완료",
      "완료 화면 내용: 담당자 확인후 1일 이내 연락드릴 예정입니다.",
      "AGENTS.md 8.1 순서대로 진행해 줘.",
    ].join("\n");
    const PROMPT_AD = [
      "같은 이름으로 Meta 잠재 고객 광고를 만들어 줘.",
      "하루 예산: 28,000원",
      "광고 이미지: 08F 블로그 글 표지",
      "지역: 전국(제주 제외)",
      "AGENTS.md 8.2 순서대로 진행해 줘.",
    ].join("\n");

    /* ---------- shared bits ---------- */
    const FILE_FAV = '<span class="g-filefav">▤</span>';
    const stage = (inner) =>
      `<div class="screen light"><div class="g-stage">${inner}</div></div>`;
    const phone = (inner, cls = "") =>
      `<div class="g-phone ${cls}"><div class="g-notch"></div>${inner}</div>`;
    const formHead = `<div class="h-fhead"><i>OO</i><b>${COMPANY}</b><span>✕</span></div>`;

    /* ---------- customer view of the instant form ---------- */
    const formQuestions = (n, target) => {
      const q = `<div class="h-fbody"><h5>질문</h5>
        <div class="h-fq"><b>사업자 종류</b><div class="h-fopt"><i></i>개인사업자</div><div class="h-fopt"><i></i>법인사업자</div></div>
        <div class="h-fq"><b>지역 (예: 서울 강남구)</b><div class="h-fin">답변 입력</div></div>
        <div class="h-fq"><b>업종 / 회사명</b><div class="h-fin">답변 입력</div></div>
        <div class="h-fq"><b>직전년도 매출</b><div class="h-fin">답변 입력</div></div>
        <h6>연락처 정보</h6>
        <div class="h-fq"><b>이름</b><div class="h-fin auto">자동 입력</div></div>
        <div class="h-fq"><b>전화번호</b><div class="h-fin auto">자동 입력</div></div>
        <span class="h-fbtn">다음</span></div>`;
      return phone(formHead + (target ? tg(q, n, target, "h-ft", "div") : q));
    };
    const formPrivacy = () =>
      phone(
        `${formHead}<div class="h-fbody"><h5>개인정보처리방침</h5><div class="h-fdisc"><b>개인정보 수집·이용 안내</b><p>접수된 정보는 상담 후 폐기됩니다.</p></div><p class="h-flink">${COMPANY} 개인정보처리방침</p><span class="h-fbtn">제출</span></div>`,
      );
    const formDone = () =>
      phone(
        `${formHead}<div class="h-fbody done"><div class="h-fcheck">✓</div><h4>상담접수 완료</h4><p>담당자 확인후 1일 이내 연락드릴 예정입니다.</p><span class="h-fbtn">웹사이트 보기</span></div>`,
      );

    /* ---------- review.html (settings table) ---------- */
    const ROWS = [
      ["이름 통일", NAME],
      ["목표 · 하루 예산", "잠재 고객 · 28,000원"],
      ["전환 위치", "인스턴트 양식"],
      ["위치", "대한민국 (제주 제외)"],
      ["언어 · 연령", "한국어 · 25세 이상"],
      ["타겟 자동 확장", "끔"],
      ["노출 위치", "인스타그램만 (피드·탐색·릴스·프로필 피드)"],
      ["노출 위치가 아닌 곳에도 노출", "끔"],
      ["다른 광고와 함께 게시", "끔"],
      ["행동 유도 버튼", "신청하기"],
      ["연결 양식", NAME],
      ["상태", "일시 중지 / 일시 중지 / 일시 중지"],
    ];
    const adPhone = (cls = "") =>
      `<div class="h-adphone ${cls}"><div class="h-adhead"><i>OO</i><b>${HANDLE}</b><span>광고</span></div><div class="h-adimg">${AD_IMG}</div><div class="h-adcta"><span>신청하기</span><span>›</span></div><div class="h-adcap">${MESSAGE.map((l) => l || "&nbsp;").join("<br>")}</div></div>`;
    const adReview = (n, target) => {
      const table = `<div class="g-rbox h-table"><h6>설정 확인표 <small>Meta에서 다시 읽은 값</small></h6><table>${ROWS.map(([k, v]) => `<tr><td>✅</td><td>${k}</td><td>${v}</td></tr>`).join("")}</table></div>`;
      const box = `<div class="g-rbox"><h6>광고 관리자에서 확인</h6><p class="h-link">https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=…</p><p>이대로 광고를 시작하려면 Codex에게 <b>게재 시작</b>이라고 답합니다. 시작하기 전에는 광고비가 나가지 않습니다.</p></div>`;
      return chrome(
        "광고 설정 확인",
        FILE_FAV,
        `<span class="path">파일 |</span> C:/bas_mkt/ads/20261017-policy-fund/review.html`,
        `<div class="h-review ad">${adPhone()}<div class="g-rside">${target === "table" ? tg(table, n, "설정 확인표", "h-rt", "div") : table}${box}</div></div>`,
      );
    };

    /* ---------- leads: homepage admin (상담신청) + Telegram, same layout idea as chapter 11 ---------- */
    const LEADS = [
      [
        "방금",
        "김**",
        "법인 · 경남 창원시",
        "제조업 / OO산업",
        "Meta 광고",
        "상담 대기",
      ],
      [
        "10:14",
        "이**",
        "개인 · 서울 강남구",
        "음식점 / OO식당",
        "Meta 광고",
        "상담 대기",
      ],
      [
        "어제",
        "박**",
        "법인 · 부산 해운대구",
        "도소매 / OO상사",
        "홈페이지",
        "상담 완료",
      ],
    ];
    const leadRow = (r) =>
      `<div class="h-adm-row">${r.map((c, j) => `<span class="${j === 5 ? (c === "상담 대기" ? "wait" : "done") : ""}">${c}</span>`).join("")}</div>`;
    const leadsScreen = (n) =>
      stage(`<div class="h-adm"><div class="h-adm-bar"><i></i><i></i><i></i><span>admin.oo-consulting.co.kr/inquiries</span></div>
        <div class="h-adm-body"><aside><b>${COMPANY}</b><span>대시보드</span><span class="on">상담신청</span><span>통계</span></aside>
        <main><h5>상담신청 <small>오늘 2건</small></h5><div class="h-adm-row h"><span>접수</span><span>고객</span><span>사업자 · 지역</span><span>업종 / 회사명</span><span>경로</span><span>상태</span></div>
        ${tg(leadRow(LEADS[0]), n, "새 상담신청", "h-adm-t", "div")}${LEADS.slice(1).map(leadRow).join("")}</main></div></div>
        ${phone(`<div class="h-tg-top"><i>T</i><div><b>${COMPANY} 접수 알림</b><small>텔레그램 채널</small></div></div><div class="h-tg-chat"><span class="h-tg-date">오늘</span><div class="h-tg-bubble"><b>신규 고객 접수</b><p>고객명: 김**<br>연락처: 010-****-1234<br>사업자 종류: 법인사업자<br>지역: 경남 창원시<br>업종 / 회사명: 제조업 / OO산업<br>직전년도 매출: 12억<br>접수경로: Meta 광고 · ${NAME}</p><small>방금</small></div></div>`)}`);

    /* ---------- concept slides ---------- */
    const rolesHtml = `<div class="g-roles">
      <div class="g-roles-col"><h5>직접 하는 일 <em>세 가지</em></h5>
        <div class="card on"><small>01 · 요청 문장</small><strong>교육 화면의 문장을 복사해 보내기</strong><p>계정 점검, 입력양식, 광고 만들기를 문장 하나씩으로 요청합니다. 입력양식의 질문과 문구도 문장에 들어 있습니다.</p><span class="g-say">복사 → Enter</span></div>
        <div class="card on"><small>02 · 광고 확인</small><strong>설정 확인표와 광고 관리자 확인 후 시작</strong><p>꺼진 상태로 만든 광고를 확인하고 직접 시작합니다.</p><span class="g-say">게재 시작</span></div>
        <div class="card on"><small>03 · 운영</small><strong>상태 확인 · 끄기 · 접수 확인</strong><p>상태와 끄기는 말로 요청합니다. 접수는 홈페이지 상담신청과 텔레그램으로 받습니다.</p><span class="g-say">광고 꺼 줘</span></div>
      </div>
      <div class="g-roles-col agent"><h5>Codex가 하는 일 <em>키트 규칙대로</em></h5>
        <div class="card"><small>점검</small><strong>광고 권한 · 결제 수단 · 약관 동의 상태</strong><p>광고 계정과 통화를 찾아 기록합니다.</p></div>
        <div class="card"><small>입력양식</small><strong>요청 문장대로 만들고 다시 읽어 대조</strong><p>질문, 정보 취급 설명, 완료 화면 문구를 글자 그대로 옮깁니다.</p></div>
        <div class="card"><small>광고 만들기</small><strong>캠페인 · 광고 세트 · 광고를 모두 꺼진 상태로</strong><p>Meta에서 다시 읽은 값을 표준과 한 줄씩 대조합니다.</p></div>
        <div class="card"><small>게재 · 끄기</small><strong>대조가 모두 같을 때만 켬</strong><p>답을 받기 전에는 켜지 않아서 광고비가 나가지 않습니다.</p></div>
      </div>
    </div>`;
    const STD = [
      [
        "이름",
        NAME,
        "캠페인 · 광고 세트 · 광고 · 입력양식을 모두 같은 이름으로 만듭니다.",
      ],
      [
        "목표 · 예산",
        "잠재 고객 · 하루 28,000원",
        "입찰 전략은 최고 볼륨, 예산은 캠페인에 둡니다.",
      ],
      [
        "타겟",
        "대한민국(제주 제외) · 한국어 · 25세 이상",
        "타겟 자동 확장은 끕니다.",
      ],
      [
        "노출 위치",
        "인스타그램만",
        "피드 · 탐색 · 릴스 · 프로필 피드. 페이스북과 Audience Network는 넣지 않습니다.",
      ],
      [
        "끄는 설정 두 가지",
        "노출 위치 밖 노출 · 다른 광고와 함께 게시",
        '광고 세트의 "노출 위치가 아닌 곳에도 노출"과 광고의 "다른 광고와 함께 게시"를 끕니다.',
      ],
      [
        "버튼 · 상태",
        "신청하기 · 꺼진 상태로 만들기",
        "게재 시작은 대표님이 답한 뒤에만 켭니다.",
      ],
    ];
    const stdHtml = `<div class="h-std">${STD.map(([k, v, d]) => `<div class="h-std-item"><small>${k}</small><b>${v}</b><span>${d}</span></div>`).join("")}</div>`;

    return [
      {
        cover: 1,
        ey: "CHAPTER 08H · META ADS",
        title: "Meta 광고<br><em>자동화</em>",
        desc: "상담 신청을 받는 잠재 고객 광고를 Codex에게 맡깁니다. 직접 하는 일은 요청 문장 보내기, 광고 확인과 게재 시작입니다. Meta 정책 동의는 폴라애드에서 미리 끝냈습니다.",
        route: ["광고 계정 점검", "입력양식", "광고 만들기", "게재 시작", "접수 확인"],
      },
      {
        concept: 1,
        ey: "ROLES",
        title: "직접 하는 일은<br><em>세 가지</em>",
        desc: "08G에서 연결한 시스템사용자 토큰을 그대로 씁니다. 광고 설정은 Codex가 키트의 표준대로 합니다. 대표님은 요청 문장을 보내고 확인만 합니다.",
        html: rolesHtml,
      },
      {
        concept: 1,
        ey: "STANDARD",
        title: "표준 광고<br><em>설정표</em>",
        desc: "Codex는 폴라애드가 운영하는 광고와 같은 표준으로 만듭니다. 만든 뒤 Meta에서 다시 읽어 이 표와 한 줄씩 대조합니다.",
        note: "<b>특정 지역만 공략하면 결과 하나당 단가가 3~4배 오를 수 있습니다.</b> 그래서 전국을 기본으로 합니다. 지역 광고가 필요하면 지역 이름을 말하면 됩니다. Codex가 그 지역 전체를 덮는 중심 좌표와 반경 10km 이상으로 잡습니다. 07장에서 직접 설정할 때와 달리, 자동화 표준은 노출 위치를 인스타그램으로 한정합니다.",
        html: stdHtml,
      },
      {
        ey: "FORM",
        title: "고객이 보는<br><em>입력양식</em>",
        desc: "광고에서 신청하기를 누른 고객에게는 이 세 화면이 차례로 나옵니다. 질문 네 개에 답하면 이름과 연락처는 Facebook·Instagram 정보로 자동 입력됩니다.",
        mode: "질문 → 개인정보 → 완료",
        tone: "keep",
        note: "이 질문과 문구는 다음 단계의 요청 문장에 모두 들어 있습니다. 바꾸고 싶으면 문장에서 고쳐 보내면 그대로 만들어집니다.",
        screen: (n) =>
          stage(
            `${formQuestions(n, "질문 화면")}${formPrivacy()}${formDone()}`,
          ),
      },
      {
        ey: "STEP 01",
        title: "광고 계정<br><em>점검 요청</em>",
        desc: "아래 문장을 Codex에게 보냅니다. Codex가 광고 권한, 광고 계정, 결제 수단, 잠재 고객 광고 약관 동의 상태를 확인합니다.",
        mode: "복사 → Enter",
        tone: "set",
        note: "08G에서 토큰 연결과 계정 확인을 마친 상태에서 진행합니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_CHECK, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "Meta 광고 계정을 점검해 줘. AGENTS.md 8장 순서대로 진행해 줘.",
              ),
              n,
              "점검 요청 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 02",
        title: "점검 결과<br><em>준비 완료</em>",
        desc: "광고 계정, 통화, 결제 수단, 약관 동의 상태가 한 줄로 나옵니다. 모두 준비됐으면 바로 입력양식으로 넘어갑니다.",
        mode: "준비 완료 확인",
        tone: "keep",
        note: "잠재 고객 광고 약관과 차별 금지 정책 동의는 폴라애드에서 미리 처리합니다. 결제 수단이 없다고 나오면 교육 05장대로 등록합니다. 약관 동의가 반영되지 않았다고 나오면 폴라애드에 알립니다.",
        links: [{ label: "05장 결제 설정 보기", href: "chapter-05-ad-payment.html#/1" }],
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] Meta 광고 계정을 점검해 줘. AGENTS.md 8장 순서대로 진행해 줘.",
            "",
            "[[dim|•]] node ads.mjs check",
            tline(
              `  [[g|[광고 준비 완료]]] 광고 계정 '${COMPANY}' · 통화 KRW · 결제 수단 Visa *1234 · 잠재 고객 약관 동의함`,
              n,
              "점검 결과",
            ),
            "",
            "  광고 계정, 결제 수단, 약관 동의가 모두 준비돼 있습니다.",
            "  입력양식 요청 문장을 보내 주시면 이어서 진행합니다.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 03",
        title: "입력폼<br><em>요청 문장</em>",
        desc: "아래 문장을 그대로 Codex에게 보냅니다.",
        mode: "복사 → Enter",
        tone: "set",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_FORM, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                `Meta 광고용 입력양식을 만들어 줘. 양식 이름: ${NAME} · 질문 1: 사업자 종류 (선택: 개인사업자 / 법인사업자) · 질문 2: 지역 … · 완료 화면 제목: 상담접수 완료 …`,
              ),
              n,
              "입력폼 요청 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 04",
        title: "입력양식<br><em>생성과 대조</em>",
        desc: "Codex가 문장대로 양식을 만든 뒤 Meta에서 다시 읽어 대조합니다. 일곱 줄이 모두 ✅이면 양식이 준비된 것입니다.",
        mode: "✅ 7줄 확인",
        tone: "keep",
        note: "개인정보처리방침은 회사 홈페이지 주소 뒤에 /privacy를 붙인 주소를 씁니다. 열리지 않으면 Codex가 실제 주소를 묻습니다. 양식은 만든 뒤 고칠 수 없어서, 문구를 바꾸려면 새 이름으로 다시 요청합니다.",
        screen: (n) =>
          termBase([
            ...head(),
            `[[b|›]] Meta 광고용 입력양식을 만들어 줘. 양식 이름: ${NAME} …`,
            "",
            "[[dim|•]] 요청 문장의 질문과 문구를 ad.json에 그대로 옮겼습니다.",
            `[[dim|•]] node ads.mjs form ${AD_DIR} --check`,
            `  [양식 점검] '${NAME}' · 요청 문장의 양식 · 개인정보처리방침 https://oo-consulting.co.kr/privacy`,
            `[[dim|•]] node ads.mjs form ${AD_DIR}`,
            tline(
              `  [[g|[양식 완료]]] '${NAME}' · 질문 6개 · 완료 화면 '상담접수 완료'`,
              n,
              "양식 대조 결과",
            ),
            `   ✅ 양식 이름: ${NAME}`,
            "   ✅ 양식 언어: ko_KR",
            "   ✅ 질문 순서: 사업자 종류 → 지역 (예: 서울 강남구) → 업종 / 회사명 → 직전년도 매출 → 이름 → 전화번호",
            "   ✅ 선택지: 사업자 종류: 개인사업자/법인사업자",
            "   ✅ 개인정보처리방침: https://oo-consulting.co.kr/privacy",
            "   ✅ 정보 취급 설명: 접수된 정보는 상담 후 폐기됩니다.",
            "   ✅ 완료 화면: 상담접수 완료 / 담당자 확인후 1일 이내 연락드릴 예정입니다.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 05",
        title: "광고 만들기<br><em>요청 문장</em>",
        desc: "아래 문장으로 광고를 요청합니다. 하루 예산, 광고 이미지, 지역을 바꿔서 보냅니다. 직접 만든 이미지는 파일 경로를 적습니다.",
        mode: "복사 → 예산·이미지·지역 → Enter",
        tone: "set",
        note: "지역 광고는 지역 이름을 적습니다(예: 창원시 전체). 전국 광고보다 단가가 3~4배 오를 수 있습니다.",
        copy: [{ label: "Codex에게 보낼 문장", code: PROMPT_AD, prompt: true }],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "같은 이름으로 Meta 잠재 고객 광고를 만들어 줘. 하루 예산: 28,000원 · 광고 이미지: 08F 블로그 글 표지 · 지역: 전국(제주 제외)",
              ),
              n,
              "광고 요청 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 06",
        title: "광고 이미지<br><em>1080×1350</em>",
        desc: "블로그 글 표지를 인스타그램 피드 광고 크기(4:5)로 다시 그립니다. 본문 첫 줄에 대상과 혜택을 쓰고, 마지막 줄은 신청하기 버튼을 안내합니다.",
        mode: "이미지 · 본문 확인",
        tone: "keep",
        note: '<b>"무조건", "100%", "승인 보장"처럼 결과를 약속하는 말은 쓰지 않습니다.</b> 광고 검토에서 거부됩니다. Codex는 이런 표현이 있으면 광고를 만들지 않습니다.',
        screen: (n) =>
          stage(
            `${tg(adPhone("big"), n, "광고 이미지 · 본문", "h-adt", "div")}<div class="h-adrules"><h5>광고 이미지와 본문</h5><p>📐 1080×1350(4:5) · 블로그 표지를 다시 그림</p><p>✅ 첫 줄: 누구에게 무엇을 주는지</p><p>👇 마지막 줄: 아래 신청하기를 눌러 …</p><p class="no">🚫 무조건 · 100% · 승인 보장 · 즉시 승인</p><p class="no">🚫 보는 사람의 신용·재정 상태를 짚는 문장</p></div>`,
          ),
      },
      {
        ey: "STEP 07",
        title: "설정 확인표<br><em>모두 ✅</em>",
        desc: "Codex가 광고를 꺼진 상태로 만들고, Meta에서 다시 읽은 값을 표로 보여 줍니다. 모든 줄이 ✅이고 상태가 일시 중지인지 확인합니다.",
        mode: "설정 확인표",
        tone: "keep",
        note: "광고가 꺼져 있는 동안에는 광고비가 나가지 않습니다. 표준과 다른 줄이 있으면 Codex가 게재를 시작하지 않습니다.",
        screen: (n) => adReview(n, "table"),
      },
      {
        ey: "STEP 08",
        title: "광고 관리자 ·<br><em>잠재 고객 센터 주소</em>",
        desc: "Codex가 광고 관리자 주소와 잠재 고객 센터 주소를 알려 줍니다. 주소를 클릭하면 바로 열립니다. 광고 관리자에서 캠페인 이름, 꺼짐 상태, 하루 예산을 확인합니다.",
        mode: "주소 클릭 → 확인",
        tone: "keep",
        note: "VS Code 터미널에서는 Ctrl 키를 누른 채 주소를 클릭합니다. 아래 버튼으로도 바로 열립니다. 광고 관리자에서 직접 켜지는 않습니다.",
        links: [
          { label: "광고 관리자 열기", href: "https://adsmanager.facebook.com/adsmanager/manage/campaigns" },
          { label: "잠재 고객 센터 열기", href: "https://business.facebook.com/latest/leads_center" },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 같은 이름으로 Meta 잠재 고객 광고를 만들어 줘. 하루 예산: 28,000원 …",
            "",
            `[[dim|•]] node ads.mjs create ${AD_DIR}`,
            `  [[g|[광고 준비 완료]]] 광고 '${NAME}'을 일시 중지 상태로 만들었습니다 · 하루 예산 28,000원`,
            "  설정 확인표 26줄 모두 ✅",
            "",
            "  광고를 꺼진 상태로 만들었습니다. 주소를 클릭하면 바로 열립니다.",
            tline(
              "  광고 관리자: [[bl|https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=…]]",
              n,
              "광고 관리자 주소",
            ),
            "  잠재 고객 센터: [[bl|https://business.facebook.com/latest/leads_center?asset_id=…]]",
            "  확인하신 뒤 광고를 시작하려면 '게재 시작'이라고 답해 주세요.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 09",
        title: "게재 시작<br><em>답하기</em>",
        desc: "확인이 끝나면 Codex에게 게재 시작이라고 답합니다. Codex가 한 번 더 대조한 뒤 광고, 광고 세트, 캠페인을 켭니다.",
        mode: "게재 시작 → Enter",
        tone: "set",
        note: "Meta 광고 검토가 끝나면 노출이 시작됩니다. 보통 몇 분에서 24시간 걸립니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 게재 시작",
            "",
            `[[dim|•]] node ads.mjs launch ${AD_DIR}`,
            "[[dim|•]] 다시 대조한 값이 모두 표준과 같음 → 광고 · 광고 세트 · 캠페인 켜기",
            tline(
              `  [[g|[게재 시작]]] '${NAME}' · 캠페인 게재 중 · 광고 세트 게재 중 · 광고 검토 중`,
              n,
              "게재 시작 결과",
            ),
            "",
            "  광고를 켰습니다. Meta 검토가 끝나면 노출이 시작됩니다(보통 몇 분에서 24시간).",
            "  상담 신청은 홈페이지 관리자 대시보드의 상담신청과 텔레그램으로 받습니다.",
            "  끄고 싶으면 '광고 꺼 줘'라고 말씀해 주세요.",
            "",
            inputLine("게재 시작"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 10",
        title: "상태 확인과<br><em>광고 끄기</em>",
        desc: "검토 결과가 궁금하면 광고 상태를 묻고, 멈추고 싶으면 광고를 꺼 달라고 말합니다. 노출·클릭 수는 광고 관리자에서 직접 확인합니다.",
        mode: "말로 요청",
        tone: "set",
        note: "게재 중인 광고는 고치지 않습니다. 문구나 이미지를 바꾸려면 끄고, 새 이름으로 새 광고를 요청합니다.",
        copy: [
          { label: "상태 확인", code: "광고 상태 알려 줘", prompt: true },
          { label: "광고 끄기", code: "광고 꺼 줘", prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 광고 상태 알려 줘",
            "",
            `[[dim|•]] node ads.mjs status ${AD_DIR}`,
            tline(
              `  [[g|[광고 상태]]] '${NAME}' · 캠페인 게재 중 · 광고 세트 게재 중 · 광고 게재 중`,
              n,
              "광고 상태",
            ),
            "",
            "[[b|›]] 광고 꺼 줘",
            "",
            `[[dim|•]] node ads.mjs pause ${AD_DIR}`,
            `  [[y|[광고 끔]]] '${NAME}' · 캠페인 꺼짐`,
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 11",
        title: "접수 확인<br><em>상담신청 · 텔레그램</em>",
        desc: "광고로 상담 신청이 들어오면 제작한 홈페이지의 관리자 대시보드 상담신청에 쌓입니다. 텔레그램 메시지로도 바로 받습니다.",
        mode: "상담신청 + 텔레그램",
        tone: "keep",
        note: "Meta 접수 자동 전달은 8주 지원 기간에 작동합니다(11장). Meta에서 직접 보려면 잠재 고객 센터를 엽니다.",
        links: [
          { label: "잠재 고객 센터 열기", href: "https://business.facebook.com/latest/leads_center" },
          { label: "11장 접수 알림 보기", href: "chapter-10-marketing-support.html#/6" },
        ],
        screen: (n) => leadsScreen(n),
      },
      {
        final: 1,
        ey: "CHAPTER 08H COMPLETE",
        title: "Meta 광고<br><em>자동화 완료</em>",
        desc: "광고 계정 점검부터 요청 문장으로 만든 입력양식, 꺼진 상태의 표준 광고, 대조 후 게재 시작과 접수 확인까지 마쳤습니다. 다음 장에서는 콘텐츠 게시를 실습합니다.",
        route: [
          "계정 점검",
          "입력양식",
          "광고 만들기",
          "게재 시작",
          "접수 확인",
        ],
      },
    ];
  };
})();
