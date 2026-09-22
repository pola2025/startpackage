(()=>{
  const config=window.COURSE;
  if(!config)return;
  const stage=document.querySelector('#stage');
  const A='./assets/startpackage/';
  const imageGrid=(scene)=>`<div class="surface image-grid ${scene.columns===1?'one':scene.columns===2?'two':'three'} ${scene.portfolio?'portfolio':''} zoomable media-gallery" data-detail="${scene.detail||scene.title}">${scene.images.map((image,i)=>`<div class="image-tile reveal"><img src="${A+image.src}" alt="${image.alt||scene.title}" data-label="${image.label||''}"><span>${image.label||''}</span></div>`).join('')}</div>`;
  const browser=(scene)=>`<div class="browser-frame zoomable" data-detail="${scene.detail||scene.title}"><div class="browser-bar"><i class="browser-dot"></i><div class="browser-url">${scene.url||'홈페이지 예시'}</div></div><img src="${A+scene.image}" alt="${scene.title}"></div>`;
  const support=(scene)=>`<div class="surface support-hero"><div><div class="big-number">${scene.number}</div><div class="big-label">${scene.numberLabel}</div></div><div class="support-list">${scene.items.map((item,i)=>`<div class="support-item reveal"><b>${String(i+1).padStart(2,'0')}</b><strong>${item}</strong></div>`).join('')}</div></div>`;
  const decisions=(scene)=>`<div class="decision"><section class="decision-col good"><h2>${scene.goodTitle}</h2><div class="decision-list">${scene.good.map(x=>`<div class="decision-row reveal">${x}</div>`).join('')}</div></section><section class="decision-col bad"><h2>${scene.badTitle}</h2><div class="decision-list">${scene.bad.map(x=>`<div class="decision-row reveal">${x}</div>`).join('')}</div></section></div>`;
  const types=(scene)=>`<div class="surface logo-types zoomable media-gallery" data-detail="${scene.detail||scene.title}">${scene.items.map(item=>`<div class="logo-tile reveal"><img src="${A+item.src}" alt="${item.label}" data-label="${item.label}"><strong>${item.label}</strong></div>`).join('')}${scene.detailImages?.length?`<div class="detail-media-pool" hidden>${scene.detailImages.map(item=>`<img src="${A+item.src}" alt="${item.label}" data-label="${item.label}">`).join('')}</div>`:''}</div>`;
  const printCompare=(scene)=>`<div class="surface"><div class="print-compare"><div class="print-sample screen reveal"><strong>그라데이션<br>입체 질감<br>그림자 효과</strong></div><div class="print-divider"></div><div class="print-sample flat reveal"><strong>단순한 색상<br>명확한 외곽선</strong></div></div><div class="print-note">${scene.note}</div></div>`;
  const costs=(scene)=>`<div class="surface cost-list">${scene.rows.map(row=>`<div class="cost-row reveal"><strong>${row[0]}</strong><span>${row[1]}</span><b>${row[2]}</b></div>`).join('')}</div>`;
  const products=(scene)=>`<div class="service-compare"><article class="service-product ads reveal"><span class="product-label">광고</span><h2>${scene.ads.title}</h2><p>${scene.ads.copy}</p><strong>${scene.ads.price}</strong></article><article class="service-product content reveal"><span class="product-label">콘텐츠</span><h2>${scene.content.title}</h2><p>${scene.content.copy}</p><strong>${scene.content.price}</strong></article>${scene.total?`<div class="bundle-total reveal"><span>두 상품 함께 신청</span><strong>${scene.total}</strong></div>`:''}</div>`;
  const channels=(scene)=>`<div class="surface channel-grid">${scene.items.map(item=>`<div class="channel reveal"><b>${item[0]}</b><span>${item[1]}</span></div>`).join('')}</div>`;
  const channelCards=(scene)=>`<div class="surface channel-card-grid">${scene.items.map((item,i)=>`<div class="channel-card reveal" style="animation-delay:${i*.12}s"><div class="channel-logo ${item.kind||''}"><img src="${A+item.logo}" alt="${item.title} 로고"></div><div><strong>${item.title}</strong><span>${item.copy}</span></div></div>`).join('')}</div>`;
  const flow=(scene)=>`<div class="surface flow">${scene.items.map((item,i)=>`${i?'<div class="flow-line"></div>':''}<div class="flow-step reveal" style="animation-delay:${i*.12}s"><span>STEP ${String(i+1).padStart(2,'0')}</span><b>${item[0]}</b><strong>${item[1]}</strong></div>`).join('')}</div>`;
  const automation=(scene)=>`<div class="surface automation-chain">${scene.items.map((item,i)=>`<div class="automation-step reveal" style="animation-delay:${i*.1}s"><b>${String(i+1).padStart(2,'0')}</b><div><strong>${item[0]}</strong><span>${item[1]}</span></div></div>`).join('')}</div>`;
  const creativeMock=(scene)=>`<div class="app-mock creative-app zoomable" data-detail="${scene.detail}"><div class="app-topbar"><div><span class="app-dot blue"></span><b>광고소재 제작</b></div><em>Instagram · 4:5</em><button type="button">소재 저장</button></div><div class="creative-layout"><aside class="mock-side"><strong>콘텐츠</strong><span class="selected">레이아웃</span><span>텍스트</span><span>이미지</span><span>브랜드</span></aside><div class="creative-stage"><img src="${A+'../social-content/polarad-post-01.png'}" alt="폴라애드 광고소재 예시"><i>1080 × 1350</i></div><section class="creative-inspector"><small>광고 문구</small><b>브랜드가 기업되는<br>마케팅을 만듭니다.</b><small>행동 유도</small><div class="mock-field">상담 신청하기</div><small>게재 위치</small><div class="mock-choice on">Facebook · Instagram</div></section></div></div>`;
  const adsManagerMock=(scene)=>`<div class="app-mock ads-manager-app zoomable" data-detail="${scene.detail}"><div class="app-topbar meta-bar"><div><img src="${A+'../meta-glyph.svg'}" alt="Meta"><b>광고 관리자</b></div><em>폴라애드 광고 계정</em><button type="button">검토 및 게시</button></div><div class="ads-layout"><aside class="mock-side"><strong>캠페인</strong><span>광고 세트</span><span class="selected">광고</span><span>결과</span></aside><section class="ads-table"><div class="ads-tabs"><b>광고 설정</b><span>게재 준비</span></div><div class="ads-row active"><i></i><div><strong>잠재 고객 확보 광고</strong><small>폴라애드 · 이미지 1개</small></div><b>설정 중</b></div><div class="ads-row"><i></i><div><strong>연결된 페이지</strong><small>폴라애드</small></div><b>정상</b></div></section><section class="ads-settings"><h3>광고 설정</h3><label>전환 위치<div class="mock-field selected-field">인스턴트 양식</div></label><label>예산<div class="mock-field">일 $20.00</div></label><label>타겟<div class="mock-field">대한민국 · 30세 이상</div></label><div class="mock-complete">필수 설정 완료</div></section></div></div>`;
  const leadFormMock=(scene)=>`<div class="app-mock form-builder-app zoomable" data-detail="${scene.detail}"><div class="app-topbar meta-bar"><div><img src="${A+'../meta-glyph.svg'}" alt="Meta"><b>인스턴트 양식 만들기</b></div><em>새 잠재 고객 양식</em><button type="button">게시</button></div><div class="form-layout"><section class="form-editor"><div class="form-step active"><b>01</b><span>소개</span></div><div class="form-step active"><b>02</b><span>질문</span></div><div class="form-step"><b>03</b><span>개인정보처리방침</span></div><h3>고객에게 받을 정보</h3><div class="form-question">회사명 <i>단답형</i></div><div class="form-question">이름 <i>필수</i></div><div class="form-question">전화번호 <i>필수</i></div></section><div class="form-phone"><div class="phone-speaker"></div><div class="form-phone-head">상담 신청</div><p>필요한 정보를 입력해주세요.</p><label>회사명<span></span></label><label>이름<span></span></label><label>전화번호<span></span></label><button type="button">제출</button></div></div></div>`;
  const notificationMock=(scene)=>`<div class="app-mock notification-app zoomable" data-detail="${scene.detail}"><div class="app-topbar"><div><span class="app-dot green"></span><b>신규 고객 접수 알림</b></div><em>접수관리 · Telegram 동시 전달</em><button type="button">접수관리 열기</button></div><div class="notification-layout"><aside class="notice-list"><strong>접수 알림</strong><div class="notice-item active"><b>새 잠재 고객</b><span>방금 전</span></div><div class="notice-item"><b>상담 확인</b><span>오늘 10:14</span></div><div class="notice-item"><b>담당자 배정</b><span>어제</span></div></aside><section class="notice-message"><div class="notice-badge">META LEAD</div><h3>새로운 고객이 접수되었습니다</h3><div class="lead-detail"><span>회사명</span><strong>비즈니스 컨설팅 문의</strong></div><div class="lead-detail"><span>고객명</span><strong>김**</strong></div><div class="lead-detail"><span>연락처</span><strong>010-****-1234</strong></div><div class="notice-actions"><button type="button">담당자 배정</button><button type="button">고객 확인</button></div></section><aside class="telegram-alert"><header><span class="telegram-mark">T</span><div><b>Telegram</b><small>폴라애드 접수 알림</small></div><i>방금 전</i></header><div class="telegram-chat"><span class="telegram-date">오늘</span><div class="telegram-bubble"><b>신규 고객 접수</b><dl><dt>회사명</dt><dd>비즈니스 컨설팅 문의</dd><dt>고객명</dt><dd>김**</dd><dt>연락처</dt><dd>010-****-1234</dd><dt>접수경로</dt><dd>Meta 잠재고객 양식</dd></dl><strong>담당자 확인 필요</strong></div></div></aside></div></div>`;
  const customerMessageMock=(scene)=>`<div class="message-preview-wrap"><div class="message-phone zoomable" data-detail="${scene.detail}"><div class="phone-speaker"></div><header><b>폴라애드 상담접수</b><span>알림톡</span></header><div class="talk-date">오늘</div><div class="talk-bubble"><strong>상담 신청이 접수되었습니다.</strong><p>담당자가 내용을 확인한 뒤 연락드리겠습니다.</p><dl><dt>접수 내용</dt><dd>Meta 광고 상담</dd><dt>접수 번호</dt><dd>PA-240901</dd></dl></div><button type="button">홈페이지 확인</button></div><section class="delivery-status"><span>자동 발송 상태</span><div class="status-line done"><b>01</b><strong>고객 접수 완료</strong></div><div class="status-line done"><b>02</b><strong>문자 · 알림톡 발송</strong></div><div class="status-line"><b>03</b><strong>담당자 상담 준비</strong></div></section></div>`;
  const dashboardMock=(scene)=>`<div class="app-mock lead-dashboard-app zoomable" data-detail="${scene.detail}"><div class="app-topbar"><div><img class="polarad-mini" src="${A+'../polarad-profile-logo.png'}" alt="폴라애드"><b>홈페이지 접수관리</b></div><em>고객 접수 통계</em><button type="button">내보내기</button></div><div class="dashboard-body"><aside class="mock-side"><strong>접수관리</strong><span class="selected">전체 고객</span><span>상담 대기</span><span>상담 완료</span><span>통계</span></aside><main class="dashboard-main"><div class="metric-row"><div><span>오늘 접수</span><b>12</b></div><div><span>상담 대기</span><b>8</b></div><div><span>전환율</span><b>18.4%</b></div></div><div class="lead-chart"><span style="--h:38%"></span><span style="--h:64%"></span><span style="--h:49%"></span><span style="--h:82%"></span><span style="--h:72%"></span><span style="--h:96%"></span><b>최근 6일 접수 추이</b></div><div class="lead-table"><div class="table-head"><span>고객</span><span>접수경로</span><span>상태</span><span>접수시간</span></div><div><span>김**</span><span>Meta 양식</span><span class="waiting">상담 대기</span><span>방금 전</span></div><div><span>이**</span><span>홈페이지</span><span class="done">확인 완료</span><span>10:14</span></div></div></main></div></div>`;
  const processMapMock=(scene)=>`<div class="surface process-map">${scene.items.map((item,i)=>`<div class="process-screen ${item.kind} reveal" style="animation-delay:${i*.1}s"><div class="mini-screen">${item.kind==='creative'?`<img src="${A+'../social-content/polarad-post-01.png'}" alt="광고소재">`:item.kind==='ads'?'<div class="mini-rows"><i></i><i></i><i></i></div>':item.kind==='form'?'<div class="mini-form"><i></i><i></i><i></i><b></b></div>':item.kind==='alert'?'<div class="mini-alert"><b>T</b><i></i><i></i></div>':item.kind==='talk'?'<div class="mini-talk"><i></i><i></i></div>':'<div class="mini-dashboard"><b></b><i></i><i></i><i></i></div>'}</div><span>${String(i+1).padStart(2,'0')}</span><strong>${item.label}</strong></div>`).join('')}</div>`;
  const scopes=(scene)=>`<div class="scope-compare"><section class="scope reveal"><small>${scene.left.kicker}</small><h2>${scene.left.title}</h2><ul>${scene.left.items.map(x=>`<li>${x}</li>`).join('')}</ul></section><section class="scope reveal"><small>${scene.right.kicker}</small><h2>${scene.right.title}</h2><ul>${scene.right.items.map(x=>`<li>${x}</li>`).join('')}</ul></section></div>`;
  const visual=(scene)=>{
    if(scene.visual==='gallery')return imageGrid(scene);
    if(scene.visual==='browser')return browser(scene);
    if(scene.visual==='support')return support(scene);
    if(scene.visual==='decision')return decisions(scene);
    if(scene.visual==='logoTypes')return types(scene);
    if(scene.visual==='printCompare')return printCompare(scene);
    if(scene.visual==='costs')return costs(scene);
    if(scene.visual==='products')return products(scene);
    if(scene.visual==='channels')return channels(scene);
    if(scene.visual==='channelCards')return channelCards(scene);
    if(scene.visual==='flow')return flow(scene);
    if(scene.visual==='automation')return automation(scene);
    if(scene.visual==='creativeMock')return creativeMock(scene);
    if(scene.visual==='adsManagerMock')return adsManagerMock(scene);
    if(scene.visual==='leadFormMock')return leadFormMock(scene);
    if(scene.visual==='notificationMock')return notificationMock(scene);
    if(scene.visual==='customerMessageMock')return customerMessageMock(scene);
    if(scene.visual==='dashboardMock')return dashboardMock(scene);
    if(scene.visual==='processMapMock')return processMapMock(scene);
    if(scene.visual==='scopes')return scopes(scene);
    return `<div class="surface"><h2>${scene.visualTitle||''}</h2><p>${scene.visualCopy||''}</p></div>`;
  };
  const slide=(scene,i)=>{
    if(scene.type==='cover')return `<section class="slide${i===0?' active':''}"><div class="hero"><span class="eyebrow">${scene.eyebrow}</span><h1>${scene.title}</h1><p>${scene.copy}</p><div class="hero-pills">${scene.pills.map(x=>`<span>${x}</span>`).join('')}</div></div></section>`;
    if(scene.type==='closing')return `<section class="slide"><div class="closing"><span class="step-no">${scene.eyebrow}</span><h1>${scene.title}</h1><p>${scene.copy}</p><strong>${scene.foot}</strong></div></section>`;
    return `<section class="slide"><div class="lesson"><div class="lesson-copy"><span class="step-no">${scene.eyebrow}</span><h1>${scene.title}</h1><p>${scene.copy}</p>${scene.mode?`<span class="mode ${scene.modeTone||'info'}">${scene.mode}</span>`:''}</div><div class="visual">${visual(scene)}</div></div></section>`;
  };
  stage.innerHTML=config.scenes.map(slide).join('');
  document.querySelector('.chapter').textContent=`CHAPTER ${config.number} · ${config.name}`;
  const slides=[...document.querySelectorAll('.slide')];
  const current=document.querySelector('#current'),total=document.querySelector('#total'),progress=document.querySelector('#progress');
  const previous=document.querySelector('#prev'),next=document.querySelector('#next'),replay=document.querySelector('#replay'),full=document.querySelector('#full');
  let index=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.replace(/\D/g,''),10)||1)-1));
  total.textContent=String(slides.length).padStart(2,'0');
  const detail=document.createElement('section');
  detail.className='detail-overlay';
  detail.innerHTML='<div class="detail-head"><strong>자세히보기</strong><button class="detail-close" type="button">확대 닫기</button></div><div class="detail-slot"></div>';
  document.body.append(detail);
  const detailSlot=detail.querySelector('.detail-slot');
  let detailItems=[];
  let detailIndex=0;
  const closeDetail=()=>{detail.classList.remove('open');detailSlot.replaceChildren();detailItems=[];detailIndex=0};
  const showDetailItem=()=>{
    if(!detailItems.length)return;
    const item=detailItems[detailIndex];
    const image=detailSlot.querySelector('.detail-carousel-media img');
    const label=detailSlot.querySelector('.detail-carousel-label strong');
    const count=detailSlot.querySelector('.detail-carousel-label span');
    image.classList.remove('media-in');
    image.src=item.src;
    image.alt=item.alt||item.label||'확대 예시';
    label.textContent=item.label||item.alt||'예시';
    count.textContent=`${detailIndex+1} / ${detailItems.length}`;
    void image.offsetWidth;
    image.classList.add('media-in');
  };
  const moveDetail=delta=>{if(detailItems.length>1){detailIndex=(detailIndex+delta+detailItems.length)%detailItems.length;showDetailItem()}};
  const openMediaDetail=target=>{
    const pool=[...target.querySelectorAll('.detail-media-pool img')];
    const sources=pool.length?pool:[...target.querySelectorAll('.image-tile img,.logo-tile img')];
    detailItems=sources.map(image=>({src:image.currentSrc||image.src,alt:image.alt,label:image.dataset.label||image.alt}));
    detailIndex=0;
    detailSlot.innerHTML=`<div class="detail-carousel"><button class="detail-carousel-button previous" type="button">이전 예시</button><div class="detail-carousel-media"><img alt=""></div><button class="detail-carousel-button next" type="button">다음 예시</button><div class="detail-carousel-label"><strong></strong><span></span></div></div>`;
    const previousMedia=detailSlot.querySelector('.previous');
    const nextMedia=detailSlot.querySelector('.next');
    previousMedia.addEventListener('click',()=>moveDetail(-1));
    nextMedia.addEventListener('click',()=>moveDetail(1));
    if(detailItems.length<2){previousMedia.hidden=true;nextMedia.hidden=true}
    showDetailItem();
  };
  detail.querySelector('.detail-close').addEventListener('click',closeDetail);
  detail.addEventListener('click',event=>{if(event.target===detail)closeDetail()});
  document.addEventListener('click',event=>{
    const target=event.target.closest('.zoomable');
    if(!target||!slides[index].contains(target))return;
    detail.querySelector('.detail-head strong').textContent=target.dataset.detail||'자세히보기';
    if(target.matches('.media-gallery'))openMediaDetail(target);
    else detailSlot.replaceChildren(target.cloneNode(true));
    detail.classList.add('open');
  });
  const show=(value,replace=true)=>{
    index=Math.max(0,Math.min(slides.length-1,value));
    slides.forEach((slide,i)=>slide.classList.toggle('active',i===index));
    current.textContent=String(index+1).padStart(2,'0');
    progress.style.width=`${(index+1)/slides.length*100}%`;
    previous.textContent=index===0?'이전 챕터':'이전';
    next.textContent=index===slides.length-1?(config.nextLabel||'다음 챕터'):'다음';
    const hash=`#/${index+1}`;
    if(replace)history.replaceState(null,'',hash);else history.pushState(null,'',hash);
    closeDetail();
  };
  const move=delta=>{
    if(delta<0&&index===0){location.href=config.previous;return}
    if(delta>0&&index===slides.length-1){location.href=config.next;return}
    show(index+delta,false);
  };
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  replay.addEventListener('click',()=>{const active=slides[index];active.classList.remove('active');void active.offsetWidth;active.classList.add('active')});
  full.addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.());
  const nextKeys=new Set(['ArrowRight','ArrowDown','PageDown',' ','Enter','MediaTrackNext']);
  const previousKeys=new Set(['ArrowLeft','ArrowUp','PageUp','Backspace','MediaTrackPrevious']);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&detail.classList.contains('open')){event.preventDefault();closeDetail();return}
    if(detail.classList.contains('open')&&detailItems.length){
      if(nextKeys.has(event.key)){event.preventDefault();moveDetail(1);return}
      if(previousKeys.has(event.key)){event.preventDefault();moveDetail(-1);return}
    }
    if(nextKeys.has(event.key)){event.preventDefault();move(1);return}
    if(previousKeys.has(event.key)){event.preventDefault();move(-1);return}
    if(event.key==='Home')show(0,false);
    if(event.key==='End')show(slides.length-1,false);
    if(event.key.toLowerCase()==='r')replay.click();
    if(event.key.toLowerCase()==='f')full.click();
  });
  addEventListener('popstate',()=>show((parseInt(location.hash.replace(/\D/g,''),10)||1)-1));
  show(index);
})();
