// North Star — App: init, nav, compound view, constellation, momentum, circle/feed, analytics, auth, profile, export/import, toast

function showCompound(){
  document.getElementById('compound-view').classList.add('open');
  document.getElementById('compound-quote').textContent='"'+randomQuote()+'"';
  setTimeout(()=>drawChart('compound-canvas'),60);
}
function closeCompound(){document.getElementById('compound-view').classList.remove('open');}

function toggleReact(btn){
  if(btn.textContent==='Reply') return;
  btn.classList.toggle('active');
  const parts = btn.textContent.trim().split(' ');
  const em = parts[0];
  let n = parseInt(parts[1])||0;
  btn.textContent = em + ' ' + (btn.classList.contains('active') ? n+1 : Math.max(0,n-1));
}

// ─── DARK MODE ────────────────────────────────────────────────
function toggleDark(){
  const isDark = document.body.classList.toggle('dark');
  const btn = document.getElementById('dark-toggle');
  if(btn) btn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('ns_dark', isDark ? '1' : '');

  // Keep momentum card text/bars in sync with current theme mode.
  if(typeof initMomentumBars === 'function') initMomentumBars();
  if(typeof animateMomentum === 'function') animateMomentum();
  if(typeof buildCalendar === 'function') buildCalendar();
  if(typeof renderAlwaysPanel === 'function') renderAlwaysPanel(calYear, calMonth, selectedDate || TODAY_CAL.day);
}
function loadDarkMode(){
  if(localStorage.getItem('ns_dark')) {
    document.body.classList.add('dark');
    const btn = document.getElementById('dark-toggle');
    if(btn) btn.textContent = '☀️';
  }
}

// ─── SMART METRIC DETECTION ───────────────────────────────────
function detectSmartMetric(g) {
  // Scan all linked intentions for metric values matching the goal's unit
  if(!g.subs || !g.subs.length) return null;
  const patterns = {
    'km':    /(\d+(?:\.\d+)?)\s*km/i,
    'miles': /(\d+(?:\.\d+)?)\s*mile/i,
    'words': /(\d+(?:[,\d]*)?)\s*word/i,
    '$':     /\$\s*(\d+(?:[,\d]*)?)/i,
    'lbs':   /(\d+(?:\.\d+)?)\s*lb/i,
    'kg':    /(\d+(?:\.\d+)?)\s*kg/i,
    'mins':  /(\d+)\s*min/i,
    'hrs':   /(\d+(?:\.\d+)?)\s*hour/i,
    'reps':  /(\d+)\s*rep/i,
    'pages': /(\d+)\s*page/i,
    'steps': /(\d+[,\d]*)\s*step/i,
  };
  const unitKey = Object.keys(patterns).find(k => g.unit.toLowerCase().includes(k)) || g.unit.toLowerCase();
  const pattern = patterns[unitKey];
  if(!pattern) return null;
  
  for(const sub of g.subs) {
    const match = sub.text.match(pattern);
    if(match) {
      return { value: parseFloat(match[1].replace(/,/g,'')), unit: g.unit, subText: sub.text };
    }
  }
  return null;
}

function autoDetectAndLog() {
  // Called when an intention is checked — scan all goals for auto-logging
  GOALS.forEach(g => {
    const today = TODAY_KEY;
    const alreadyLogged = g.entries.some(e => e.date === today && e.autoDetected);
    if(alreadyLogged) return;
    
    const sm = detectSmartMetric(g);
    if(!sm) return;
    
    // Check if a linked sub is marked done today
    const doneSub = g.subs.find(s => {
      const key = today;
      const saved = (dayLogs[key]?.tasks||[]).find(t=>t._fromGoal===g.id && t.text===s.text);
      return (saved && saved.checked) || s.done;
    });
    
    if(doneSub) {
      // Remove any existing entry for today
      const ei = g.entries.findIndex(e=>e.date===today && !e.autoDetected);
      if(ei !== -1) return; // manual entry takes priority
      
      const alreadyAuto = g.entries.find(e=>e.date===today && e.autoDetected);
      if(alreadyAuto) return;
      
      g.current += sm.value;
      g.entries.unshift({date:today, val:sm.value, autoDetected:true});
      showToast(`🤖 Auto-logged +${fmtMetric(sm.value,g.unit)} for "${g.name}" from your intention`);
      renderGoals();
      renderCalGoalStrip();
    }
  });
}

