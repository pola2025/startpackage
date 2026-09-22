(()=>{
  const nextKeys=new Set(['ArrowRight','ArrowDown','PageDown',' ','Enter','MediaTrackNext']);
  const previousKeys=new Set(['ArrowLeft','ArrowUp','PageUp','Backspace','MediaTrackPrevious']);
  const skipNavigation=event=>event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]')||(['Enter',' '].includes(event.key)&&event.target.closest('a,button,[role="button"]'));
  const slides=[...document.querySelectorAll('.slide')];
  if(!slides.length){
    const courses=[...document.querySelectorAll('.course-index .course-card')];
    if(!courses.length)return;
    document.addEventListener('keydown',event=>{
      if(skipNavigation(event))return;
      if(nextKeys.has(event.key)){event.preventDefault();location.href=courses[0].href;return}
      if(previousKeys.has(event.key)){event.preventDefault();location.href='chapter-07-ad-settings.html#/999';return}
      const number=Number(event.key);
      if(number>=1&&number<=courses.length){event.preventDefault();location.href=courses[number-1].href}
    });
    return;
  }
  const previous=document.querySelector('#prev');
  const next=document.querySelector('#next');
  const replay=document.querySelector('#replay');
  const full=document.querySelector('#full');
  const current=document.querySelector('#current');
  const total=document.querySelector('#total');
  const progress=document.querySelector('#progress');
  const chapterNumber=document.body.dataset.chapter||'01';
  const chapters=[
    ['01','Instagram 게시물','social-01-instagram-post.html#/1'],
    ['02','Instagram Reels','social-02-instagram-reels.html#/1'],
    ['03','Threads 게시물','social-03-threads.html#/1']
  ];
  const chapterIndex=Math.max(0,chapters.findIndex(([number])=>number===chapterNumber));
  const courseIndex='social-content-training.html';
  const nextCourse='chapter-09-startpackage.html#/1';
  let index=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.replace(/\D/g,''),10)||1)-1));
  total.textContent=slides.length;

  const gate=document.createElement('section');
  gate.className='mobile-gate';
  gate.innerHTML='<div class="mobile-gate-inner"><div class="mobile-gate-badge">PC</div><h1>PC에서<br>열어주세요</h1><p>이 교육자료는 실제 메뉴 위치를 크게 확인하도록 설계되었습니다.</p><strong>노트북 또는 데스크탑 권장</strong></div>';
  document.body.append(gate);

  const wrap=document.createElement('div');
  wrap.className='chapter-jump-wrap';
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='chapter-jump-toggle';
  toggle.textContent='챕터 이동';
  toggle.setAttribute('aria-expanded','false');
  const menu=document.createElement('nav');
  menu.className='chapter-jump-menu';
  menu.setAttribute('aria-label','챕터 바로 이동');
  chapters.forEach(([number,title,path])=>{
    const link=document.createElement('a');
    link.className='chapter-jump-link'+(number===chapterNumber?' current':'');
    link.href=path;
    if(number===chapterNumber)link.setAttribute('aria-current','page');
    link.innerHTML=`<b>${number}</b><span>${title}</span>`;
    menu.append(link);
  });
  const indexLink=document.createElement('a');
  indexLink.className='chapter-jump-index';
  indexLink.href='meta-training-chapters.html';
  indexLink.textContent='전체 과정 목록';
  menu.append(indexLink);
  wrap.append(toggle,menu);
  const bottom=document.querySelector('.bottom');
  bottom.insertBefore(wrap,document.querySelector('.counter'));

  const detail=document.createElement('div');
  detail.className='detail-overlay';
  detail.innerHTML='<button class="detail-close" type="button" aria-label="상세 화면 닫기">×</button><div class="detail-slot"></div>';
  document.body.append(detail);
  const detailSlot=detail.querySelector('.detail-slot');
  const closeDetail=()=>{detail.classList.remove('open');detailSlot.replaceChildren()};
  detail.querySelector('.detail-close').addEventListener('click',closeDetail);
  detail.addEventListener('click',event=>{if(event.target===detail)closeDetail()});

  const addDetailButton=()=>{
    const stage=slides[index].querySelector('.phone-stage');
    if(!stage||stage.querySelector('.detail-open'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='detail-open';
    button.textContent='자세히 보기';
    button.addEventListener('click',()=>{
      const phone=stage.querySelector('.phone');
      if(!phone)return;
      detailSlot.replaceChildren(phone.cloneNode(true));
      detail.classList.add('open');
      const video=detailSlot.querySelector('video');
      if(video)video.play().catch(()=>{});
    });
    stage.append(button);
  };
  const render=(replaceHash=false)=>{
    slides.forEach((slide,i)=>slide.classList.toggle('active',i===index));
    current.textContent=index+1;
    previous.disabled=false;
    next.disabled=false;
    previous.textContent=index===0?(chapterIndex===0?'과정 목록':'이전 챕터'):'이전';
    next.textContent=index===slides.length-1?'다음 챕터':'다음';
    progress.style.width=`${((index+1)/slides.length)*100}%`;
    const hash=`#/${index+1}`;
    if(replaceHash)history.replaceState(null,'',hash);else if(location.hash!==hash)history.pushState(null,'',hash);
    slides.forEach((slide,i)=>slide.querySelectorAll('video').forEach(video=>{if(i===index){video.play().catch(()=>{})}else{video.pause()}}));
    addDetailButton();
  };
  const go=value=>{index=Math.max(0,Math.min(slides.length-1,value));closeDetail();render()};
  const movePrevious=()=>{
    if(index>0){go(index-1);return}
    if(chapterIndex===0){location.href=courseIndex;return}
    location.href=chapters[chapterIndex-1][2].replace('#/1','#/999');
  };
  const moveNext=()=>{
    if(index<slides.length-1){go(index+1);return}
    if(chapterIndex===chapters.length-1){location.href=nextCourse;return}
    location.href=chapters[chapterIndex+1][2];
  };
  previous.addEventListener('click',movePrevious);
  next.addEventListener('click',moveNext);
  replay.addEventListener('click',()=>{const slide=slides[index];slide.classList.remove('active');void slide.offsetWidth;slide.classList.add('active');slide.querySelectorAll('video').forEach(video=>{video.currentTime=0;video.play().catch(()=>{})})});
  full.addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()});
  toggle.addEventListener('click',event=>{event.stopPropagation();const open=!wrap.classList.contains('open');wrap.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open))});
  menu.addEventListener('click',event=>event.stopPropagation());
  document.addEventListener('click',event=>{
    wrap.classList.remove('open');toggle.setAttribute('aria-expanded','false');
    const target=event.target.closest('[data-go]');
    if(target){event.preventDefault();go(Number(target.dataset.go))}
  });
  document.addEventListener('keydown',event=>{
    if(skipNavigation(event))return;
    if(event.key==='Escape'){closeDetail();wrap.classList.remove('open');return}
    if(nextKeys.has(event.key)){event.preventDefault();moveNext();return}
    if(previousKeys.has(event.key)){event.preventDefault();movePrevious();return}
    if(event.key==='Home')go(0);
    if(event.key==='End')go(slides.length-1);
    if(event.key.toLowerCase()==='f')full.click();
  });
  window.addEventListener('popstate',()=>{index=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.replace(/\D/g,''),10)||1)-1));render(true)});
  render(true);
})();
