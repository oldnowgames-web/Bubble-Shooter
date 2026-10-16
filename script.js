const W=360,H=640,COLS=10,R=18,RH=R*Math.sqrt(3),LIMIT=14,MAXR=20,V=640,NC=7,BOMB=7,RAIN=8;
const COLORS=[['#ff3b4e','#ff9aa4','#b3001a'],['#ff9a1f','#ffd08a','#b85a00'],['#ffe033','#fff6a8','#c7a100'],['#8be31f','#d4ff8a','#3f8a00'],['#2d6bff','#8fb2ff','#0a2f9e'],['#a447ff','#d6a8ff','#5a14a8'],['#ff6fc8','#ffc0e8','#b0207f']];
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const sx=W/2,sy=H-62;
let grid,par,state='menu',score=0,level=1,miss=0,shotsMax=6,cur=0,next=1,ball=null,fall=[],parts=[],pops=[],aim=Math.PI/2,snd=true,ink='#10285e',down=false,swapTap=false,shake=0,saved=true,records=[];
try{records=JSON.parse(localStorage.getItem('bs-records')||'[]')}catch(e){}
const rnd=n=>Math.floor(Math.random()*n);
const bestScore=()=>records.length?records[0].s:0;
const rowLen=r=>((r+par)&1)?COLS-1:COLS;
const pos=(r,c)=>({x:R+c*2*R+(((r+par)&1)?R:0),y:R+r*RH});
function nb(r,c){const o=((r+par)&1)?0:-1,a=[[r,c-1],[r,c+1]];for(const dr of[-1,1])for(const dc of[0,1])a.push([r+dr,c+o+dc]);return a.filter(([y,x])=>y>=0&&y<MAXR&&x>=0&&x<rowLen(y))}
function present(){const s=new Set();grid.forEach(row=>row.forEach(v=>v>=0&&s.add(v)));return [...s]}
function pickColor(ns){if(!ns&&Math.random()<.11)return Math.random()<.5?BOMB:RAIN;const p=present();return p.length?p[rnd(p.length)]:0}

/* sprites */
const S=120,spr=[];
function sph(c3,fill,extra){
  const k=document.createElement('canvas');k.width=k.height=S;const g=k.getContext('2d'),m=S/2,r=m-3;
  g.beginPath();g.arc(m,m,r,0,7);
  if(fill)fill(g,m,r);else{const gr=g.createRadialGradient(m-r*.3,m-r*.35,r*.08,m,m,r);gr.addColorStop(0,c3[1]);gr.addColorStop(.5,c3[0]);gr.addColorStop(1,c3[2]);g.fillStyle=gr;g.fill()}
  g.beginPath();g.arc(m,m,r,0,7);g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.28)';g.stroke();
  g.beginPath();g.ellipse(m-r*.33,m-r*.46,r*.34,r*.2,-.6,0,7);g.fillStyle='rgba(255,255,255,.78)';g.fill();
  g.beginPath();g.arc(m+r*.28,m+r*.42,r*.13,0,7);g.fillStyle='rgba(255,255,255,.28)';g.fill();
  if(extra)extra(g,m,r);
  return k}
COLORS.forEach(c=>spr.push(sph(c)));
spr.push(sph(['#555','#2a2a2a','#000'],null,(g,m,r)=>{
  g.strokeStyle='#d9b878';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(m+r*.5,m-r*.72);g.quadraticCurveTo(m+r*.72,m-r*.82,m+r*.8,m-r*.95);g.stroke();
  g.fillStyle='#ff9a1f';g.beginPath();g.arc(m+r*.82,m-r*.94,8,0,7);g.fill();g.fillStyle='#fff3a0';g.beginPath();g.arc(m+r*.82,m-r*.94,4,0,7);g.fill()}));
