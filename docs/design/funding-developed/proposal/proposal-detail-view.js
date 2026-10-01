function createProposalView(root, CONTENT, helpers, api) {
  'use strict';

  const escape = helpers.escape;
  let readingObserver=null;
  function updateReading(position){root.querySelectorAll('[data-prop-position]').forEach(b=>{if(Number(b.dataset.propPosition)===position)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});const label=root.querySelector('[data-prop-read-state]');if(label)label.textContent='문서 위치 '+String(position+1).padStart(2,'0')+' / 05 · '+sections[position].label;if(api.positionFeedback)api.positionFeedback(position);}

  const fundKeys = ['operation', 'facility', 'support'];
  const sections = [
    { key: 'overview', label: '제안 개요' },
    { key: 'checks', label: '핵심 검토' },
    { key: 'prepare', label: '준비 자료' },
    { key: 'procedure', label: '진행 순서' },
    { key: 'faq', label: '자주 묻는 질문' }
  ];
  const validFund = value => fundKeys.includes(value) ? value : 'operation';
  const validPosition = value => Math.max(0, Math.min(4, Number.isFinite(Number(value)) ? Number(value) : 0));
  const e = value => escape(value == null ? '' : value);
  const list = entries => '<ul class="p5-proposal-list">' + entries.map(entry => '<li>' + e(entry) + '</li>').join('') + '</ul>';
  const itemRows = entries => '<div class="p5-proposal-rows">' + entries.map((entry, index) => '<article><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div><h3>' + e(entry.title) + '</h3><p>' + e(entry.body) + '</p></div></article>').join('') + '</div>';
  const adviceRows = entries => '<div class="p5-proposal-advice">' + entries.map(entry => '<article><h3>' + e(entry.title) + '</h3><p>' + e(entry.body) + '</p></article>').join('') + '</div>';
  const stepRows = entries => '<ol class="p5-proposal-steps">' + entries.map((entry, index) => '<li><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div><h3>' + e(entry.title) + '</h3><p>' + e(entry.body) + '</p></div></li>').join('') + '</ol>';

  function statePatch(position) {
    if (position === 0) return { position: 0, chapter: 'overview', procedure: false };
    if (position === 1) return { position: 1, chapter: 'checks', procedure: false };
    if (position === 2) return { position: 2, chapter: 'prepare', procedure: false };
    if (position === 3) return { position: 3, chapter: 'prepare', procedure: true };
    return { position: 4, chapter: 'prepare', procedure: false };
  }

  function toc(position) {
    return '<nav class="p5-proposal-toc" aria-label="제안서 목차"><p>문서 목차<span class="p5-proposal-reading" data-prop-read-state>현재 항목</span></p><ol>' + sections.map((section, index) => '<li><button type="button" data-prop-position="' + index + '"' + (position === index ? ' aria-current="location"' : '') + '><span>' + String(index + 1).padStart(2, '0') + '</span>' + e(section.label) + '</button></li>').join('') + '</ol><p class="p5-proposal-toc-note">항목을 선택하면 문서의 해당 부분으로 이동합니다.</p></nav>';
  }

  function cover(fund) {
    return '<section class="p5-proposal-cover" aria-labelledby="p5-proposal-cover-title">' +
      '<div class="p5-proposal-cover-copy">' +
        '<p class="p5-proposal-docline">일반 준비 안내서 · 공고 확인 전 검토용</p>' +
        '<div><p class="p5-proposal-fund">' + e(fund.name) + '</p><h2 id="p5-proposal-cover-title">사업의 다음 단계를<br>함께 정리합니다.</h2></div>' +
        '<p class="p5-proposal-lead">' + e(fund.summary) + '</p>' +
        '<p class="p5-proposal-cover-restriction">' + e(CONTENT.process.restriction) + '</p>' +
        '<div class="p5-proposal-cover-foot"><span>공고 확인 전 준비 방향</span><span>기업자금 파트너</span></div>' +
      '</div>' +
      '<div class="p5-proposal-cover-media"><img src="funding-hero-assets/proposal-city-hero-v6.png" alt="푸른 시간의 도심 전망이 펼쳐진 기업 상담 공간" width="1916" height="821"></div>' +
    '</section>';
  }

  function overview(fund) {
    return '<section class="p5-proposal-section p5-proposal-overview" data-prop-section="0" aria-labelledby="p5-proposal-overview-title">' +
      '<div class="p5-proposal-section-head"><p>제안 개요</p><h2 id="p5-proposal-overview-title" tabindex="-1">' + e(fund.title) + '</h2></div>' +
      '<div class="p5-proposal-overview-grid"><div><h3>살펴볼 자금 목적</h3>' + list(fund.examples) + '</div><div><h3>상담을 시작할 때</h3>' + list(fund.fit) + '</div></div>' +
      '<p class="p5-proposal-disclaimer">지원 방식과 대상은 공고마다 다릅니다. 실제 지원 여부와 조건은 해당 기관의 심사로 결정됩니다.</p>' +
    '</section>';
  }

  function checks(fund) {
    return '<section class="p5-proposal-section p5-proposal-checks" data-prop-section="1" aria-labelledby="p5-proposal-checks-title">' +
      '<div class="p5-proposal-section-head"><p>핵심 검토</p><h2 id="p5-proposal-checks-title" tabindex="-1">가능 금액보다 먼저<br>확인할 세 가지</h2></div>' +
      '<figure class="p5-proposal-check-photo"><img src="funding-hero-assets/briefing-consult-scene-v6.png" alt="사업자와 검토 내용을 함께 살펴보는 상담 장면" width="1672" height="941"><figcaption>' + e(fund.eyebrow) + '이라는 목적을 실제 공고의 대상·용도·심사 기준과 대조합니다.</figcaption></figure>' +
      '<div class="p5-proposal-check-table" role="table" aria-label="' + e(fund.name) + ' 핵심 검토표"><div class="p5-proposal-check-table-head" role="row"><span role="columnheader">항목</span><span role="columnheader">확인 내용</span></div>' + fund.checks.map((entry, index) => '<div class="p5-proposal-check-row" role="row"><div role="cell"><span>' + String(index + 1).padStart(2, '0') + '</span><h3>' + e(entry.title) + '</h3></div><p role="cell">' + e(entry.body) + '</p></div>').join('') + '</div>' +
      '<p class="p5-proposal-disclaimer">업종·사업장 지역·사업 단계에 따라 확인할 공고가 달라집니다. 모집 여부와 세부 조건은 공식 공고에서 확인합니다.</p>' +
    '</section>';
  }

  function prepare(fund) {
    return '<section class="p5-proposal-section p5-proposal-prepare" data-prop-section="2" aria-labelledby="p5-proposal-prepare-title">' +
      '<div class="p5-proposal-section-head"><p>준비 자료</p><h2 id="p5-proposal-prepare-title" tabindex="-1">필요성이 확인된 뒤<br>사실에 맞게 준비합니다</h2></div>' +
      '<p class="p5-proposal-intro">초기 상담은 이름·연락처·지역·업종·회사명 다섯 항목만 받습니다. 구체적인 자료는 사업 현황과 확인할 공고를 정한 뒤 안내합니다.</p>' +
      itemRows(fund.documents) +
      '<figure class="p5-proposal-wide-photo"><img src="funding-hero-assets/consultation-preparation-proposal-v7.png" alt="상담에 필요한 자료를 차분히 정리하는 모습" width="1672" height="941"><figcaption>자료의 양보다 자금 목적, 사용 시점, 사업 계획이 서로 맞는지 먼저 살펴봅니다.</figcaption></figure>' +

    '</section>';
  }

  function procedure(fund) {
    return '<section class="p5-proposal-section p5-proposal-procedure" data-prop-section="3" aria-labelledby="p5-proposal-procedure-title">' +
      '<div class="p5-proposal-section-head"><p>진행 순서</p><h2 id="p5-proposal-procedure-title" tabindex="-1">상담에서 기관 절차까지<br>순서대로 확인합니다</h2></div>' +
      '<p class="p5-proposal-intro">' + e(CONTENT.process.intro) + '</p>' +
      stepRows(fund.steps) +
      '<p class="p5-proposal-restriction"><strong>상담 진행 안내</strong>' + e(CONTENT.process.restriction) + '</p>' +
    '</section>';
  }

  function faq(fund) {
    return '<section class="p5-proposal-section p5-proposal-faq-section" data-prop-section="4" aria-labelledby="p5-proposal-faq-title">' +
      '<div class="p5-proposal-section-head"><p>FAQ</p><h2 id="p5-proposal-faq-title" tabindex="-1">자주 확인하는 질문</h2></div>' +
      '<div class="p5-proposal-faq">' + fund.faq.map((entry, index) => '<details' + (index === 0 ? ' open' : '') + '><summary>' + e(entry.question) + '</summary><p>' + e(entry.answer) + '</p></details>').join('') + '</div>' +
      '<div class="p5-proposal-closing"><div><h3>우리 회사의 상황은 상담에서 이어갑니다.</h3><p>' + e(CONTENT.notice) + '</p></div><button type="button" data-site-contact>다섯 가지 정보로 상담 시작</button></div>' +
    '</section>';
  }

  function render(state) {
    if (!root || state.page !== 'guide') return;
    if(readingObserver){readingObserver.disconnect();readingObserver=null;}
    const mount = root.querySelector('[data-proposal-book]');
    if (!mount) return;
    const fundKey = validFund(state.fund);
    const fund = CONTENT.funds[fundKey];
    const position = validPosition(state.position);
    mount.innerHTML = '<article class="p5-proposal-document" aria-label="' + e(fund.name) + ' 준비 제안서">' + cover(fund) + '<div class="p5-proposal-document-body">' + toc(position) + '<div class="p5-proposal-content">' + overview(fund) + checks(fund) + prepare(fund) + procedure(fund) + faq(fund) + '</div></div></article>';
    const select = root.querySelector('[data-prop-fund]');
    if (select) select.value = fundKey;
    const heading = root.querySelector('[data-prop-heading]');
    if (heading) heading.textContent = fund.name + ' 준비 제안서';
    const status = root.querySelector('[data-fd-status]');
    if (status) status.textContent = fund.name + ' 준비 제안서, ' + sections[position].label + ' 목차가 선택되었습니다.';
    updateReading(position);
    const sectionNodes=[...root.querySelectorAll('[data-prop-section]')];if(typeof IntersectionObserver!=='undefined'){readingObserver=new IntersectionObserver(()=>{if(root.hidden||root.dataset.siteActive!=='guide')return;let active=0;const edge=innerHeight*.3;sectionNodes.forEach((node,index)=>{if(node.getBoundingClientRect().top<=edge)active=index;});updateReading(active);},{rootMargin:'-15% 0px -70% 0px',threshold:0});sectionNodes.forEach(node=>readingObserver.observe(node));}
  }

  function onClick(button, state) {
    if (!button || !root || !root.contains(button) || button.dataset.propPosition == null) return false;
    const position = validPosition(button.dataset.propPosition);
    api.record(statePatch(position));
    root.querySelectorAll('[data-prop-position]').forEach(item => {
      if (Number(item.dataset.propPosition) === position) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    const status = root.querySelector('[data-fd-status]');
    if (status) status.textContent = sections[position].label + ' 항목으로 이동했습니다.';
    const section = root.querySelector('[data-prop-section="' + position + '"]');
    if (section) {
      section.scrollIntoView({ block: 'start' });
      const heading = section.querySelector('h2');
      if (heading) heading.focus({ preventScroll: true });
    }
    return true;
  }

  function onChange(target, state) {
    if (!target || !root || !root.contains(target) || !target.matches('[data-prop-fund]')) return false;
    api.change({ fund: validFund(target.value), position: 0, chapter: 'overview', procedure: false });
    const select = root.querySelector('[data-prop-fund]');
    if (select) select.focus();
    return true;
  }

  return { render, onClick, onChange, onLeave(){if(readingObserver){readingObserver.disconnect();readingObserver=null;}} };
}