// ─── ANALYTICS VIEW ───────────────────────────────────────────
function showAnalytics() {
  const analyticsIcon = Array.from(document.querySelectorAll('.nav-icon'))
    .find(icon => (icon.getAttribute('onclick') || '').includes("switchView('analytics'"));
  switchView('analytics', analyticsIcon || null);
  setTimeout(renderAnalytics, 60);
}

const WEEKLY_CHART_TYPES = ['bar', 'line'];
let weeklyChartTypeIndex = 0;

function changeWeeklyChart(direction) {
  weeklyChartTypeIndex = (weeklyChartTypeIndex + direction + WEEKLY_CHART_TYPES.length) % WEEKLY_CHART_TYPES.length;
  renderWeeklyActivityChart();
}

function getWeeklyActivityData(today_d = TODAY_CAL.day) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const values = [];
  const labels = [];
  for(let i = 6; i >= 0; i--) {
    const d = today_d - i;
    if(d < 1) {
      values.push(0);
      labels.push('');
      continue;
    }
    const log = dayLogs[`${TODAY_CAL.year}-${TODAY_CAL.month}-${d}`];
    const done = (log?.tasks || []).filter(t => t.checked).length;
    values.push(done);
    const dt = new Date(TODAY_CAL.year, TODAY_CAL.month, d);
    labels.push(days[dt.getDay()]);
  }
  return { values, labels, maxVal: Math.max(...values, 1) };
}

