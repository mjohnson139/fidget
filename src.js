// Veridian build extracted from prototype/spec into a maintainable module.
(() => {
  const panel = document.getElementById('panel');
  const titlebar = document.getElementById('panel-titlebar');
  const collapseBtn = document.getElementById('panel-collapse');
  const hideBtn = document.getElementById('panel-hide');
  const toolToggle = document.getElementById('tool-toggle');
  const arena = document.getElementById('arena');
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const stops = [[0,[58,45,106]],[.18,[45,77,138]],[.4,[45,138,168]],[.65,[78,195,184]],[.85,[120,220,165]],[1,[160,235,180]]];
  const presets = {
    default: { float: 60, pull: 110, follow: 0.55, falloff: 1.40, spring: 0.18, damp: 0.78 },
    loose: { float: 130, pull: 180, follow: 0.75, falloff: 1.10, spring: 0.10, damp: 0.85 },
    taut: { float: 35, pull: 70, follow: 0.40, falloff: 2.00, spring: 0.32, damp: 0.65 },
    floaty: { float: 90, pull: 140, follow: 0.65, falloff: 0.90, spring: 0.06, damp: 0.92 },
  };
  const params = { float:60,pull:110,follow:.55,falloff:1.4,spring:.18,damp:.78,springBack:true,points:10,ratio:.78,rings:28,outer:170,min:22,play:1.1,twist:.8,twistExtendedOnly:true,outline:60 };

  let kx=0,ky=0,kz=0,vx=0,vy=0,vz=0,target=null,userSpin=0,userSpinVel=0,mode='idle';
  let dragStartKx=0,dragStartKy=0,dragStartKz=0,dragStartPx=0,dragStartPy=0,gestureStartDist=0,gestureStartKz=0,lastGestureAngle=0;

  const colorAt = t => { t=((t%1)+1)%1; for(let i=0;i<stops.length-1;i++){const [t0,c0]=stops[i],[t1,c1]=stops[i+1]; if(t>=t0&&t<=t1){const f=(t-t0)/(t1-t0); return c0.map((c,j)=>Math.round(c+(c1[j]-c)*f));}} return stops[0][1]; };
  const starVertices=(cx,cy,outerR,innerR,points,rotationRad)=>Array.from({length:points*2},(_,i)=>{const r=i%2?innerR:outerR; const a=-Math.PI/2+rotationRad+i/(points*2)*Math.PI*2; return [cx+Math.cos(a)*r, cy+Math.sin(a)*r];});

  const sizeArena=()=>{const w=Math.min(window.innerWidth-40,720),h=Math.min(window.innerHeight-40,720); arena.style.width=`${w}px`; arena.style.height=`${h}px`; cv.style.width=`${w}px`; cv.style.height=`${h}px`; cv.width=w*DPR; cv.height=h*DPR;};
  sizeArena(); window.addEventListener('resize', sizeArena);

  const bind=(id,key,fmt)=>{const el=document.getElementById(id), vEl=document.getElementById('v-'+id); el.addEventListener('input',()=>{params[key]=+el.value; if(vEl) vEl.textContent=fmt?fmt(params[key]):params[key];});};
  ['float','pull','points','rings','outer','min','outline'].forEach(k=>bind(k,k));
  bind('follow','follow',v=>v.toFixed(2)); bind('falloff','falloff',v=>v.toFixed(2)); bind('spring','spring',v=>v.toFixed(2)); bind('damp','damp',v=>v.toFixed(2)); bind('ratio','ratio',v=>v.toFixed(2)); bind('play','play',v=>v.toFixed(2)); bind('twist','twist',v=>`${v.toFixed(2)}°/ring`);

  document.getElementById('spring-back').addEventListener('change',e=>params.springBack=e.target.checked);
  document.getElementById('twist-extended-only').addEventListener('change',e=>params.twistExtendedOnly=e.target.checked);
  document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{const p=presets[btn.dataset.preset]; Object.assign(params,p); Object.keys(p).forEach(k=>{const slider=document.getElementById(k); if(slider){slider.value=p[k]; slider.dispatchEvent(new Event('input'));}});}));

  const startOne=(x,y)=>{mode='one'; target={x:kx,y:ky,z:kz}; dragStartKx=kx;dragStartKy=ky;dragStartKz=kz;dragStartPx=x;dragStartPy=y; cv.classList.add('grabbing');};
  const startTwo=e=>{mode='two'; target=null; gestureStartDist=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY); gestureStartKz=kz; lastGestureAngle=Math.atan2(e.touches[1].clientY-e.touches[0].clientY,e.touches[1].clientX-e.touches[0].clientX); userSpinVel=0; cv.classList.add('grabbing');};
  const endAll=()=>{mode='idle'; target=null; cv.classList.remove('grabbing');};

  cv.addEventListener('mousedown',e=>{startOne(e.clientX,e.clientY); e.preventDefault();});
  window.addEventListener('mousemove',e=>{if(mode==='one'){const dx=e.clientX-dragStartPx,dy=e.clientY-dragStartPy; let nx=dragStartKx+dx,ny=dragStartKy+dy,nz=dragStartKz; const d=Math.hypot(nx,ny); if(d>params.float){const excess=d-params.float;if(dy<0)nz=Math.min(params.pull,dragStartKz+Math.min(excess,-dy*.8)); const k=params.float/d; nx*=k; ny*=k;} target={x:nx,y:ny,z:Math.max(0,nz)};}});
  window.addEventListener('mouseup',endAll);
  cv.addEventListener('touchstart',e=>{e.preventDefault(); e.touches.length>=2?startTwo(e):startOne(e.touches[0].clientX,e.touches[0].clientY);},{passive:false});
  cv.addEventListener('touchmove',e=>{e.preventDefault(); if(e.touches.length>=2){if(mode!=='two')startTwo(e); else {const ang=Math.atan2(e.touches[1].clientY-e.touches[0].clientY,e.touches[1].clientX-e.touches[0].clientX); let da=ang-lastGestureAngle; if(da>Math.PI)da-=2*Math.PI; if(da<-Math.PI)da+=2*Math.PI; userSpin+=da*180/Math.PI; userSpinVel=da*180/Math.PI; lastGestureAngle=ang; const dist=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY); target={x:kx,y:ky,z:Math.max(0,Math.min(params.pull,gestureStartKz+(dist-gestureStartDist)))}}}},{passive:false});
  cv.addEventListener('touchend',e=>{if(e.touches.length===0)endAll();},{passive:false});

  hideBtn.addEventListener('click',()=>{panel.classList.add('hidden'); toolToggle.classList.remove('hidden');});
  toolToggle.addEventListener('click',()=>{panel.classList.remove('hidden'); toolToggle.classList.add('hidden');});
  collapseBtn.addEventListener('click',()=>panel.classList.toggle('collapsed'));

  let draggingPanel=false,ox=0,oy=0;
  const panelDown=(x,y)=>{const r=panel.getBoundingClientRect(); panel.style.left=`${r.left}px`; panel.style.top=`${r.top}px`; panel.style.right='auto'; ox=x-r.left; oy=y-r.top; draggingPanel=true; titlebar.classList.add('dragging');};
  titlebar.addEventListener('mousedown',e=>{if(e.target.closest('.panel-btn'))return; panelDown(e.clientX,e.clientY); e.preventDefault();});
  window.addEventListener('mousemove',e=>{if(!draggingPanel)return; const r=panel.getBoundingClientRect(); let l=Math.max(0,Math.min(window.innerWidth-r.width,e.clientX-ox)); let t=Math.max(0,Math.min(window.innerHeight-60,e.clientY-oy)); panel.style.left=`${l}px`; panel.style.top=`${t}px`;});
  window.addEventListener('mouseup',()=>{draggingPanel=false; titlebar.classList.remove('dragging');});

  const posLabel=document.getElementById('v-pos'),extLabel=document.getElementById('v-ext');
  const tick=()=>{const {spring:stiff,damp}=params; if(target){vx+=(target.x-kx)*stiff; vy+=(target.y-ky)*stiff; vz+=(target.z-kz)*stiff;} else if(params.springBack){vx+=(0-kx)*stiff;vy+=(0-ky)*stiff;vz+=(0-kz)*stiff;} vx*=damp;vy*=damp;vz*=damp;kx+=vx;ky+=vy;kz+=vz; if(mode!=='two'){userSpin+=userSpinVel; userSpinVel*=.96; if(Math.abs(userSpinVel)<.005)userSpinVel=0;}
    posLabel.textContent=`${kx.toFixed(0)}, ${ky.toFixed(0)}`; extLabel.textContent=`${Math.round(kz/Math.max(1,params.pull)*100)}%`;
    const W=cv.width,H=cv.height; ctx.clearRect(0,0,W,H); ctx.save(); ctx.scale(DPR,DPR); const cx=cv.clientWidth/2, cy=cv.clientHeight/2; const extension=Math.min(1,kz/Math.max(1,params.pull));
    const N=params.rings,tw=params.twistExtendedOnly?params.twist*extension:params.twist,lift=extension*params.outer*.85;
    for(let i=0;i<N;i++){const t=i/(N-1),tc=Math.pow(t,params.play),rO=params.outer-(params.outer-params.min)*tc,rI=rO*params.ratio,follow=params.follow*Math.pow(t,params.falloff); const verts=starVertices(cx+kx*follow,cy+ky*follow-t*lift,rO,rI,params.points,(i*tw+userSpin)*Math.PI/180); const [r,g,b]=colorAt(t); ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.beginPath(); ctx.moveTo(verts[0][0],verts[0][1]); for(let v=1;v<verts.length;v++)ctx.lineTo(verts[v][0],verts[v][1]); ctx.closePath(); ctx.fill(); if(params.outline>0){ctx.strokeStyle=`rgb(${Math.max(0,r-params.outline)},${Math.max(0,g-params.outline)},${Math.max(0,b-params.outline)})`; ctx.lineWidth=1; ctx.stroke();}}
    ctx.restore(); requestAnimationFrame(tick);
  };
  tick();
})();