spr.push(sph(null,(g,m,r)=>{
  const f=g.createConicGradient?g.createConicGradient(0,m,m):g.createLinearGradient(0,0,S,S);
  ['#ff3b4e','#ff9a1f','#ffe033','#8be31f','#2d6bff','#a447ff','#ff6fc8','#ff3b4e'].forEach((c,i,a)=>f.addColorStop(i/(a.length-1),c));
  g.fillStyle=f;g.fill();
  const sh=g.createRadialGradient(m-r*.3,m-r*.35,r*.1,m,m,r);sh.addColorStop(0,'rgba(255,255,255,.35)');sh.addColorStop(.6,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.32)');g.fillStyle=sh;g.fill()}));

function bub(x,y,c,r=R-1){const d=r*2.1;ctx.drawImage(spr[c],x-d/2,y-d/2,d,d)}

/* som */
let AC,master,NB,howBack='menu';
function ac(){if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();const c=AC.createDynamicsCompressor();master=AC.createGain();master.gain.value=1.8;master.connect(c);c.connect(AC.destination)}if(AC.state==='suspended')AC.resume();return AC}
function tone(f1,f2,d,type='sine',v=.5,delay=0){if(!snd)return;try{const a=ac(),t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}catch(e){}}
function noise(d,v,delay=0,hp=1500){if(!snd)return;try{const a=ac(),t=a.currentTime+delay;if(!NB){NB=a.createBuffer(1,a.sampleRate*.6,a.sampleRate);const x=NB.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1}const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=NB;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+d+.02)}catch(e){}}
const sfx={
 shoot(){tone(240,980,.14,'sine',.9);tone(480,1500,.09,'triangle',.3);noise(.05,.25,0,3000)},
 swap(){tone(500,820,.07,'sine',.5)},
 pop(n){n=Math.min(n,9);for(let i=0;i<n;i++){const f=650+Math.random()*600,d=i*.05;tone(f,f*.3,.1,'sine',.9,d);noise(.045,.55,d,2500)}},
 fall(n){n=Math.min(n,6);for(let i=0;i<n;i++)tone(520+Math.random()*200,140,.2,'sine',.5,.15+i*.06)},
 bomb(){tone(170,32,.55,'sawtooth',.9);noise(.5,1,0,150);sfx.pop(6)},
 miss(){tone(210,120,.13,'sine',.8);noise(.03,.3,0,2000)},
 row(){tone(130,55,.3,'triangle',.9)},
 end(w){(w?[523,659,784,1047]:[392,330,262,196]).forEach((f,i)=>tone(f,f,.22,'triangle',.7,i*.14))}
};

/* jogo */
function start(lv){
  level=lv;par=0;grid=[];
  for(let r=0;r<MAXR;r++)grid.push(Array(rowLen(r)).fill(-1));
  const k=Math.min(3+lv,NC),n=Math.min(4+lv,9);
  for(let r=0;r<n;r++)for(let c=0;c<rowLen(r);c++)grid[r][c]=(c>0&&Math.random()<.4)?grid[r][c-1]:rnd(k);
  miss=0;shotsMax=Math.max(3,7-lv);ball=null;fall=[];parts=[];pops=[];
  cur=pickColor(true);next=pickColor();aim=Math.PI/2;
  state='play';ov(null);hud();
}
const hs=document.getElementById('hs'),hl=document.getElementById('hl'),hb=document.getElementById('hb');
function hud(){hs.textContent=score;hl.textContent=level;hb.textContent=Math.max(bestScore(),score)}
function cluster(r,c){const col=grid[r][c],seen=new Set([r+','+c]),q=[[r,c]],out=[];
  while(q.length){const [y,x]=q.pop();out.push([y,x]);for(const [a,b] of nb(y,x)){const k=a+','+b;if(!seen.has(k)&&grid[a][b]===col){seen.add(k);q.push([a,b])}}}
  return out}
function floating(){const seen=new Set(),q=[];
  for(let c=0;c<rowLen(0);c++)if(grid[0][c]>=0){seen.add('0,'+c);q.push([0,c])}
  while(q.length){const [y,x]=q.pop();for(const [a,b] of nb(y,x)){const k=a+','+b;if(!seen.has(k)&&grid[a][b]>=0){seen.add(k);q.push([a,b])}}}
  const out=[];grid.forEach((row,r)=>row.forEach((v,c)=>{if(v>=0&&!seen.has(r+','+c))out.push([r,c])}));return out}
function burst(x,y,c,n=7){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=70+Math.random()*130;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,c,l:.55})}}
function addRow(){par^=1;const p=present(),row=Array(rowLen(0)).fill(0).map(()=>p[rnd(p.length)]);grid.unshift(row);grid.pop();sfx.row()}
function hit(x,y){const lim=(1.85*R)**2;for(let r=0;r<MAXR;r++)for(let c=0;c<rowLen(r);c++)if(grid[r][c]>=0){const p=pos(r,c);if((p.x-x)**2+(p.y-y)**2<lim)return true}return false}
function shoot(){if(state!=='play'||ball)return;ball={x:sx,y:sy,vx:Math.cos(aim)*V,vy:-Math.sin(aim)*V,c:cur};cur=next;next=pickColor();sfx.shoot()}
function swap(){if(state!=='play'||ball)return;[cur,next]=[next,cur];sfx.swap()}