function buildSmoothLinePath(points) {
  if(points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for(let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function renderWeeklyActivityChart(today_d = TODAY_CAL.day) {
  const stage = document.getElementById('weekly-chart-stage');
  const labelsEl = document.getElementById('weekly-chart-labels');
  if(!stage) return;

  const { values, labels, maxVal } = getWeeklyActivityData(today_d);
  const chartType = WEEKLY_CHART_TYPES[weeklyChartTypeIndex];

  if(chartType === 'bar') {
    stage.className = 'weekly-chart-stage weekly-chart-bars';
    stage.innerHTML = values.map((v, i) => `
      <div class="weekly-bar-col">
        <div class="weekly-bar ${i === values.length - 1 ? 'latest' : ''}" style="height:${Math.max(4, Math.round((v / maxVal) * 58))}px" title="${v} tasks done"></div>
      </div>`).join('');
  } else {
    const points = values.map((v, i) => {
      const x = values.length === 1 ? 50 : (i * (100 / (values.length - 1)));
      const y = 56 - ((v / maxVal) * 48);
      return { x: +x.toFixed(2), y: +y.toFixed(2), v };
    });
    const smoothPath = buildSmoothLinePath(points);
    stage.className = 'weekly-chart-stage weekly-chart-line';
    stage.innerHTML = `
      <svg class="weekly-line-svg" viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label="7-day task completion line chart">
        <line class="weekly-line-grid" x1="0" y1="56" x2="100" y2="56"></line>
        <line class="weekly-line-grid" x1="0" y1="40" x2="100" y2="40"></line>
        <line class="weekly-line-grid" x1="0" y1="24" x2="100" y2="24"></line>
        <line class="weekly-line-grid" x1="0" y1="8" x2="100" y2="8"></line>
        <path class="weekly-line-path" d="${smoothPath}"></path>
        ${points.map((p, i) => `<circle class="weekly-line-point ${i === points.length - 1 ? 'latest' : ''}" cx="${p.x}" cy="${p.y}" r="${i === points.length - 1 ? 2.4 : 2}"></circle>`).join('')}
      </svg>`;
  }

  if(labelsEl) {
    labelsEl.innerHTML = labels.map(l => `<div class="weekly-day-label">${l}</div>`).join('');
  }
}

function renderAnalytics() {
  const stats = calcMomentumScore();
  const today_d = TODAY_CAL.day;
  
  // KPI grid
  const kpiGrid = document.getElementById('analytics-kpi-grid');
  if(kpiGrid) {
    const avgProgress = GOALS.length ? Math.round(GOALS.reduce((a,g)=>a+goalPct(g),0)/GOALS.length) : 0;
    const completed = GOALS.filter(g=>goalPct(g)>=100).length;
    kpiGrid.innerHTML = [
      { label:'Active Goals', val: GOALS.filter(g=>g.status!=='archived').length, sub:'Currently tracking', icon:'🎯' },
      { label:'Avg Progress', val: avgProgress+'%', sub:'Across all goals', icon:'📈' },
      { label:'Day Streak', val: stats.streakCount+'🔥', sub:'Consecutive days', icon:'⚡' },
      { label:'Momentum', val: stats.score+'/100', sub: stats.score>70?'Exceptional':'Building', icon:'🚀' },
    ].map((k,i) => `
      <div class="analytics-card" style="animation-delay:${i*0.08}s">
        <div class="ac-label">${k.icon} ${k.label}</div>
        <div class="ac-val">${k.val}</div>
        <div class="ac-sub">${k.sub}</div>
      </div>`).join('');
  }
  
  // Weekly activity chart
  renderWeeklyActivityChart(today_d);
  
  // Category breakdown
  const cbd = document.getElementById('cat-breakdown');
  if(cbd && GOALS.length) {
    const catGroups = {};
    GOALS.forEach(g => {
      if(!catGroups[g.cat]) catGroups[g.cat] = {goals:0,pct:0,hex:g.hex};
      catGroups[g.cat].goals++;
      catGroups[g.cat].pct += goalPct(g);
    });
    cbd.innerHTML = Object.entries(catGroups).map(([cat,data]) => {
      const avg = Math.round(data.pct / data.goals);
      const meta = CAT_META[cat] || CAT_META.custom;
      return `<div class="cat-breakdown-row">
        <div class="cbd-dot" style="background:${data.hex}"></div>
        <div class="cbd-name">${meta.icon} ${meta.label} (${data.goals})</div>
        <div class="cbd-bar-wrap"><div class="cbd-bar-fill" style="width:${avg}%;background:${data.hex}"></div></div>
        <div class="cbd-pct">${avg}%</div>
      </div>`;
    }).join('');
  }
  
  // Lifetime stats
  const ls = document.getElementById('lifetime-stats');
  if(ls) {
    const totalEntries = GOALS.reduce((a,g)=>a+g.entries.length,0);
    const totalStories = GOALS.reduce((a,g)=>a+g.stories.length,0);
    const totalMilestones = GOALS.reduce((a,g)=>a+g.milestones.filter(m=>m.done).length,0);
    ls.innerHTML = [
      ['Total Log Entries', totalEntries],
      ['Story Moments', totalStories],
      ['Milestones Hit', totalMilestones],
      ['Goals Planted', GOALS.length],
      ['Days Tracked', Object.keys(dayLogs).length],
      ['Tasks Completed', Object.values(dayLogs).reduce((a,l)=>a+(l.tasks||[]).filter(t=>t.checked).length,0)],
    ].map(([l,v]) => `<div class="cat-breakdown-row"><div class="cbd-name">${l}</div><div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--ink)">${v}</div></div>`).join('');
  }
  
  // Achievements
  renderAchievements();
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first_goal', icon:'⭐', name:'First Star', desc:'Plant your first goal', check:()=>GOALS.length>=1 },
  { id:'three_goals', icon:'🌟', name:'Constellation', desc:'3 active goals', check:()=>GOALS.length>=3 },
  { id:'streak_3', icon:'🔥', name:'Ignition', desc:'3-day streak', check:()=>calcMomentumScore().streakCount>=3 },
  { id:'streak_7', icon:'⚡', name:'Electric', desc:'7-day streak', check:()=>calcMomentumScore().streakCount>=7 },
  { id:'streak_14', icon:'💥', name:'Unstoppable', desc:'14-day streak', check:()=>calcMomentumScore().streakCount>=14 },
  { id:'milestone_1', icon:'🎯', name:'Bullseye', desc:'Complete a milestone', check:()=>GOALS.some(g=>g.milestones.some(m=>m.done)) },
  { id:'halfway', icon:'🏁', name:'Halfway There', desc:'50% on any goal', check:()=>GOALS.some(g=>goalPct(g)>=50) },
  { id:'goal_complete', icon:'🏆', name:'Champion', desc:'Complete a goal', check:()=>GOALS.some(g=>goalPct(g)>=100) },
  { id:'story_1', icon:'📖', name:'Storyteller', desc:'Add your first moment', check:()=>GOALS.some(g=>g.stories.length>=1) },
  { id:'circle_1', icon:'👥', name:'Accountability', desc:'Add someone to circle', check:()=>GOALS.some(g=>g.peers.length>=1) },
  { id:'high_momentum', icon:'🚀', name:'Launchpad', desc:'Momentum score 75+', check:()=>calcMomentumScore().score>=75 },
  { id:'ten_entries', icon:'📊', name:'Data Driven', desc:'Log 10 goal entries', check:()=>GOALS.reduce((a,g)=>a+g.entries.length,0)>=10 },
];

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if(!grid) return;
  const unlocked = JSON.parse(localStorage.getItem('ns_achievements')||'{}');
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const isUnlocked = unlocked[a.id] || a.check();
    if(isUnlocked && !unlocked[a.id]) {
      unlocked[a.id] = Date.now();
      localStorage.setItem('ns_achievements', JSON.stringify(unlocked));
    }
    return `<div class="badge-card ${isUnlocked?'unlocked':'locked'}" title="${a.desc}">
      <span class="badge-icon">${a.icon}</span>
      <div class="badge-name">${a.name}</div>
    </div>`;
  }).join('');
}

