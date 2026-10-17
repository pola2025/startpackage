// 08G: Meta SNS automation (Instagram + Facebook Page together, Threads 4 times a day). Part builder for ai-setup-course.js.
// The student pastes two tokens, confirms the accounts, approves posts and checks them in the apps; the kit does the rest.
// Card images come from ./assets/sns-sample/ (rendered by the kit's cards.mjs from the 08F sample post).
(() => {
  window.AI_SETUP_PARTS = window.AI_SETUP_PARTS || {};
  window.AI_SETUP_PARTS.G = (h) => {
    const { tg, chrome, termBase, head, inputLine, footerTyping, tline } = h;

    /* ---------- sample data ---------- */
    const CARD = (i, cls = "") =>
      `<img class="${cls}" src="./assets/sns-sample/card-${i}.jpg" alt="">`;
    const COMPANY = "OO경영컨설팅";
    const HANDLE = "oo.consulting";
    const SNS_DIR = "C:\\bas_mkt\\sns\\20261017-changwon-sme-fund";
    const CAPTION = [
      "📌 창원시 중소기업 육성자금",
      "이차보전 연 2.5% 지원",
      "",
      "💰 경영안정자금 2,100억 원",
      "이자 일부를 창원시가",
      "대신 부담하는 방식입니다.",
      "",
      "📅 거치기간 2년은 연 2.5%,",
      "상환기간 1년은 연 1.5%를",
      "보전해 줍니다.",
      "",
      "✅ 접수는 자금이 소진될",
      "때까지 받습니다.",
      "",
      "📝 신청 방법과 준비 서류는",
      "블로그에 정리했습니다.",
      "",
      "#정책자금 #창원시 #중소기업육성자금 #이차보전",
    ];
    const THREAD = [
      "정책자금은 공고가 나오면 바로 신청할 수 있는 것처럼 보이지만, 실제로는 서류 준비에 2~3주가 걸립니다.",
      "특히 부가가치세 과세표준증명원과 납세증명서는 발급 기준일이 공고마다 다릅니다.",
    ];
    const THREAD_ADD =
      "신청 직전에 서류를 떼면 기준일이 맞지 않아 다시 발급받는 경우가 많습니다. 공고문의 ‘제출 서류’ 항목에서 발급 기준일부터 확인하시면 시간을 줄일 수 있습니다.";

    const PROMPT_TOKEN = [
      "Meta SNS 자동화를 연결해 줘.",
      "시스템사용자 토큰: [메일의 값 붙여 넣기]",
      "쓰레드 토큰: [메일의 값 붙여 넣기]",
      "AGENTS.md 7장 순서대로 진행해 줘.",
    ].join("\n");
    const PROMPT_CARDS = [
      "08F에서 만든 블로그 글로 인스타그램 카드뉴스를 만들어 줘.",
      "글폴더: C:\\bas_mkt\\posts\\20261017-changwon-sme-fund",
      "인스타그램과 페이스북 페이지에 함께 올릴 거야.",
    ].join("\n");
    const PROMPT_OWN = [
      "이 파일로 인스타그램과 페이지 게시물을 준비해 줘.",
      "파일: [이미지·영상 파일 또는 폴더 경로]",
      "전할 내용: [게시물에 담을 내용 한두 줄]",
    ].join("\n");
    const PROMPT_CONCEPT = [
      "쓰레드 컨셉을 정할게.",
      "독자: 정책자금을 알아보는 중소기업·소상공인 대표",
      "전할 정보: 신청 시기, 준비 서류, 자주 틀리는 조건",
      "말투: 존댓말, 정보 전달형",
      "AGENTS.md 7.2 순서대로 진행해 줘.",
    ].join("\n");
    const TODAY = "오늘 올릴 쓰레드 글 4편 준비해 줘";

    /* ---------- Gmail ---------- */
    const GFAV = '<span class="g-gfav">M</span>';
    const TOKEN_BOX = (label, value) =>
      `<div class="g-tok"><small>${label}</small><code>${value}</code></div>`;
    const mail = (n) =>
      chrome(
        "받은편지함 - Gmail",
        GFAV,
        'mail.google.com<span class="path">/mail/u/0/#inbox</span>',
        `<div class="g-mail"><div class="g-mside"><div class="g-compose">✎ 편지쓰기</div><span class="on">받은편지함</span><span>별표편지함</span><span>보낸편지함</span></div>
        <div class="g-mbody"><h4>[폴라애드] Meta 자동화 연결 토큰 안내</h4>
        <div class="g-from"><i>폴</i><div><b>폴라애드</b><span>나에게</span></div></div>
        <p>대표님, Meta 자동화 실습에 쓰는 토큰 두 개를 보내 드립니다. 08G 화면 순서대로 Codex에게 그대로 붙여 넣으시면 됩니다.</p>
        ${tg(`<div class="g-toks">${TOKEN_BOX("시스템사용자 토큰", "EAAB••••••••••••••••••••••••••••••••ZD")}${TOKEN_BOX("쓰레드 토큰", "THAA••••••••••••••••••••••••••••••••QZ")}</div>`, n, "토큰 두 개 복사", "", "div")}
        <p class="g-dim">이 값은 대표님 계정에서만 쓰입니다. 다른 사람에게 전달하지 마세요.</p></div></div>`,
      );

    /* ---------- review.html (SNS 게시 전 검수) ---------- */
    const FILE_FAV = '<span class="g-filefav">▤</span>';
    const review = (n, target) => {
      const cap = `<div class="g-rcap">${CAPTION.map((l) => (l ? l : "&nbsp;")).join("<br>")}</div>`;
      const checks = `<div class="g-rbox"><h6>게시 전 체크리스트</h6>${["이미지 속 글자가 잘리거나 깨지지 않았다", "캡션이 모바일 폭에서 문단으로 읽힌다", "사업명·금액·기간이 원문과 같다", "회사명·전화번호가 맞다"].map((t) => `<label><i></i>${t}</label>`).join("")}<p>인스타그램과 페이스북 페이지에 같은 내용이 함께 올라갑니다. 이대로 올리려면 Codex에게 <b>게시</b>라고 답합니다.</p></div>`;
      return chrome(
        "SNS 게시 전 검수",
        FILE_FAV,
        `<span class="path">파일 |</span> C:/bas_mkt/sns/20261017-changwon-sme-fund/review.html`,
        `<div class="g-review"><div class="g-rphone${target === "caption" ? " scrolled" : ""}"><div class="g-rhead">미리보기 · carousel · 6개</div><div class="g-rscroll"><div class="g-rimg">${CARD(1)}<span>1/6</span></div>${target === "caption" ? tg(cap, n, "모바일 폭 캡션", "g-rcap-t", "div") : cap}</div></div>
        <div class="g-rside"><div class="g-rbox"><h6>자동 검사</h6><p class="ok">✓ 크기 6장 모두 1080×1440</p><p class="ok">✓ 캡션: 한 줄 20자 안쪽 · 문단 5개 · 이모지 5개 · 해시태그 4개</p></div>${target === "checks" ? tg(checks, n, "게시 전 체크리스트", "g-rbox-t", "div") : checks}</div></div>`,
      );
    };

    /* ---------- card set ---------- */
    const cardSet = (n) =>
      `<div class="screen light"><div class="g-cards"><div class="g-cards-h"><b>${SNS_DIR}\\cards</b><span>6장 · 모두 1080×1440 (3:4)</span></div><div class="g-cards-grid">${[
        1, 2, 3, 4, 5, 6,
      ]
        .map((i) =>
          i === 1
            ? tg(
                `<figure>${CARD(1)}<figcaption>01.png · 표지 · 대형 타이포</figcaption></figure>`,
                n,
                "첫 장 · 대형 타이포",
                "g-card-t",
                "div",
              )
            : `<figure>${CARD(i)}<figcaption>${String(i).padStart(2, "0")}.png · ${["", "", "지원 규모", "지원 방식", "이차보전율", "접수 기간"][i] || "회사 카드"}</figcaption></figure>`,
        )
        .join("")}</div></div></div>`;

    /* ---------- phones: Instagram · Facebook Page · Threads ---------- */
    const phone = (inner, cls = "") =>
      `<div class="g-phone ${cls}"><div class="g-notch"></div>${inner}</div>`;
    const igPost = (n) =>
      phone(
        `<div class="g-ig-top"><b>Instagram</b><span>♡ ✈</span></div><div class="g-ig-user"><i>OO</i><b>${HANDLE}</b><span>···</span></div>${tg(`<div class="g-ig-img">${CARD(1)}<span>1/6</span></div>`, n, "올라간 인스타 게시물", "g-ig-t", "div")}<div class="g-ig-act">♡ 💬 ✈<span>🔖</span></div><div class="g-ig-dots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div><div class="g-ig-cap"><b>${HANDLE}</b> 📌 창원시 중소기업 육성자금<br>이차보전 연 2.5% 지원 <span>... 더 보기</span></div><div class="g-ig-time">방금 전</div>`,
      );
    const fbPost = () =>
      phone(
        `<div class="g-fb-top"><b>facebook</b></div><div class="g-ig-user"><i class="fb">OO</i><b>${COMPANY}</b><span>방금 전 · 🌐</span></div><div class="g-fb-cap">📌 창원시 중소기업 육성자금<br>이차보전 연 2.5% 지원</div><div class="g-fb-grid">${CARD(1)}${CARD(2)}${CARD(3)}<span class="more">${CARD(4)}<b>+2</b></span></div><div class="g-fb-act"><span>👍 좋아요</span><span>💬 댓글</span><span>↗ 공유</span></div>`,
        "small",
      );
    const thPost = (n, target) =>
      phone(
        `<div class="g-th-top"><b>@</b></div><div class="g-th-post">${target ? tg(`<div class="g-th-first"><div class="g-th-u"><i>OO</i><b>${HANDLE}</b><span class="tag">› 정책자금</span><span class="time">방금</span></div><p>${THREAD.join("<br><br>")}</p><div class="g-th-act">♡ 💬 ↻ ✈</div></div>`, n, target, "g-th-t", "div") : `<div class="g-th-first"><div class="g-th-u"><i>OO</i><b>${HANDLE}</b><span class="tag">› 정책자금</span><span class="time">방금</span></div><p>${THREAD.join("<br><br>")}</p><div class="g-th-act">♡ 💬 ↻ ✈</div></div>`}<div class="g-th-reply"><div class="g-th-u"><i>OO</i><b>${HANDLE}</b><span class="time">방금</span></div><p>${THREAD_ADD}</p></div></div>`,
      );
    const stage = (inner) =>
      `<div class="screen light"><div class="g-stage">${inner}</div></div>`;

    /* ---------- concept slides ---------- */
    const rolesHtml = `<div class="g-roles">
      <div class="g-roles-col"><h5>직접 하는 일 <em>에이전트 요청 내용 확인</em></h5>
        <div class="card on"><small>01 · 연결</small><strong>메일의 토큰 두 개를 Codex에게</strong><p>시스템사용자 토큰과 쓰레드 토큰을 붙여 넣고, 연결된 계정이 본인 것인지 확인합니다.</p><span class="g-say">확인</span></div>
        <div class="card on"><small>02 · 인스타그램 + 페이지</small><strong>검수 화면을 보고 게시 답하기</strong><p>카드뉴스와 캡션을 체크리스트로 확인하고, 올라간 뒤 휴대폰 앱에서 직접 확인합니다.</p><span class="g-say">게시</span></div>
        <div class="card on"><small>03 · 쓰레드</small><strong>컨셉 말하고 샘플 확인하기</strong><p>누구에게 어떤 정보를 어떤 말투로 전할지 말하면, 오늘 올릴 4편을 보고 확인합니다.</p><span class="g-say">확인</span></div>
      </div>
      <div class="g-roles-col agent"><h5>Codex가 하는 일 <em>키트 규칙대로</em></h5>
        <div class="card"><small>연결 검증</small><strong>권한 · 페이지 · 인스타 · 쓰레드 계정 조회</strong><p>토큰을 .env에 저장하고 깃 업로드 대상에서 뺍니다.</p></div>
        <div class="card"><small>제작 · 점검</small><strong>카드뉴스 1080×1440 · 모바일 폭 캡션</strong><p>직접 만든 이미지·영상은 크기부터 점검합니다.</p></div>
        <div class="card"><small>게시 · 확인</small><strong>인스타와 페이지에 동시 게시</strong><p>게시 뒤 두 채널을 다시 읽어 주소를 확인합니다.</p></div>
        <div class="card"><small>쓰레드</small><strong>그날 4편 게시 · 토큰 자동 갱신</strong><p>PC가 켜져 있는 동안 3시간 30분 간격으로 한 편씩 올립니다.</p></div>
      </div>
    </div>`;
    const specHtml = `<div class="g-spec">
      <div class="g-spec-item"><div class="g-spec-vis ig34">${CARD(1)}</div><div><b>인스타 카드뉴스 <em>1080×1440</em></b><span>프로필 그리드가 3:4로 바뀌었습니다. 이 크기면 그리드에서 잘리지 않습니다. 첫 장은 대형 타이포로 씁니다.</span></div></div>
      <div class="g-spec-item"><div class="g-spec-vis r916"><i>9:16</i></div><div><b>릴스 영상 <em>1080×1920</em></b><span>세로 영상, 3초 이상 90초 안쪽을 권장합니다. 위아래 버튼 영역에는 글자를 두지 않습니다.</span></div></div>
      <div class="g-spec-item"><div class="g-spec-vis cap">📌 창원시 중소기업<br>육성자금 지원<br><br>💰 경영안정자금<br>2,100억 원</div><div><b>캡션 <em>모바일 가로폭</em></b><span>한 줄 14~20자, 의미 단위 줄바꿈, 문장 덩어리가 아닌 문단, 이모지 적극 활용, 해시태그는 마지막 한 줄</span></div></div>
      <div class="g-spec-item"><div class="g-spec-vis th">08:00<br>11:30<br>15:00<br>18:30</div><div><b>쓰레드 <em>그날 4편</em></b><span>그날 올릴 4편을 그날 설정하면 3시간 30분 간격으로 올라갑니다. 정보 전달형, 첫 글에는 이미지·링크를 넣지 않습니다.</span></div></div>
    </div>`;

    return [
      {
        cover: 1,
        ey: "CHAPTER 08G · META SNS",
        title: "Meta SNS<br><em>자동화</em>",
        desc: "인스타그램, 페이스북 페이지, 쓰레드에 콘텐츠를 올리는 일을 Codex에게 맡깁니다. 직접 하는 일은 토큰 전달, 계정 확인, 게시 승인, 앱에서 확인입니다.",
        route: [
          "토큰 전달",
          "계정 확인",
          "인스타 + 페이지",
          "쓰레드",
          "앱에서 확인",
        ],
      },
      {
        concept: 1,
        ey: "ROLES",
        title: "에이전트<br><em>요청 내용만 확인</em>",
        desc: "Meta 연결(앱, 시스템 사용자, 쓰레드 토큰)은 폴라애드에서 미리 끝냈습니다. 메일로 받은 토큰 두 개만 Codex에게 주면 됩니다.",
        html: rolesHtml,
      },
      {
        concept: 1,
        ey: "CHANNEL RULES",
        title: "채널별<br><em>규격과 규칙</em>",
        desc: "규격과 글쓰기 규칙은 키트의 규칙 문서에 들어 있어서 Codex가 그대로 지킵니다. 무엇을 기준으로 만드는지만 알아 두면 됩니다.",
        note: "<b>인스타그램·페이스북·쓰레드는 PC나 노트북이 켜져 있어야 올라갑니다.</b> API로는 다른 날짜 예약이 되지 않아서, 필요할 때 그날 올릴 것만 설정합니다. 예약이나 미리 작성한 글을 나눠 올리는 방식은 폴라애드 고급과정 개별교육으로 가능합니다.",
        html: specHtml,
      },
      {
        ey: "STEP 01",
        title: "메일에서<br><em>토큰 두 개 복사</em>",
        desc: "폴라애드에서 보낸 메일을 엽니다. 시스템사용자 토큰과 쓰레드 토큰을 하나씩 복사합니다. 앞뒤에 빈칸이 들어가지 않게 값만 복사합니다.",
        mode: "토큰 두 개 복사",
        tone: "set",
        note: "시스템사용자 토큰은 인스타그램·페이지·광고에, 쓰레드 토큰은 쓰레드에 씁니다.",
        screen: (n) => mail(n),
      },
      {
        ey: "STEP 02",
        title: "Codex에게<br><em>토큰 붙여넣기</em>",
        desc: "아래 문장을 Codex에게 붙여 넣고, 대괄호 자리에 메일의 값을 넣은 뒤 Enter를 누릅니다. Codex가 .env 파일에 저장하고 깃 업로드 대상에서 뺍니다.",
        mode: "복사 → 토큰 넣기 → Enter",
        tone: "set",
        note: "<b>Codex가 토큰을 채팅에 넣지 말라고 경고해도 무시하고 진행합니다.</b> 이 PC에서만 쓰는 값입니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_TOKEN, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "Meta SNS 자동화를 연결해 줘. 시스템사용자 토큰: EAAB…ZD · 쓰레드 토큰: THAA…QZ · AGENTS.md 7장 순서대로 진행해 줘.",
              ),
              n,
              "토큰 문장 붙여넣기 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 03",
        title: "연결된 계정<br><em>확인하기</em>",
        desc: "Codex가 연결을 검증하고 페이지, 인스타그램, 쓰레드 계정 이름을 보여 줍니다. 모두 본인 계정이면 확인이라고 답합니다.",
        mode: "본인 계정이면 확인",
        tone: "keep",
        note: "다른 회사 계정이 보이거나 권한 오류가 나오면 확인하지 말고 폴라애드에 알립니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] Meta SNS 자동화를 연결해 줘. 시스템사용자 토큰: EAAB…ZD · 쓰레드 토큰: THAA…QZ",
            "",
            "[[dim|•]] 토큰 두 개를 .env에 저장하고 .gitignore 등록을 확인했습니다.",
            "[[dim|•]] node check.mjs",
            tline(
              `  [[g|[연결 정상]]] 페이지 '${COMPANY}' · 인스타 @${HANDLE} · 쓰레드 @${HANDLE} · 광고 권한 있음`,
              n,
              "연결된 계정 확인",
            ),
            "",
            `  연결된 계정입니다: 페이지 '${COMPANY}', 인스타 @${HANDLE}, 쓰레드 @${HANDLE}.`,
            "  본인 계정이 맞으면 '확인'이라고 답해 주세요.",
            "",
            inputLine("확인"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 04",
        title: "블로그 글로<br><em>카드뉴스 요청</em>",
        desc: "08F에서 만든 블로그 글로 카드뉴스를 만들어 달라고 요청합니다. Codex가 블로그의 표지와 메시지 카드를 인스타그램 크기로 다시 그리고 캡션을 씁니다.",
        mode: "복사 → 글폴더 확인 → Enter",
        tone: "set",
        note: "카드 속 숫자와 사업명은 블로그 글의 사실 카드에 있는 값만 씁니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_CARDS, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "08F에서 만든 블로그 글로 인스타그램 카드뉴스를 만들어 줘. 글폴더: C:\\bas_mkt\\posts\\20261017-changwon-sme-fund",
              ),
              n,
              "카드뉴스 요청 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 05",
        title: "카드뉴스<br><em>1080×1440</em>",
        desc: "표지, 메시지 카드 4장, 회사 카드까지 6장이 만들어집니다. 모두 1080×1440(3:4)이라 바뀐 프로필 그리드에서 잘리지 않습니다.",
        mode: "첫 장 · 대형 타이포",
        tone: "keep",
        note: "<b>첫 장을 대형 타이포로 만드는 이유:</b> 검색 결과와 프로필 그리드에는 첫 장만 보입니다. 첫 장만 봐도 무슨 내용인지 알 수 있어야 사람들이 게시물을 엽니다.",
        screen: (n) => cardSet(n),
      },
      {
        ey: "STEP 06",
        title: "검수 화면<br><em>모바일 폭 캡션</em>",
        desc: "Codex가 보낸 검수 화면 주소를 엽니다. 캡션이 한 줄 14~20자로 끊기고, 문단마다 이모지가 있고, 문장 덩어리가 아닌 문단으로 읽히는지 확인합니다.",
        mode: "캡션 확인",
        tone: "keep",
        note: "인스타그램은 캡션을 좁은 모바일 폭으로 보여 줍니다. 그래서 줄바꿈을 미리 넣어 올립니다. 해시태그는 마지막 한 줄에 모읍니다.",
        screen: (n) => review(n, "caption"),
      },
      {
        ey: "STEP 07",
        title: "체크리스트<br><em>확인 후 게시</em>",
        desc: "체크리스트 4개를 확인하고, 고칠 곳이 없으면 Codex에게 게시라고 답합니다. 고칠 곳은 어느 카드나 문단인지 짚어서 말로 요청합니다.",
        mode: "게시 → Enter",
        tone: "set",
        note: "인스타그램과 페이스북 페이지에 같은 내용이 동시에 올라갑니다. 인스타그램 API에는 예약 기능이 없어서 답하는 즉시 올라갑니다.",
        screen: (n) => review(n, "checks"),
      },
      {
        ey: "STEP 08",
        title: "게시 결과<br><em>주소 받기</em>",
        desc: "Codex가 인스타그램과 페이지에 올린 뒤 두 채널을 다시 읽어 확인하고, 게시물 주소를 알려 줍니다.",
        mode: "인스타 · 페이지 주소",
        tone: "keep",
        note: "결과가 9나 12로 끝나면 Codex가 다시 올리지 않고 확인을 요청합니다. 같은 게시물을 다시 올려 달라고 하지 않습니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 게시",
            "",
            "[[dim|•]] 페이지에 이미지 6장을 비공개로 올리고, 그 이미지 주소로 인스타 게시물을 만들었습니다.",
            "[[dim|•]] 인스타 게시 → 페이지 게시 → 두 채널 다시 읽기 완료",
            "",
            tline(
              "  [[g|[게시 완료]]] 인스타: https://www.instagram.com/p/DfK2q8xSa1T/",
              n,
              "게시물 주소",
            ),
            "                페이지: https://www.facebook.com/oo.consulting/posts/1029384756",
            "",
            "  휴대폰 인스타그램 앱과 페이스북 페이지에서 보이는지 확인해 주세요.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 09",
        title: "휴대폰에서<br><em>실제로 확인</em>",
        desc: "휴대폰 인스타그램 앱과 페이스북 페이지에서 게시물이 보이는지, 카드 6장과 캡션이 그대로인지 직접 확인합니다.",
        mode: "인스타 · 페이지 확인",
        tone: "keep",
        note: "보이지 않거나 글자가 잘렸으면 게시물 주소와 함께 Codex에게 알립니다.",
        screen: (n) => stage(`${igPost(n)}${fbPost()}`),
      },
      {
        ey: "STEP 10",
        title: "직접 만든<br><em>이미지·영상 올리기</em>",
        desc: "직접 만든 사진, 카드뉴스, 영상도 올릴 수 있습니다. 파일 위치와 전할 내용을 말하면 Codex가 크기를 점검하고 캡션을 써서 검수 화면을 보냅니다.",
        mode: "복사 → 파일 위치 → Enter",
        tone: "set",
        note: "이미지 여러 장은 캐러셀, 세로 영상은 릴스로 올라갑니다. 캡션을 직접 써서 주면 내용은 그대로 두고 줄바꿈과 이모지만 다듬습니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_OWN, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "이 파일로 인스타그램과 페이지 게시물을 준비해 줘. 파일: C:\\Users\\대표\\Desktop\\10월 세미나 · 전할 내용: 세미나 현장 소식",
              ),
              n,
              "파일 위치 요청 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 11",
        title: "크기 점검<br><em>결과 보기</em>",
        desc: "Codex가 파일 크기부터 점검합니다. ❌가 나온 파일은 올리지 않고, 어떤 크기로 다시 만들어야 하는지 알려 줍니다.",
        mode: "❌ 파일 다시 만들기",
        tone: "keep",
        note: "카드뉴스·사진은 1080×1440, 릴스 영상은 1080×1920입니다. Codex는 비율을 억지로 늘리거나 자르지 않습니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 이 파일로 인스타그램과 페이지 게시물을 준비해 줘. 파일: C:\\Users\\대표\\Desktop\\10월 세미나",
            "",
            "[[dim|•]] node size.mjs C:\\bas_mkt\\sns\\20261020-october-seminar",
            "  ✅ 01.jpg: 1080×1440",
            "  ✅ 02.jpg: 1080×1440",
            "  ⚠ 03.jpg: 1080×1350 · 카드뉴스 기준은 1080×1440(3:4)입니다. 프로필 그리드에서 잘릴 수 있습니다.",
            tline(
              "  ❌ seminar.mp4: 1920×1080 · 릴스는 9:16 1080×1920이어야 합니다.",
              n,
              "다시 만들 파일",
            ),
            "  4개 중 다시 만들어야 하는 파일 1개",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 12",
        title: "쓰레드 컨셉<br><em>말하기</em>",
        desc: "쓰레드는 대표님이 정한 컨셉대로 올라갑니다. 누구에게, 어떤 정보를, 어떤 말투로 전할지 아래 문장의 빈칸을 바꿔 보냅니다.",
        mode: "복사 → 컨셉 고치기 → Enter",
        tone: "set",
        note: "정해 두지 않은 부분은 키트의 기본값(존댓말, 정보 전달형, 상담 권유·회사명·링크 없음)을 따릅니다.",
        copy: [
          { label: "Codex에게 보낼 문장", code: PROMPT_CONCEPT, prompt: true },
        ],
        screen: (n) =>
          termBase([
            ...head(),
            "",
            tline(
              inputLine(
                "쓰레드 컨셉을 정할게. 독자: 정책자금을 알아보는 중소기업·소상공인 대표 · 전할 정보: 신청 시기, 준비 서류 · 말투: 존댓말",
              ),
              n,
              "컨셉 문장 → Enter",
            ),
            ...footerTyping(),
          ]),
      },
      {
        ey: "STEP 13",
        title: "오늘 올릴 4편<br><em>확인하기</em>",
        desc: "Codex가 컨셉대로 쓴 오늘 올릴 4편을 보여 줍니다. 한 편은 첫 글과 추가 글로 나뉩니다. 이대로 올려도 되면 확인이라고 답합니다.",
        mode: "샘플 확인 → 확인",
        tone: "keep",
        note: "말투나 주제를 바꾸고 싶으면 어느 편을 어떻게 바꿀지 말로 요청합니다.",
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 쓰레드 컨셉을 정할게. 독자: 정책자금을 알아보는 중소기업·소상공인 대표 …",
            "",
            "[[dim|•]] 컨셉을 threads-concept.md에 정리했습니다. 오늘 올릴 4편 중 1편입니다.",
            "",
            tline(
              "  [[b|1편 · 첫 글]] 정책자금은 공고가 나오면 바로 신청할 수 있는 것처럼 보이지만,",
              n,
              "샘플 1편",
            ),
            "  실제로는 서류 준비에 2~3주가 걸립니다. …",
            "  [[b|1편 · 추가 글]] 신청 직전에 서류를 떼면 기준일이 맞지 않아 다시 발급받는 경우가 …",
            "  [[dim|주제 태그: 정책자금 · 링크 없음 · 존댓말]]",
            "",
            "  이대로 올려도 되면 '확인'이라고 답해 주세요.",
            "",
            inputLine("확인"),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 14",
        title: "첫 글에는<br><em>이미지·링크 없이</em>",
        desc: "쓰레드 첫 글에 이미지나 링크를 넣으면 검색과 노출에 불리합니다. 그래서 첫 글은 정보만 담고, 추가 글은 첫 글에 답글로 붙습니다.",
        mode: "정보 전달형",
        tone: "keep",
        note: "<b>자동 답글이나 자동 좋아요처럼 티 나는 활동은 하지 않습니다.</b> 게시 횟수는 늘릴 수 있지만, 정보 전달형 글이 가장 무난합니다.",
        screen: (n) => stage(thPost(n, "첫 글 · 이미지·링크 없음")),
      },
      {
        ey: "STEP 15",
        title: "오늘 4편<br><em>올릴 시각 설정</em>",
        desc: "확인을 받으면 Codex가 오늘 올릴 4편을 넣고, PC가 켜져 있는 동안 08:00·11:30·15:00·18:30에 한 편씩 올라가게 설정합니다.",
        mode: "08:00 · 11:30 · 15:00 · 18:30",
        tone: "keep",
        note: "<b>PC나 노트북이 꺼져 있으면 올라가지 않습니다.</b> 그날 못 올린 글은 다음 날로 넘어가지 않습니다. 쓰레드를 올리는 날마다 아래 문장으로 그날 글을 요청합니다.",
        copy: [{ label: "그날 글 요청", code: TODAY, prompt: true }],
        screen: (n) =>
          termBase([
            ...head(),
            "[[b|›]] 확인",
            "",
            "[[dim|•]] node threads.mjs add C:\\bas_mkt\\sns\\threads-20261017.json",
            "  오늘 올릴 글 4개를 넣었습니다 · 대기 4개. PC가 켜져 있는 동안 정해진 시각에 한 개씩 올라갑니다.",
            "[[dim|•]] 시각별 실행 작업 4개를 확인했습니다.",
            tline(
              "  [[g|오늘 08:00 · 11:30 · 15:00 · 18:30]] · 다음 게시 11:30",
              n,
              "오늘 올릴 시각",
            ),
            "",
            "  오늘 올릴 4편을 넣었습니다. 다음 게시는 11:30입니다.",
            "  오늘 4편이 다 올라갈 때까지 PC를 켜 두시고, 올라간 뒤 쓰레드 앱에서 확인해 주세요.",
            "",
            inputLine(),
            ...footerTyping().slice(0, 2),
          ]),
      },
      {
        ey: "STEP 16",
        title: "쓰레드 앱에서<br><em>올라간 글 확인</em>",
        desc: "게시 시각이 지나면 쓰레드 앱에서 글이 올라왔는지, 추가 글이 첫 글 아래에 붙었는지 확인합니다.",
        mode: "쓰레드 앱 확인",
        tone: "keep",
        note: "쓰레드 토큰은 60일마다 만료되지만 Codex가 자동으로 갱신합니다. 직접 할 일은 없습니다.",
        screen: (n) => stage(thPost(n, "올라간 쓰레드 글")),
      },
      {
        final: 1,
        ey: "CHAPTER 08G COMPLETE",
        title: "Meta SNS<br><em>자동화 완료</em>",
        desc: "토큰 연결부터 인스타그램·페이지 동시 게시, 쓰레드 그날 4편 게시까지 마쳤습니다. 다음은 같은 토큰으로 Meta 광고를 설정합니다.",
        route: [
          "토큰 연결",
          "계정 확인",
          "인스타 + 페이지",
          "쓰레드",
          "다음 챕터",
        ],
      },
    ];
  };
})();
