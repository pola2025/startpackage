(()=>{
  const slides=[...document.querySelectorAll('.slide')];
  const nextButton=document.querySelector('#next');
  const previousButton=document.querySelector('#prev');
  if(!slides.length||!nextButton||!previousButton)return;

  let layer=null;
  let activeSlide=null;
  let autoTimer=0;
  let cleanupTimer=0;
  let savedNext='';
  let savedPrevious='';

  const currentSlide=()=>document.querySelector('.slide.active');
  const slideNumber=slide=>slides.indexOf(slide)+1;
  const isVisible=element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0};
  const findSurface=slide=>slide.querySelector('.screen,.browser,.phone');
  const findTarget=slide=>[...slide.querySelectorAll('.screen .target,.browser .target,.phone .target,.screen .hotspot,.screen [data-go],.browser [data-go],.phone [data-go]')].find(isVisible);
  const cleanText=value=>(value||'').replace(/\s+/g,' ').trim();

  function targetLabel(target,slide){
    if(target.matches('.make-item.correct'))return '만들기 메뉴 · 페이지';
    if(target.matches('.action-grid.hotspot,.tool-grid.hotspot'))return '오른쪽 위 3×3 메뉴';
    if(target.matches('.pair-panel'))return '페이지 1개 + Instagram 1개';
    return cleanText(target.dataset.detailLabel||target.innerText||slide.querySelector('.say')?.innerText||'누를 위치');
  }

  function detailScope(target){
    if(target.matches('.make-item.correct'))return target;
    const pageMenu=target.closest('.page-menu-popup');
    if(pageMenu)return pageMenu;
    const dropdown=target.closest('.actual-drop');
    if(dropdown)return dropdown;
    if(document.title.includes('Meta 계정 통합')){
      const contextSelectors=['.modal','.ig-auth-card','.profile-card','.suite-flyout','.account-box','.asset-detail','.asset-list','.prep-card','.tab-panel','.pair-panel'];
      for(const selector of contextSelectors){const context=target.closest(selector);if(context)return context}
      return null;
    }
    if(document.title.includes('광고 결제 설정')){
      const contextSelectors=['.payment-modal','.account-drop','.panel','.ads-menu','.suite-nav','.card-preview'];
      for(const selector of contextSelectors){const context=target.closest(selector);if(context)return context}
      return null;
    }
    if(document.title.includes('Meta 광고운영 주의사항')){
      const contextSelectors=['.mail-list','.message-list','.message-view','.notice-popover','.issue-panel'];
      for(const selector of contextSelectors){const context=target.closest(selector);if(context)return context}
      return null;
    }
    if(document.title.includes('잠재 고객 광고 설정')){
      const contextSelectors=['.campaign-focus-card','.target-panel','.ad-format-card','.launcher','.builder-content','.panel'];
      for(const selector of contextSelectors){const context=target.closest(selector);if(context)return context}
      return null;
    }
    const selectors=['.signup-panel','.quality','.account-row','.actual-actions','.actions','.bottom-tabs','.wizard-bottom','.modal-actions','.page-actions','.profile-card','.account-box','.asset-row','.profile-choice','.settings-row','.nav-row','.actual-field','.field','.create-now','.new-page','.ui-btn','.small-btn','.btn'];
    for(const selector of selectors){const scope=target.closest(selector);if(scope)return scope}
    return null;
  }

  function needsScreenContext(slide){
    const title=document.title;
    if(title.includes('Facebook 페이지 만들기'))return true;
    if(title.includes('Instagram 계정 생성'))return true;
    if(title.includes('Meta 계정 통합')&&[9,10].includes(slideNumber(slide)))return true;
    if(title.includes('광고 결제 설정'))return true;
    if(title.includes('Meta 광고운영 주의사항'))return true;
    if(title.includes('잠재 고객 광고 설정'))return true;
    return false;
  }

  function copyRenderedStyle(source,clone){
    const properties=['display','grid-template-columns','grid-template-rows','grid-auto-flow','grid-auto-columns','grid-auto-rows','flex-direction','flex-wrap','align-items','align-content','justify-content','justify-items','gap','column-gap','row-gap','width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-right','padding-bottom','padding-left','background','background-color','background-image','background-size','background-position','color','border','border-width','border-style','border-color','border-radius','box-shadow','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-indent','text-transform','white-space','word-break','overflow','overflow-x','overflow-y','opacity','object-fit','object-position'];
    const sources=[source,...source.querySelectorAll('*')];
    const clones=[clone,...clone.querySelectorAll('*')];
    sources.forEach((element,index)=>{
      const copy=clones[index];
      if(!copy)return;
      const style=getComputedStyle(element);
      properties.forEach(property=>copy.style.setProperty(property,style.getPropertyValue(property)));
    });
  }

  function staticizeTarget(sourceRoot,cloneRoot,target){
    const sourceNodes=[sourceRoot,...sourceRoot.querySelectorAll('*')];
    const cloneNodes=[cloneRoot,...cloneRoot.querySelectorAll('*')];
    const targetIndex=sourceNodes.indexOf(target);
    cloneNodes.forEach(element=>element.classList.remove('target','hotspot'));
    if(targetIndex>=0)cloneNodes[targetIndex]?.classList.add('detail-focus-target');
  }

  function closeDetail(){
    clearTimeout(autoTimer);
    clearTimeout(cleanupTimer);
    if(!layer)return;
    layer.remove();
    layer=null;
    activeSlide?.classList.remove('detail-focus-mode');
    activeSlide=null;
    nextButton.textContent=savedNext;
    previousButton.textContent=savedPrevious;
  }

  function releaseDetailForNavigation(){
    clearTimeout(autoTimer);
    if(!layer)return;
    const staleLayer=layer;
    const staleSlide=activeSlide;
    layer=null;
    activeSlide=null;
    cleanupTimer=setTimeout(()=>{staleLayer.remove();staleSlide?.classList.remove('detail-focus-mode')},420);
  }

  function addIsolatedDetail(canvas,frame,scope,target,slide){
    const scopeRect=scope.getBoundingClientRect();
    const context=document.createElement('div');
    context.className='detail-focus-context';
    const clone=scope.cloneNode(true);
    clone.querySelectorAll?.('[data-go]').forEach(element=>element.removeAttribute('data-go'));
    clone.removeAttribute?.('data-go');
    copyRenderedStyle(scope,clone);
    staticizeTarget(scope,clone,target);
    clone.classList.add('detail-focus-source');
    clone.style.width=scopeRect.width+'px';
    clone.style.height=scopeRect.height+'px';
    context.append(clone);
    canvas.append(context);
    requestAnimationFrame(()=>{
      const labelHeight=context.querySelector('.detail-focus-context-label')?.getBoundingClientRect().height||0;
      const cloneRect=clone.getBoundingClientRect();
      const baseWidth=cloneRect.width;
      const baseHeight=cloneRect.height;
      const availableWidth=frame.clientWidth*.86;
      const availableHeight=frame.clientHeight-56-labelHeight;
      const maxScale=target.matches('.ui-btn,.small-btn,.next,.create-now')?3.5:3;
      const scale=Math.min(maxScale,availableWidth/baseWidth,availableHeight/baseHeight);
      const integrationLarge=document.title.includes('Meta 계정 통합')&&[2,3].includes(slideNumber(slide));
      const finalScale=Math.max(integrationLarge?1.28:1.05,scale);
      clone.style.transform=`scale(${finalScale})`;
      const scaledWidth=baseWidth*finalScale;
      const scaledHeight=baseHeight*finalScale;
      context.style.width=scaledWidth+64+'px';
      context.style.height=scaledHeight+64+labelHeight+'px';
    });
  }

  function addCroppedDetail(canvas,frame,surface,target,slide){
    const surfaceRect=surface.getBoundingClientRect();
    const targetRect=target.getBoundingClientRect();
    const clone=surface.cloneNode(true);
    clone.querySelectorAll('[data-go]').forEach(element=>element.removeAttribute('data-go'));
    staticizeTarget(surface,clone,target);
    clone.classList.add('detail-focus-clone');
    clone.style.width=surfaceRect.width+'px';
    clone.style.height=surfaceRect.height+'px';
    canvas.append(clone);
    requestAnimationFrame(()=>{
      const title=document.title;
      const page=slideNumber(slide);
      let scale;
      if(title.includes('Instagram 계정 생성'))scale=2.25;
      else if(title.includes('Facebook 페이지 만들기'))scale=page===14?1.38:1.45;
      else if(title.includes('Meta 계정 통합')&&[2,3,9,10].includes(page))scale=1.65;
      else if(title.includes('Meta 계정 통합'))scale=Math.min(1.55,Math.max(1.42,frame.clientWidth/(surfaceRect.width*.82)));
      else if(title.includes('광고 결제 설정'))scale=page===5?1.55:1.48;
      else if(title.includes('Meta 광고운영 주의사항'))scale=page===10?1.72:page===4?1.4:1.55;
      else if(title.includes('잠재 고객 광고 설정'))scale=[7,8,9,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35].includes(page)?1.58:1.48;
      else scale=Math.min(2.25,Math.max(1.8,frame.clientWidth/(surfaceRect.width*.62)));
      const x=targetRect.left-surfaceRect.left+targetRect.width/2;
      const y=targetRect.top-surfaceRect.top+targetRect.height/2;
      const scaledWidth=surfaceRect.width*scale;
      const scaledHeight=surfaceRect.height*scale;
      const desiredLeft=frame.clientWidth/2-x*scale;
      const anchorY=title.includes('Instagram 계정 생성')&&page===23?0.8:title.includes('Facebook 페이지 만들기')&&page>=8&&page<=13?0.72:0.5;
      const desiredTop=frame.clientHeight*anchorY-y*scale;
      clone.style.left=(scaledWidth<=frame.clientWidth?(frame.clientWidth-scaledWidth)/2:Math.min(0,Math.max(frame.clientWidth-scaledWidth,desiredLeft)))+'px';
      clone.style.top=(scaledHeight<=frame.clientHeight?(frame.clientHeight-scaledHeight)/2:Math.min(0,Math.max(frame.clientHeight-scaledHeight,desiredTop)))+'px';
      clone.style.transform=`scale(${scale})`;
    });
  }

  function openDetail(){
    const slide=currentSlide();
    const surface=slide&&findSurface(slide);
    const target=slide&&findTarget(slide);
    if(layer||!slide||!surface||!target)return false;
    clearTimeout(autoTimer);
    savedNext=nextButton.textContent;
    savedPrevious=previousButton.textContent;
    layer=document.createElement('div');
    layer.className='detail-focus-layer';
    layer.innerHTML=`<div class="detail-focus-card"><div class="detail-focus-heading"><b>자세히보기</b><span></span></div><div class="detail-focus-window"><div class="detail-focus-canvas"></div></div></div>`;
    layer.querySelector('.detail-focus-heading span').textContent=targetLabel(target,slide);
    slide.append(layer);
    slide.classList.add('detail-focus-mode');
    activeSlide=slide;
    const frame=layer.querySelector('.detail-focus-window');
    const canvas=layer.querySelector('.detail-focus-canvas');
    const scope=detailScope(target);
    const chapterSevenPanel=document.title.includes('잠재 고객 광고 설정')&&[11,12,13,18,19,20,21,22,25,26,27,28,29,30,31,32,33,34,35,36,37].includes(slideNumber(slide));
    if(chapterSevenPanel)addCroppedDetail(canvas,frame,surface,target,slide);
    else if(needsScreenContext(slide))addCroppedDetail(canvas,frame,surface,target,slide);
    else if(scope)addIsolatedDetail(canvas,frame,scope,target,slide);
    else addCroppedDetail(canvas,frame,surface,target,slide);
    previousButton.textContent='확대 닫기';
    nextButton.textContent='다음 페이지';
    return true;
  }

  function scheduleDetail(){
    clearTimeout(autoTimer);
    const slide=currentSlide();
    if(!slide||!findSurface(slide)||!findTarget(slide))return;
    autoTimer=setTimeout(()=>{if(slide===currentSlide()&&!layer)openDetail()},1350);
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('#prev')&&layer){event.preventDefault();event.stopImmediatePropagation();closeDetail();return}
    if(target.closest('#next')){if(layer){releaseDetailForNavigation();return}if(openDetail()){event.preventDefault();event.stopImmediatePropagation()}return}
    if(target.closest('#replay')){closeDetail();setTimeout(scheduleDetail,0);return}
    const action=target.closest('.slide.active [data-go],.slide.active .target,.slide.active .hotspot');
    if(action&&layer){releaseDetailForNavigation();return}
    if(action&&!layer&&openDetail()){event.preventDefault();event.stopImmediatePropagation()}
  },true);

  const nextKeys=new Set(['ArrowRight','ArrowDown','PageDown',' ','Enter','MediaTrackNext']);
  const previousKeys=new Set(['ArrowLeft','ArrowUp','PageUp','Backspace','MediaTrackPrevious']);
  document.addEventListener('keydown',event=>{
    if(event.repeat)return;
    if(previousKeys.has(event.key)&&layer){event.preventDefault();event.stopImmediatePropagation();closeDetail();return}
    if(nextKeys.has(event.key)){if(layer){releaseDetailForNavigation();return}if(openDetail()){event.preventDefault();event.stopImmediatePropagation()}}
  },true);

  const observer=new MutationObserver(()=>{
    const slide=currentSlide();
    if(slide!==activeSlide&&layer)releaseDetailForNavigation();
    scheduleDetail();
  });
  slides.forEach(slide=>observer.observe(slide,{attributes:true,attributeFilter:['class']}));
  scheduleDetail();
})();