function checkAchievements() {
  const unlocked = JSON.parse(localStorage.getItem('ns_achievements')||'{}');
  ACHIEVEMENTS.forEach(a => {
    if(!unlocked[a.id] && a.check()) {
      unlocked[a.id] = Date.now();
      localStorage.setItem('ns_achievements', JSON.stringify(unlocked));
      showToast('🏆 Achievement unlocked: ' + a.name + '!');
    }
  });
}

// ─── GOAL FILTER / SEARCH ─────────────────────────────────────
let goalFilter = 'all';
function setGoalFilter(cat, btn) {
  goalFilter = cat;
  document.querySelectorAll('.gf-pill').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  filterGoals();
}

function filterGoals() {
  const query = (document.getElementById('goal-search')?.value||'').toLowerCase().trim();
  const countEl = document.getElementById('search-result-count');
  const sectionLbl = document.getElementById('goals-section-label');
  
  const cards = document.querySelectorAll('.goal-card');
  let visible = 0;
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    const g = GOALS.find(g=>g.id===id);
    if(!g) return;
    
    const catMatch = goalFilter === 'all' || g.cat === goalFilter;
    const textMatch = !query ||
      g.name.toLowerCase().includes(query) ||
      g.why.toLowerCase().includes(query) ||
      g.cat.toLowerCase().includes(query) ||
      g.subs.some(s=>s.text.toLowerCase().includes(query));
    
    const show = catMatch && textMatch;
    card.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  
  if(query || goalFilter !== 'all') {
    if(countEl) { countEl.textContent = visible + ' result' + (visible!==1?'s':''); countEl.style.display='block'; }
    if(sectionLbl) sectionLbl.textContent = visible + ' Goal' + (visible!==1?'s':'');
  } else {
    if(countEl) countEl.style.display = 'none';
    if(sectionLbl) sectionLbl.textContent = 'Active Goals';
  }
}

// ─── ADD A MOMENT MODAL ───────────────────────────────────────
let _momentGoalId = null;