function land(){
  let b=null,bd=1e12;
  for(let r=0;r<MAXR;r++)for(let c=0;c<rowLen(r);c++){if(grid[r][c]>=0)continue;const p=pos(r,c),d=(p.x-ball.x)**2+(p.y-ball.y)**2;
    if(d<bd&&(r===0||nb(r,c).some(([y,x])=>grid[y][x]>=0))){bd=d;b=[r,c]}}
  const [r,c]=b,kind=ball.c,here=pos(r,c);ball=null;
  let gain=0,removed=[];
  if(kind===BOMB){
    for(let y=0;y<MAXR;y++)for(let x=0;x<rowLen(y);x++)if(grid[y][x]>=0){const p=pos(y,x);if(Math.hypot(p.x-here.x,p.y-here.y)<R*3.7)removed.push([y,x])}
    removed.forEach(([y,x])=>{const p=pos(y,x);burst(p.x,p.y,grid[y][x],5);grid[y][x]=-1});
    burst(here.x,here.y,2,22);shake=1;gain=removed.length*15;sfx.bomb();
  }else{
    let col=kind;
    if(kind===RAIN){
      let bn=0;col=-1;const cs=new Set(nb(r,c).map(([y,x])=>grid[y][x]).filter(v=>v>=0));
      cs.forEach(v=>{grid[r][c]=v;const n=cluster(r,c).length;if(n>bn){bn=n;col=v}});
      if(col<0){const p=present();col=p[rnd(p.length)]}
    }
    grid[r][c]=col;
    const cl=cluster(r,c);
    if(cl.length>=3||(kind===RAIN&&cl.length>=2)){
      cl.forEach(([y,x])=>{const p=pos(y,x);burst(p.x,p.y,col);grid[y][x]=-1});
      gain=cl.length*10;sfx.pop(cl.length);
    }else{miss++;sfx.miss()}
  }
  if(grid.some(row=>row.some(v=>v>=0))){
    const fl=floating();
    fl.forEach(([y,x])=>{const p=pos(y,x);fall.push({x:p.x,y:p.y,vy:-80,c:grid[y][x]});grid[y][x]=-1});
    gain+=fl.length*25;if(fl.length)sfx.fall(fl.length);
  }
  if(gain){score+=gain;pops.push({x:Math.min(Math.max(here.x,40),W-40),y:here.y,t:'+'+gain,l:1})}
  if(!grid.some(row=>row.some(v=>v>=0))){finish(true);return}
  if(miss>=shotsMax){addRow();miss=0}
  for(let y=LIMIT;y<MAXR;y++)if(grid[y].some(v=>v>=0)){finish(false);return}
  const p=present();if(cur<NC&&!p.includes(cur))cur=pickColor(true);if(next<NC&&!p.includes(next))next=pickColor(true);
  hud();
}
function commit(){
  if(score<=0||saved)return 0;saved=true;
  const e={s:score,l:level,d:new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),id:Date.now()};
  records.push(e);records.sort((a,b)=>b.s-a.s);records=records.slice(0,5);
  try{localStorage.setItem('bs-records',JSON.stringify(records))}catch(err){}
  return records.findIndex(x=>x.id===e.id)+1}
function finish(win){
  state=win?'win':'over';hud();sfx.end(win);
  document.getElementById(win?'wscore':'oscore').textContent=score;
  if(!win){const rk=commit();document.getElementById('orec').textContent=rk===1?'Novo recorde!':rk?'Você entrou nos recordes: '+rk+'º lugar':'pontos'}
  setTimeout(()=>ov(win?'win':'over'),650);
}
function renderRec(){
  const l=document.getElementById('rl');
  l.innerHTML=records.length?records.map((e,i)=>`<li><em>${i+1}º</em><span>${e.s.toLocaleString('pt-BR')}</span><small>Nível ${e.l} · ${e.d}</small></li>`).join(''):'<p class="empty">Nenhum recorde ainda. Jogue uma partida!</p>'}

