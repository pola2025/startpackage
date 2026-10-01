function createComparisonView(root, CONTENT, helpers, api) {
  const escape = helpers.escape;
  const funds = {
    operation: {
      mode: "정책자금 융자 또는 보증 연계 가능성을 중심으로 검토합니다. 대출로 실행되면 약정에 따라 상환합니다.",
      purpose: "원재료·부자재, 인건비, 외주비, 물류비처럼 매출과 납품이 이어질 때까지 필요한 운영 비용입니다.",
      burden: "융자는 원금과 이자를 상환합니다. 보증이 연계되면 보증 조건과 비용도 확인하며, 세부 조건은 해당 연도 공고와 심사 결과를 따릅니다.",
      evidence: "최근 매출과 수주·납품 흐름, 원가와 고정비, 항목별 사용 금액과 필요한 시점을 근거로 정리합니다.",
      flow: "운영 소요 정리 → 공식 융자계획과 대상 확인 → 신청·심사 및 금융 절차 → 승인된 용도에 맞춘 집행 순서로 살펴봅니다.",
      aftercare: "허용된 자금 용도를 지키고 요청되는 사용 근거를 보관하며, 대출 약정에 따른 상환 일정을 관리합니다."
    },
    facility: {
      mode: "설비·사업장·시스템 투자에 맞춘 정책자금 융자를 중심으로 검토합니다. 자금에 따라 직접·대리대출이나 보증 절차가 연결될 수 있습니다.",
      purpose: "생산설비, 시험·검사장비, 정보화 시스템, 물류시설, 사업장 개선처럼 사업 기반을 만드는 투자 비용입니다.",
      burden: "융자는 약정에 따른 상환이 필요합니다. 자기자금과 추가 조달 여력, 담보·보증 조건은 자금과 심사 결과에 따라 달라집니다.",
      evidence: "도입 대상의 사양·수량·견적·공급처, 설치 장소와 일정, 기존 방식의 한계와 기대 효과를 함께 준비합니다.",
      flow: "투자계획 정리 → 공고상 인정 범위와 선집행 기준 확인 → 신청·심사 및 금융 절차 → 계약·설치·집행 확인 순서로 진행될 수 있습니다.",
      aftercare: "승인된 투자 대상과 집행 조건을 지키고 설치·검수 근거를 보관합니다. 대출 상환과 사후 점검 요구도 함께 관리합니다."
    },
    support: {
      mode: "보조금·바우처·융자·보증·교육 등 공고마다 방식이 다릅니다. 정부지원사업이라는 이름만으로 무상지원으로 판단할 수 없습니다.",
      purpose: "사업화, 기술개발, 실증, 디자인·마케팅, 수출·판로, 지역특화처럼 공고가 정한 과제를 수행하는 비용입니다.",
      burden: "기업분담금이나 자부담, 현금·현물 부담, 정산 의무가 있을 수 있습니다. 융자 방식이면 상환도 필요하며 공고별 조건이 우선합니다.",
      evidence: "해결할 문제와 목표, 산출물, 수행 인력·일정·예산, 신청 자격과 기존 지원사업 수혜·중복 여부를 사실에 맞게 정리합니다.",
      flow: "공고 확인 → 신청서·과제계획 제출 → 평가·선정 → 협약 → 수행 → 결과보고·정산 순서가 일반적이며 사업별 절차가 우선합니다.",
      aftercare: "협약에 정한 비용 항목과 기간을 지키고 증빙·성과 자료를 남기며, 결과보고와 정산 요구를 확인합니다."
    }
  };
  const criteria = [
    ["지원 방식", "mode"],
    ["주된 사용 목적", "purpose"],
    ["상환·자부담", "burden"],
    ["자료 근거", "evidence"],
    ["신청·집행의 흐름", "flow"],
    ["사후관리", "aftercare"]
  ];
  const cases = [
    {
      pair: ["operation", "facility"],
      title: "운영 소요와 설비 투자가 함께 생긴 경우",
      situation: "수주가 늘어 원재료와 외주비가 필요하고, 동시에 생산 장비 교체도 검토하는 상황입니다.",
      compare: "반복적으로 소진되는 비용은 운전자금, 장기간 사용하는 장비 투자는 시설자금 관점으로 나눠 봅니다. 한 금액으로 합치기보다 용도·집행 시점·상환 계획을 각각 정리해야 합니다.",
      prepare: "최근 수주와 비용 흐름, 장비 견적·사양, 설치 일정, 두 자금의 상환 재원을 따로 준비합니다.",
      cta: "운전자금과 시설자금 비교"
    },
    {
      pair: ["operation", "support"],
      title: "운영비가 필요하면서 공고형 지원도 찾는 경우",
      situation: "일상 운영비가 부족한 가운데 마케팅이나 판로 지원 공고를 함께 알아보는 상황입니다.",
      compare: "임차료·인건비 등 일반 운영비와 공고가 정한 과제비는 같은 범위가 아닐 수 있습니다. 운영자금은 상환 가능한 현금 흐름을, 지원사업은 과제 목표·자부담·정산 가능성을 중심으로 봅니다.",
      prepare: "운영비의 항목과 시점, 지원받고 싶은 과제의 목표·산출물·예산을 분리하고 공고의 허용 비용을 확인합니다.",
      cta: "운전자금과 정부지원사업 비교"
    },
    {
      pair: ["facility", "support"],
      title: "설비 투자와 과제 지원 중 방향을 정하는 경우",
      situation: "새 장비 도입 자체가 필요한지, 기술개발·실증 과제 안에서 장비나 서비스를 활용할지 판단하는 상황입니다.",
      compare: "시설자금은 투자 대상과 상환 계획이 중심이고, 지원사업은 공고 목적에 맞는 수행 과제와 성과·정산 의무가 중심입니다. 과제에 장비비가 포함돼도 인정 범위와 소유·집행 조건은 공고마다 다릅니다.",
      prepare: "장비 필요성·견적·설치계획과 과제 목표·수행인력·예산·자부담을 나눠 작성해 두 경로를 대조합니다.",
      cta: "시설자금과 정부지원사업 비교"
    }
  ];

  let showFullCriteria=false;
  const paths={operation:['운영 소요 정리','조건·상환 검토','기관 심사·집행'],facility:['투자 계획 정리','견적·설치 확인','기관 심사·집행'],support:['공고·과제 확인','요건·부담 검토','기관 평가·수행']};
  const pathHTML=key=>`<section class="cmp-visual-path"><h3>${escape(nameOf(key))} 준비 경로</h3><ol>${paths[key].map((label,i)=>`<li><small>0${i+1}</small><strong>${escape(label)}</strong></li>`).join('')}</ol><p>공고와 지원 방식에 따라 실제 절차가 달라집니다.</p><button type="button" data-cmp-path-detail>진행 순서 자세히 보기</button></section>`;
  const nameOf = key => CONTENT && CONTENT.funds && CONTENT.funds[key] ? CONTENT.funds[key].name : ({ operation: "운전자금", facility: "시설자금", support: "정부지원사업" }[key] || "자금");
  const ensureHost = () => {
    let host = root.querySelector("[data-cmp-expanded]");
    if (host) return host;
    const rows = root.querySelector(".cmp-rows");
    if (!rows) return null;
    host = document.createElement("div");
    host.setAttribute("data-cmp-expanded", "");
    rows.parentNode.insertBefore(host, rows);
    return host;
  };
  const render = state => {
    const host = ensureHost();
    if (!host) return false;
    const leftSelect = root.querySelector("[data-cmp-select='left']");
    const rightSelect = root.querySelector("[data-cmp-select='right']");
    const left = leftSelect && funds[leftSelect.value] ? leftSelect.value : "operation";
    const right = rightSelect && funds[rightSelect.value] && rightSelect.value !== left ? rightSelect.value : (left === "facility" ? "support" : "facility");
    const leftName = nameOf(left);
    const rightName = nameOf(right);
    const rows = criteria.map((item,index) => `<tr class="${index>2?'cmp-extra-row':''}"${index>2&&!showFullCriteria?' hidden':''}><th scope="row">${escape(item[0])}</th><td data-side-label="${escape(leftName)}">${escape(funds[left][item[1]])}</td><td data-side-label="${escape(rightName)}">${escape(funds[right][item[1]])}</td></tr>`).join("");
    const caseItems = cases.map(item => `<article class="cmp-case"><div class="cmp-case-copy"><h3>${escape(item.title)}</h3><p><strong>상황</strong>${escape(item.situation)}</p><p><strong>비교 판단</strong>${escape(item.compare)}</p><p><strong>먼저 준비할 것</strong>${escape(item.prepare)}</p></div><button type="button" class="secondary" data-cmp-case-pair="${escape(item.pair.join(":"))}">${escape(item.cta)}</button></article>`).join("");
    host.innerHTML = `<section class="cmp-core" aria-labelledby="cmp-core-title"><div class="cmp-section-head"><div><h2 id="cmp-core-title">선택한 두 자금의 핵심 차이</h2><p>같은 비용처럼 보여도 지원 방식, 사용 목적, 상환·자부담과 사후 의무가 다릅니다. 아래 기준을 먼저 대조한 뒤 상세 행에서 자료와 절차를 확인하세요.</p></div><p class="cmp-pair-label" aria-live="polite"><strong>${escape(leftName)}</strong><span aria-hidden="true"> / </span><strong>${escape(rightName)}</strong></p></div><div class="cmp-visual-paths">${pathHTML(left)}${pathHTML(right)}</div><div class="cmp-table-wrap"><table id="cmp-core-table"><caption class="sr-only">${escape(leftName)}과 ${escape(rightName)}의 핵심 차이표</caption><thead><tr><th scope="col">비교 기준</th><th scope="col">${escape(leftName)}</th><th scope="col">${escape(rightName)}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="cmp-detail-disclosure"><p>지원 방식·목적·상환 부담부터 먼저 비교하세요. 자료와 이후 절차도 이어서 확인할 수 있습니다.</p><button type="button" data-cmp-full-criteria aria-expanded="${showFullCriteria}" aria-controls="cmp-core-table">${showFullCriteria?'핵심 3기준만 보기':'자료·절차·사후관리 3기준 더 보기'}</button></div><p class="cmp-core-notice">지원 대상·금액·금리·부담·집행 조건은 기관의 최신 공고와 심사 결과를 기준으로 확인합니다.</p></section><section class="cmp-cases" aria-labelledby="cmp-cases-title"><div class="cmp-section-head"><div><h2 id="cmp-cases-title">상황별 예시로 비교해 보세요</h2><p>비용 이름보다 사업에서 왜 필요한지부터 나누면 준비 자료와 확인할 공고가 선명해집니다.</p></div></div><div class="cmp-case-list">${caseItems}</div></section>`;
    return true;
  };
  const onChange = (target, state) => {
    if (!target || !target.matches("[data-cmp-select]")) return false;
    render(state);
    return true;
  };
  const onClick = (button, state) => {
    if(button&&button.hasAttribute('data-cmp-full-criteria')){showFullCriteria=!showFullCriteria;render(state);root.querySelector('[data-cmp-full-criteria]').focus({preventScroll:true});return true;}
    if(button&&button.hasAttribute('data-cmp-path-detail')){api.record({chapter:'prepare',procedure:true,position:3});const toggle=root.querySelector('#cmp-process-toggle');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();root.querySelector('#cmp-process-panel').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return true;}
    if(button&&button.matches('.cmp-row-toggle')&&button.getAttribute('aria-expanded')!=='true'){const key=button.id;api.record(key==='cmp-check-toggle'?{chapter:'checks',procedure:false,position:1}:key==='cmp-documents-toggle'?{chapter:'prepare',procedure:false,position:2}:key==='cmp-process-toggle'?{chapter:'prepare',procedure:true,position:3}:{chapter:'overview',procedure:false,position:0});}
    if (!button || !button.matches("[data-cmp-case-pair]")) return false;
    const pair = String(button.dataset.cmpCasePair || "").split(":");
    if (pair.length !== 2 || !funds[pair[0]] || !funds[pair[1]] || pair[0] === pair[1]) return false;
    if (typeof root._cmpSetPair !== "function" || root._cmpSetPair(pair[0], pair[1]) !== true) return false;
    api.navigate("guide");
    render(state);
    return true;
  };

  return { render, onChange, onClick };
}