function openMomentModal(goalId, e) {
  if(e) e.stopPropagation();
  _momentGoalId = goalId;
  const g = GOALS.find(g=>g.id===goalId);
  const sub = document.getElementById('moment-modal-sub');
  const authorLbl = document.getElementById('moment-author-lbl');
  if(sub && g) sub.textContent = 'Capture a reflection for "' + g.name + '". What happened? How did it feel?';
  if(authorLbl) authorLbl.textContent = g?.peers?.length ? '💬 This moment will also be visible to your accountability circle (' + g.peers.join(', ') + ')' : '';
  document.getElementById('moment-text').value = '';
  document.getElementById('moment-word-count').textContent = '0 / 100 words';
  document.getElementById('moment-modal-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('moment-text').focus(), 200);
}

function checkMomentWords() {
  const text = document.getElementById('moment-text').value;
  const words = text.trim().split(/\s+/).filter(w=>w).length;
  const countEl = document.getElementById('moment-word-count');
  if(countEl) {
    countEl.textContent = words + ' / 100 words';
    countEl.className = 'moment-word-count' + (words > 100 ? ' over' : '');
  }
  if(words > 100) {
    // Trim to 100 words
    const trimmed = text.trim().split(/\s+/).slice(0,100).join(' ');
    // Don't auto-trim yet, just warn
  }
}

function saveMoment() {
  if(!_momentGoalId) return;
  const text = document.getElementById('moment-text').value.trim();
  if(!text) { showToast('Write something first!'); return; }
  const words = text.split(/\s+/).filter(w=>w).length;
  if(words > 100) { showToast('Please keep it under 100 words (' + words + ' used)'); return; }
  
  const g = GOALS.find(g=>g.id===_momentGoalId);
  if(!g) return;
  
  const now = new Date(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
  const dateStr = now.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  g.stories.unshift({ date: dateStr, text: '"' + text + '"' });
  
  // Update the stories container in the card
  const storiesEl = document.getElementById('stories-' + _momentGoalId);
  if(storiesEl) {
    const newEntry = document.createElement('div');
    newEntry.className = 'story-entry';
    newEntry.innerHTML = '<div class="story-dot" style="background:' + g.hex + '"></div><div><div class="story-date">' + dateStr + '</div><div class="story-text">"' + text + '"</div></div>';
    storiesEl.insertBefore(newEntry, storiesEl.firstChild);
  }
  
  closeMomentModal();
  checkAchievements();
  showToast('📝 Moment saved to your story thread ✓');
}

function closeMomentModal() {
  document.getElementById('moment-modal-overlay').classList.remove('open');
  _momentGoalId = null;
}

// ─── ADD PEER MODAL ───────────────────────────────────────────
let _peerGoalId = null;
let _selectedPeers = new Set();

const CIRCLE_PEOPLE = [
  { id:'SM', name:'Sarah M.', detail:'22🔥 streak · Running', col:'var(--sage)' },
  { id:'TK', name:'Tom K.',   detail:'18🔥 streak · Fitness', col:'var(--rose)' },
  { id:'MR', name:'Maya R.',  detail:'31🔥 streak · Writing', col:'var(--sky)' },
  { id:'PD', name:'Priya D.', detail:'14🔥 streak · Finance', col:'#7B6FA0' },
  { id:'JW', name:'James W.', detail:'28🔥 streak · General', col:'#5DAD82' },
];

function openPeerModal(goalId, e) {
  if(e) e.stopPropagation();
  _peerGoalId = goalId;
  const g = GOALS.find(g=>g.id===goalId);
  _selectedPeers = new Set(g?.peers||[]);
  
  const sub = document.getElementById('peer-modal-sub');
  if(sub && g) sub.textContent = 'Share "' + g.name + '" with your accountability circle.';
  
  const list = document.getElementById('peer-options-list');
  if(list) {
    list.innerHTML = CIRCLE_PEOPLE.map(p => `
      <div class="peer-option${_selectedPeers.has(p.id)?' selected':''}" onclick="togglePeerSelection('${p.id}',this)">
        <div class="po-av" style="background:${p.col}">${p.id}</div>
        <div><div class="po-name">${p.name}</div><div class="po-detail">${p.detail}</div></div>
        <div style="margin-left:auto;font-size:16px;transition:all 0.2s">${_selectedPeers.has(p.id)?'✓':''}</div>
      </div>`).join('');
  }
  document.getElementById('peer-modal-overlay').classList.add('open');
}

function togglePeerSelection(id, el) {
  if(_selectedPeers.has(id)) { _selectedPeers.delete(id); el.classList.remove('selected'); el.querySelector('div:last-child').textContent=''; }
  else { _selectedPeers.add(id); el.classList.add('selected'); el.querySelector('div:last-child').textContent='✓'; }
}

function savePeerModal() {
  if(!_peerGoalId) return;
  const g = GOALS.find(g=>g.id===_peerGoalId);
  if(!g) return;
  g.peers = [..._selectedPeers];
  closePeerModal();
  renderGoals();
  checkAchievements();
  showToast('👥 Circle updated for "' + g.name + '" ✓');
}

function sendPeerInvite() {
  const email = document.getElementById('peer-invite-email').value.trim();
  if(!email || !email.includes('@')) { showToast('Enter a valid email'); return; }
  document.getElementById('peer-invite-email').value = '';
  showToast('📨 Invite sent to ' + email + ' (demo mode)');
}

function closePeerModal() {
  document.getElementById('peer-modal-overlay').classList.remove('open');
  _peerGoalId = null; _selectedPeers = new Set();
}

// ─── PROFILE ──────────────────────────────────────────────────
let USER_PROFILE = { name:'Jordan Lee', email:'jordan@example.com', age:'', location:'', bio:'', avatar:'' };

function loadProfile() {
  const saved = localStorage.getItem('ns_profile');
  if(saved) try{ USER_PROFILE = JSON.parse(saved); }catch(e){}
  updateProfileUI();
}

function updateProfileUI() {
  const av = document.getElementById('user-avatar');
  if(av) {
    if(USER_PROFILE.avatar) {
      av.innerHTML = '<img src="'+USER_PROFILE.avatar+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
    } else {
      const initials = (USER_PROFILE.name||'JL').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      av.textContent = initials;
    }
  }
}

function openProfile() {
  document.getElementById('profile-name').value = USER_PROFILE.name || '';
  document.getElementById('profile-email').value = USER_PROFILE.email || '';
  document.getElementById('profile-age').value = USER_PROFILE.age || '';
  document.getElementById('profile-location').value = USER_PROFILE.location || '';
  document.getElementById('profile-bio').value = USER_PROFILE.bio || '';
  
  const img = document.getElementById('profile-avatar-img');
  const em = document.getElementById('profile-avatar-emoji');
  if(USER_PROFILE.avatar) { img.src = USER_PROFILE.avatar; img.style.display='block'; em.style.display='none'; }
  else { img.style.display='none'; em.style.display='block'; }
  
  document.getElementById('profile-modal-overlay').classList.add('open');
}

function closeProfile() { document.getElementById('profile-modal-overlay').classList.remove('open'); }

function saveProfile() {
  USER_PROFILE.name = document.getElementById('profile-name').value.trim();
  USER_PROFILE.email = document.getElementById('profile-email').value.trim();
  USER_PROFILE.age = document.getElementById('profile-age').value;
  USER_PROFILE.location = document.getElementById('profile-location').value.trim();
  USER_PROFILE.bio = document.getElementById('profile-bio').value.trim();
  localStorage.setItem('ns_profile', JSON.stringify(USER_PROFILE));
  updateProfileUI();
  closeProfile();
  showToast('✓ Profile saved');
}

function uploadAvatar(input) {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    USER_PROFILE.avatar = e.target.result;
    const img = document.getElementById('profile-avatar-img');
    const em = document.getElementById('profile-avatar-emoji');
    if(img) { img.src = e.target.result; img.style.display='block'; }
    if(em) em.style.display = 'none';
    localStorage.setItem('ns_profile', JSON.stringify(USER_PROFILE));
    updateProfileUI();
    showToast('📷 Photo updated ✓');
  };
  reader.readAsDataURL(file);
}

// ─── AUTH ─────────────────────────────────────────────────────
let _authMode = 'login'; // 'login' | 'signup'

function toggleAuthMode() {
  _authMode = _authMode === 'login' ? 'signup' : 'login';
  document.getElementById('auth-title').textContent = _authMode === 'signup' ? 'Create account.' : 'Welcome back.';
  document.getElementById('auth-sub').textContent = _authMode === 'signup' ? 'Start your North Star journey.' : 'Sign in to continue your journey.';
  document.getElementById('auth-submit-btn').textContent = _authMode === 'signup' ? 'Create Account →' : 'Sign In →';
}

function authSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if(!email || !email.includes('@')) { showToast('Enter a valid email'); return; }
  if(!password || password.length < 6) { showToast('Password must be 6+ characters'); return; }
  USER_PROFILE.email = email;
  USER_PROFILE.name = email.split('@')[0].replace(/[._]/g,' ').replace(/\w/g,c=>c.toUpperCase());
  localStorage.setItem('ns_auth', JSON.stringify({email, loggedIn:true}));
  localStorage.setItem('ns_profile', JSON.stringify(USER_PROFILE));
  updateProfileUI();
  dismissAuth();
  showToast(_authMode==='signup' ? '🌟 Account created! Welcome.' : '✓ Welcome back!');
}