/* interface */
function ov(id){const o=document.getElementById('ov');if(!id){o.classList.add('off');return}o.classList.remove('off');if(id==='rec')renderRec();document.querySelectorAll('.card').forEach(c=>c.classList.toggle('on',c.id==='c-'+id))}
function act(a){
  if(a==='play'||a==='restart'){commit();score=0;saved=false;start(1)}
  else if(a==='next')start(level+1);
  else if(a==='how'){howBack=state==='play'?'resume':state==='pause'?'pause':'menu';if(state==='play')state='pause';ov('how')}
  else if(a==='rec')ov('rec');
  else if(a==='hback'){if(howBack==='resume')act('resume');else ov(howBack)}
  else if(a==='menu'){commit();state='menu';hud();ov('menu')}
  else if(a==='resume'){state='play';ov(null)}
  else if(a==='snd')toggleSnd();
  else if(a==='clear'){records=[];try{localStorage.removeItem('bs-records')}catch(e){}renderRec();hud()}
}
function toggleSnd(){snd=!snd;document.querySelector('[data-a=snd]').textContent='Som: '+(snd?'ligado':'desligado');document.getElementById('bs').style.opacity=snd?1:.45}
function pause(){if(state==='play'){state='pause';ov('pause')}else if(state==='pause')act('resume')}
document.getElementById('ov').addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)act(a.dataset.a)});
document.getElementById('bp').onclick=pause;
document.getElementById('bs').onclick=toggleSnd;
document.getElementById('bh').onclick=()=>{if(state==='play'||state==='pause')act('how')};

function pt(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
function setAim(p){aim=Math.max(.14,Math.min(Math.PI-.14,Math.atan2(sy-p.y,p.x-sx)))}
cv.addEventListener('pointerdown',e=>{if(state!=='play')return;try{ac()}catch(err){}const p=pt(e);cv.setPointerCapture(e.pointerId);
  if(Math.hypot(p.x-(sx-86),p.y-(sy+8))<30){swapTap=true;swap();return}
  swapTap=false;down=true;setAim(p)});
cv.addEventListener('pointermove',e=>{if(state!=='play'||swapTap)return;if(e.pointerType==='mouse'||down)setAim(pt(e))});
cv.addEventListener('pointerup',e=>{if(state==='play'&&!swapTap&&down){setAim(pt(e));shoot()}down=false;swapTap=false});
cv.addEventListener('pointercancel',()=>{down=false});
addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'){aim=Math.min(Math.PI-.14,aim+.06);e.preventDefault()}
  else if(e.key==='ArrowRight'){aim=Math.max(.14,aim-.06);e.preventDefault()}
  else if(e.key===' '||e.key==='Enter'){if(state==='play'){shoot();e.preventDefault()}}
  else if(e.key==='x'||e.key==='X')swap();
  else if(e.key==='p'||e.key==='P'||e.key==='Escape')pause();
});
function resize(){
  const st=document.getElementById('stage'),dpr=Math.min(devicePixelRatio||1,2),s=Math.max(.3,Math.min((st.clientWidth-8)/W,(st.clientHeight-8)/H));
  cv.style.width=W*s+'px';cv.style.height=H*s+'px';cv.width=Math.round(W*s*dpr);cv.height=Math.round(H*s*dpr);
  ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0);ctx.imageSmoothingQuality='high';
  ink=getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||ink;
}
addEventListener('resize',resize);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>setTimeout(resize,50));

