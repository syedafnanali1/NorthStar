// North Star — Data: Quotes, GOALS model, dayLogs, intentionsStore, Circle data
// Shared globals used by all other modules

// ─── QUOTES ──────────────────────────────────────────────────
const QUOTES = [
  "You are not behind. You are not failing. You are in the most important part — the part where it's hard and you're still doing it anyway.",
  "Every master was once a beginner. Every pro was once an amateur. Every icon was once unknown. Start. Keep going.",
  "The goal is not to be perfect by the end. The goal is to be better than yesterday.",
  "You don't rise to the level of your goals. You fall to the level of your systems. Build the system first.",
  "Success is the product of daily habits — not once-in-a-lifetime transformations.",
  "Discipline is loyalty to your future self. Show up anyway.",
  "The man who moves a mountain begins by carrying away small stones.",
  "Small wins compound. Bad days don't define streaks. Patterns are what matter.",
  "The most dangerous phrase in the English language: 'I'll start tomorrow.'",
  "1% better every day × 365 days = 37× better. That is not a metaphor. That is math.",
  "Your effort today is compounding silently. Results will arrive on a schedule you didn't set.",
  "Champions don't do extraordinary things. They do ordinary things extraordinarily well.",
];
function randomQuote(){ return QUOTES[Math.floor(Math.random()*QUOTES.length)]; }