function authOAuth(provider) {
  // Demo mode — simulate OAuth
  const profiles = {
    google: {name:'Demo User', email:'demo@gmail.com', avatar:''},
    facebook: {name:'Demo User', email:'demo@facebook.com', avatar:''},
  };
  Object.assign(USER_PROFILE, profiles[provider]);
  localStorage.setItem('ns_profile', JSON.stringify(USER_PROFILE));
  localStorage.setItem('ns_auth', JSON.stringify({email:USER_PROFILE.email, provider, loggedIn:true}));
  updateProfileUI();
  dismissAuth();
  showToast('✓ Signed in with ' + (provider==='google'?'Google':'Facebook') + ' (demo mode)');
}

function skipAuth() { dismissAuth(); }

function dismissAuth() {
  const screen = document.getElementById('auth-screen');
  if(screen) { screen.style.opacity = '0'; setTimeout(()=>screen.classList.add('gone'), 500); }
}

function checkAuth() {
  const auth = localStorage.getItem('ns_auth');
  if(auth) { dismissAuth(); }
  // If not logged in, show auth screen (already visible by default)
}

// ─── EXPORT / IMPORT ──────────────────────────────────────────
function exportData() {
  const data = {
    version: '3.0',
    exported: new Date().toISOString(),
    user: USER_PROFILE,
    goals: GOALS,
    dayLogs: dayLogs,
    intentionsStore: intentionsStore,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'northstar-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📤 Goals exported as JSON backup ✓');
}