/* desenho */
function guide(){
  let x=sx,y=sy,vx=Math.cos(aim),vy=-Math.sin(aim);ctx.fillStyle=cur<NC?COLORS[cur][0]:ink;
  for(let i=0;i<150;i++){
    x+=vx*7;y+=vy*7;
    if(x<R){x=R;vx=-vx}else if(x>W-R){x=W-R;vx=-vx}
    if(y<R||hit(x,y))break;
    if(i>3&&i%2===0){ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(x,y,2.6,0,7);ctx.fill()}
  }
  ctx.globalAlpha=1;
}
function cannon(){
  ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.PI/2-aim);
  const g=ctx.createLinearGradient(-10,0,10,0);g.addColorStop(0,'#1d3fb8');g.addColorStop(.5,'#6f9bff');g.addColorStop(1,'#1d3fb8');
  ctx.fillStyle=g;ctx.strokeStyle='#0a1f5c';ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(-10,-52,20,42,8);ctx.fill();ctx.stroke();ctx.restore();
  const b=ctx.createRadialGradient(sx-8,sy-8,4,sx,sy,32);b.addColorStop(0,'#8fb2ff');b.addColorStop(1,'#1d3fb8');
  ctx.beginPath();ctx.arc(sx,sy+4,30,0,7);ctx.fillStyle=b;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#0a1f5c';ctx.stroke();
}
let last=performance.now();
function loop(t){
  const dt=Math.min((t-last)/1000,.033);last=t;
  if(state!=='pause'){
    if(ball&&state==='play'){
      const n=Math.ceil(V*dt/6);
      for(let i=0;i<n&&ball;i++){
        ball.x+=ball.vx*dt/n;ball.y+=ball.vy*dt/n;
        if(ball.x<R){ball.x=R;ball.vx=-ball.vx}else if(ball.x>W-R){ball.x=W-R;ball.vx=-ball.vx}
        if(ball.y<=R){ball.y=R;land()}else if(hit(ball.x,ball.y))land();
      }
    }
    fall.forEach(f=>{f.vy+=900*dt;f.y+=f.vy*dt});fall=fall.filter(f=>f.y<H+R);
    parts.forEach(p=>{p.vy+=500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    pops.forEach(p=>{p.y-=30*dt;p.l-=dt*1.1});pops=pops.filter(p=>p.l>0);
    shake=Math.max(0,shake-dt*2.5);
  }
  draw();requestAnimationFrame(loop);
}
function draw(){
  ctx.clearRect(0,0,W,H);
  if(!grid)return;
  ctx.save();if(shake)ctx.translate((Math.random()-.5)*10*shake,(Math.random()-.5)*10*shake);
  const ly=pos(LIMIT,0).y-R;
  ctx.strokeStyle='#ff3b4e';ctx.globalAlpha=.7;ctx.setLineDash([10,8]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(W,ly);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  for(let r=0;r<MAXR;r++)for(let c=0;c<rowLen(r);c++){const v=grid[r][c];if(v>=0){const p=pos(r,c);bub(p.x,p.y,v)}}
  fall.forEach(f=>bub(f.x,f.y,f.c));
  parts.forEach(p=>{ctx.globalAlpha=Math.max(p.l*2,0);ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,7);ctx.fillStyle=COLORS[p.c][0];ctx.fill()});ctx.globalAlpha=1;
  if(state==='play'&&!ball)guide();
  cannon();
  if(!ball)bub(sx,sy,cur);else bub(ball.x,ball.y,ball.c);
  // bolha reserva
  ctx.beginPath();ctx.arc(sx-86,sy+8,22,0,7);ctx.fillStyle='rgba(16,40,94,.12)';ctx.fill();
  bub(sx-86,sy+8,next,15);
  ctx.fillStyle=ink;ctx.globalAlpha=.7;ctx.font='11px "Russo One",system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('PRÓXIMA',sx-86,sy+42);
  // descida
  ctx.textAlign='right';ctx.fillText('DESCIDA',W-14,sy-6);
  for(let i=0;i<shotsMax;i++){ctx.globalAlpha=1;ctx.beginPath();ctx.arc(W-20-(shotsMax-1-i)*16,sy+14,5.5,0,7);ctx.fillStyle=i<shotsMax-miss?'#ff9a1f':'rgba(16,40,94,.22)';ctx.fill()}
  // pontos flutuantes
  ctx.textAlign='center';ctx.font='20px "Russo One",system-ui,sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#10285e';ctx.lineJoin='round';
  pops.forEach(p=>{ctx.globalAlpha=Math.min(p.l*1.6,1);ctx.strokeText(p.t,p.x,p.y);ctx.fillStyle='#fff';ctx.fillText(p.t,p.x,p.y)});
  ctx.globalAlpha=1;ctx.restore();
}
resize();hud();requestAnimationFrame(loop);