// ─── STAR PARTICLES ──────────────────────────────────────────
function initStars(){
  const c=document.getElementById('splash-stars');
  for(let i=0;i<60;i++){
    const s=document.createElement('div');
    s.className='splash-star';
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*3}s;animation-duration:${2+Math.random()*3}s`;
    const sz=Math.random()>0.85?2:1;
    s.style.width=s.style.height=sz+'px';
    c.appendChild(s);
  }
}

// ─── SPLASH CHART ────────────────────────────────────────────
function drawChart(canvasId, small=false){
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const W=canvas.offsetWidth, H=canvas.offsetHeight;
  if(!W||!H)return;
  canvas.width=W*dpr; canvas.height=H*dpr;
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);

  const N=365;
  const cpd=i=>Math.pow(1.01,i);
  const flt=i=>1+i*0.001;
  const mxY=cpd(N-1);
  const pL=52,pR=32,pT=22,pB=38;
  const tX=i=>pL+(i/(N-1))*(W-pL-pR);
  const tY=v=>H-pB-((v-1)/(mxY-1))*(H-pT-pB);

  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
  for(let g=0;g<=4;g++){const y=tY(1+(g/4)*(mxY-1));ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(W-pR,y);ctx.stroke();}

  // Flat (dashed)
  ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);
  for(let i=0;i<N;i++){const x=tX(i),y=tY(flt(i));i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();ctx.setLineDash([]);

  // Fill
  ctx.beginPath();
  for(let i=0;i<N;i++){const x=tX(i),y=tY(cpd(i));i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.lineTo(tX(N-1),tY(1));ctx.lineTo(tX(0),tY(1));ctx.closePath();
  const gf=ctx.createLinearGradient(0,pT,0,H-pB);
  gf.addColorStop(0,'rgba(196,150,58,0.32)');gf.addColorStop(1,'rgba(196,150,58,0.03)');
  ctx.fillStyle=gf;ctx.fill();

  // Line
  ctx.beginPath();ctx.strokeStyle='#C4963A';ctx.lineWidth=2.5;
  for(let i=0;i<N;i++){const x=tX(i),y=tY(cpd(i));i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();

  // Glow point
  const ex=tX(N-1),ey=tY(cpd(N-1));
  const glo=ctx.createRadialGradient(ex,ey,0,ex,ey,20);
  glo.addColorStop(0,'rgba(232,201,122,0.75)');glo.addColorStop(1,'transparent');
  ctx.fillStyle=glo;ctx.beginPath();ctx.arc(ex,ey,20,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#E8C97A';ctx.beginPath();ctx.arc(ex,ey,4.5,0,Math.PI*2);ctx.fill();

  // Labels
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font=`500 ${small?11:12}px 'DM Sans',sans-serif`;
  ctx.fillText('Day 1',pL,H-8);
  ctx.fillText('Day 365',tX(N-2)-40,H-8);
  ctx.fillText('0% — staying the same',tX(160),tY(flt(175))+18);
  ctx.fillStyle='#C4963A';ctx.font=`600 ${small?11:13}px 'DM Sans',sans-serif`;
  ctx.fillText('3641% growth',ex-88,ey-14);
}

// ─── NAV helper ──────────────────────────────────────────────
function _navSwitchOrig(v,el){
  document.querySelectorAll('.page-view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-icon').forEach(x=>x.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  if(el)el.classList.add('active');
}

// ─── MOMENTUM ────────────────────────────────────────────────
function calcMomentumScore(dayLimit){
  const today_d = Math.max(1, Math.min(22, dayLimit || 22)), today_m = 1, today_y = 2026;
  let streakCount = 0, totalDone = 0, totalTasks = 0, activeDays = 0;
  
  // Count streak
  for(let d = today_d; d >= 1; d--) {
    const log = dayLogs[today_y+'-'+today_m+'-'+d];
    if(log && (log.tasks?.length > 0 || log.note)) { streakCount++; }
    else break;
  }
  
  // Count tasks this month
  for(let d = 1; d <= today_d; d++) {
    const log = dayLogs[today_y+'-'+today_m+'-'+d];
    if(log) { activeDays++; totalDone += (log.tasks||[]).filter(t=>t.checked).length; totalTasks += (log.tasks||[]).length; }
  }
  
  // Score: streak*4 + completion_rate*40 + goal_progress*16 + active_days*2
  const completionRate = totalTasks > 0 ? totalDone/totalTasks : 0;
  const avgGoalProgress = GOALS.length ? GOALS.reduce((a,g)=>a+goalPct(g),0)/GOALS.length : 0;
  const score = Math.round(Math.min(100,
    streakCount * 3 + completionRate * 38 + avgGoalProgress * 0.2 + activeDays * 1.5
  ));
  
  return { score, streakCount, completionRate, activeDays, totalDone, totalTasks, avgGoalProgress };
}

function initMomentumBars(){
  const c=document.getElementById('momentum-bars');if(!c)return;
  c.innerHTML = '';
  const lightMode = !document.body.classList.contains('dark');
  // Generate 14-day history from dayLogs
  const vals = [];
  for(let i=13; i>=0; i--) {
    const d = 22 - i; if(d<1) { vals.push(0); continue; }
    const log = dayLogs['2026-1-'+d];
    if(!log) { vals.push(0); continue; }
    const total = (log.tasks||[]).length;
    const done = (log.tasks||[]).filter(t=>t.checked).length;
    vals.push(total > 0 ? done/total : 0.1);
  }
  const maxH = 42;
  vals.forEach((h, i) => {
    const b = document.createElement('div');
    const isToday = i === 13;
    const filled = h > 0.5;
    b.className = 'i-bar' + (isToday ? ' today' : filled ? ' filled' : '');
    const bg = lightMode
      ? (isToday ? 'var(--gold-light)' : filled ? 'var(--gold)' : 'rgba(255,255,255,0.18)')
      : (isToday ? 'var(--gold)' : filled ? 'rgba(26,23,20,0.8)' : 'rgba(26,23,20,0.2)');
    const glow = lightMode ? '0 0 10px rgba(232,201,122,0.4)' : '0 0 10px rgba(196,150,58,0.35)';
    b.style.cssText = `height:${Math.max(4, Math.round(h*maxH))}px;width:10px;border-radius:3px;background:${bg};box-shadow:${isToday?glow:'none'};transition:height 0.5s ${i*0.03}s ease;`;
    c.appendChild(b);
  });
}

function animateMomentum(){
  const stats = calcMomentumScore();
  const target = stats.score;
  const lightMode = !document.body.classList.contains('dark');
  const prevWeekScore = calcMomentumScore(22 - 7).score;
  const weekDelta = target - prevWeekScore;
  
  // Animate ring
  const ring = document.getElementById('momentum-ring-fill');
  const circ = 226.2;
  if(ring) setTimeout(() => { ring.style.strokeDashoffset = circ - (circ * target / 100); }, 200);
  
  // Animate number
  let n = 0;
  const el = document.getElementById('momentum-display');
  const go = () => { n = Math.min(n + Math.ceil(target/40), target); if(el) el.textContent = n; if(n < target) requestAnimationFrame(go); };
  setTimeout(()=>requestAnimationFrame(go), 300);
  
  // Update supporting stats
  const streak = document.getElementById('momentum-streak');
  const mActive = document.getElementById('m-active');
  const mRate = document.getElementById('m-rate');
  const mPts = document.getElementById('m-pts');
  const trend = document.getElementById('momentum-trend');
  const desc = document.getElementById('momentum-desc');
  const fire = document.getElementById('momentum-fire');
  
  if(streak) streak.textContent = stats.streakCount;
  if(mActive) mActive.textContent = GOALS.filter(g=>goalActiveInMonth(g,2026,1)).length;
  if(mRate) mRate.textContent = Math.round(stats.completionRate*100)+'%';
  if(mPts) mPts.textContent = (target > 60 ? '+' : '') + target;
  if(trend) trend.textContent = target > 70 ? '↑ Exceptional week' : target > 50 ? '↑ Strong momentum' : target > 30 ? '→ Building habits' : '↓ Time to reengage';
  if(trend && lightMode) {
    trend.textContent = weekDelta === 0
      ? '→ 0 pts from last week'
      : `${weekDelta > 0 ? '↑' : '↓'} ${weekDelta > 0 ? '+' : ''}${weekDelta} pts from last week`;
  }
  if(desc) {
    const msgs = [
      [80, "You're on fire. Keep this energy going."],
      [65, "Strong week. One missed day doesn't break a pattern."],
      [45, 'Building momentum. Every day counts.'],
      [0,  'Start today. The first step is the hardest.']
    ];
    desc.textContent = msgs.find(([t])=>target>=t)?.[1] || msgs[3][1];
  }
  if(fire) fire.style.display = stats.streakCount >= 3 ? 'flex' : 'none';
}

// ─── CONSTELLATION ───────────────────────────────────────────
let constellationRange = '30d';

function setConstellationRange(range, btn) {
  constellationRange = range;
  document.querySelectorAll('.ctf-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const labels = {'7d':'7-day','30d':'30-day','3m':'3-month','6m':'6-month','1y':'1-year'};
  const hint = document.getElementById('constellation-hint');
  const sub = document.getElementById('constellation-subtitle');
  if(hint) hint.innerHTML = labels[range]+' activity map · <span id="constellation-stats" style="color:var(--gold);opacity:0.9"></span>';
  if(sub) sub.textContent = range==='7d'?'Your last 7 days of action':range==='30d'?'Every action forms your pattern':range==='3m'?'Three months of momentum':range==='6m'?'Six months of daily discipline':'Your year in stars';
  initConstellation();
}

function getConstellationData() {
  // Build activity data from dayLogs + GOALS entries
  const now = new Date(2026, 1, 22); // today
  const rangeDays = {'7d':7,'30d':30,'3m':90,'6m':180,'1y':365}[constellationRange] || 30;
  const points = [];
  
  for(let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
    const log = dayLogs[key];
    const tasks = log?.tasks || [];
    const done = tasks.filter(t=>t.checked).length;
    const total = tasks.length;
    
    // Also count goal entries for this day
    let goalActivity = 0;
    GOALS.forEach(g => {
      if(g.entries.some(e => e.date === key)) goalActivity++;
    });
    
    const active = done > 0 || goalActivity > 0;
    const intensity = total > 0 ? done/total : (goalActivity > 0 ? 0.5 : 0);
    // Get primary goal color for this day
    const dayGoal = GOALS.find(g => g.entries.some(e => e.date === key));
    const col = dayGoal ? dayGoal.hex : (done > 0 ? '#C4963A' : null);
    
    points.push({ key, active, intensity, done, total, goalActivity, col, date: d });
  }
  return points;
}

function initConstellation(){
  const canvas=document.getElementById('constellation-canvas');if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  canvas.width=canvas.offsetWidth*dpr; canvas.height=200*dpr;
  canvas.style.height = '150px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const W=canvas.offsetWidth/dpr, H=150;
  
  const data = getConstellationData();
  const n = data.length;
  
  // Build star positions from actual data
  const stars = data.map((d, i) => {
    const x = 10 + (i / (n-1)) * (W - 20);
    // Y position: active days higher (lower Y = higher on canvas)
    const baseY = H * 0.55;
    const wave = Math.sin(i * 0.4) * 18;
    const activityBump = d.active ? -(d.intensity * 30 + 10) : 8;
    const y = Math.max(12, Math.min(H-12, baseY + wave + activityBump + (Math.random()-0.5)*8));
    const r = d.active ? 1.4 + d.intensity * 2.2 : 0.7;
    const color = d.col || '#C4963A';
    return { x, y, r, active: d.active, intensity: d.intensity, color, date: d.date, done: d.done, total: d.total };
  });

  // Draw connecting lines between consecutive active stars
  ctx.lineWidth = 0.6;
  for(let i=1; i<stars.length; i++) {
    if(stars[i].active && stars[i-1].active) {
      const grad = ctx.createLinearGradient(stars[i-1].x, stars[i-1].y, stars[i].x, stars[i].y);
      grad.addColorStop(0, stars[i-1].color+'44');
      grad.addColorStop(1, stars[i].color+'44');
      ctx.strokeStyle = grad;
      ctx.beginPath(); ctx.moveTo(stars[i-1].x, stars[i-1].y); ctx.lineTo(stars[i].x, stars[i].y); ctx.stroke();
    } else if(!stars[i].active && !stars[i-1].active) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath(); ctx.moveTo(stars[i-1].x, stars[i-1].y); ctx.lineTo(stars[i].x, stars[i].y); ctx.stroke();
    }
  }
  
  // Draw glow + stars
  stars.forEach((s, i) => {
    if(s.active && s.intensity > 0.3) {
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      grd.addColorStop(0, s.color + '66');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = s.active ? (i === stars.length-1 ? 'white' : s.color) : 'rgba(255,255,255,0.08)';
    ctx.fill();
  });
  
  // Pulse ring on latest active star
  const lastActive = [...stars].reverse().find(s => s.active);
  if(lastActive) {
    ctx.beginPath(); ctx.arc(lastActive.x, lastActive.y, lastActive.r + 4, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  }
  
  // Update stats
  const activeCount = stars.filter(s=>s.active).length;
  const statsEl = document.getElementById('constellation-stats');
  if(statsEl) statsEl.textContent = activeCount + ' active days · ' + stars.filter(s=>s.active&&s.total>0&&s.done===s.total).length + ' perfect days';
}