function importData(input) {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if(!data.goals || !Array.isArray(data.goals)) throw new Error('Invalid format');
      
      // Merge imported goals (avoid duplicates by id)
      const existingIds = new Set(GOALS.map(g=>g.id));
      let added = 0;
      data.goals.forEach(g => {
        if(!existingIds.has(g.id)) { GOALS.push(g); added++; }
      });
      
      if(data.dayLogs) Object.assign(dayLogs, data.dayLogs);
      
      renderGoals();
      buildCalendar();
      renderCalGoalStrip();
      renderAlwaysPanel();
      showToast('📥 Imported ' + added + ' goals successfully ✓');
    } catch(err) {
      showToast('❌ Import failed — invalid file format');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ═══════════════════════════════════════════════════════════
// INIT — runs after ALL scripts are loaded (app.js is last)
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  loadDarkMode();
  loadProfile();
  checkAuth();

  // Splash setup
  initStars();
  const splashQ = document.getElementById('splash-quote');
  if(splashQ) splashQ.textContent = '"' + randomQuote() + '"';
  setTimeout(() => drawChart('splash-canvas'), 100);

  // Dismiss splash after 3.6s
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if(splash) {
      splash.classList.add('fade-out');
      const app = document.getElementById('main-app');
      if(app) app.style.opacity = '1';
      setTimeout(() => splash.classList.add('gone'), 950);
    }
  }, 3600);

  // Render all sections
  initMomentumBars();
  animateMomentum();
  initConstellation();
  renderGoals();
  renderCalGoalStrip();
  syncIntentionsToCalendar();
  setTimeout(checkAchievements, 500);

  // Auto-select today on calendar
  setTimeout(() => {
    if(typeof selectTodayOnCalendar === 'function'){
      selectTodayOnCalendar(true);
      return;
    }
    const grid = document.getElementById('cal-grid');
    if(!grid) return;
    const cells = grid.querySelectorAll('.cal-cell:not(.other-month)');
    if(cells[TODAY_CAL.day - 1]) cells[TODAY_CAL.day - 1].click();
  }, 300);
});
