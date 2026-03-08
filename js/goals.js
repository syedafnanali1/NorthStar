// North Star — Goals: renderGoals, logMetric, modal, smart metric detection, achievements

const CAT_META = {
  health:  { label:'Health & Fitness',   icon:'🏃', hex:'#6B8C7A' },
  finance: { label:'Finance',            icon:'💰', hex:'#5B7EA6' },
  writing: { label:'Writing & Creative', icon:'✍️', hex:'#C4963A' },
  body:    { label:'Body Composition',   icon:'⚖️', hex:'#B5705B' },
  mindset: { label:'Mindset & Learning', icon:'🧠', hex:'#7B6FA0' },
  custom:  { label:'Custom',             icon:'⭐', hex:'#8C857D' },
};

// Goals store — rich objects
let GOALS = [
  {
    id:'g1', name:'Run a Marathon',
    why:'"To prove to myself I can do hard things."',
    cat:'health', hex:'#C4963A',
    target:650, current:422, unit:'km',
    startDate:'2026-01-01', endDate:'2026-04-10',
    milestones:[{l:'5K',done:true},{l:'10K',done:true},{l:'Half Marathon',done:true},{l:'30K Long Run',done:false},{l:'Race Day',done:false}],
    subs:[
      {id:'g1s1', text:'10km morning run — easy pace', done:false},
      {id:'g1s2', text:'Post-run stretch 10 min',       done:false},
    ],
    entries:[
      {date:'2026-1-22',val:10},{date:'2026-1-19',val:28},{date:'2026-1-18',val:10},
      {date:'2026-1-15',val:12},{date:'2026-1-12',val:8},{date:'2026-1-9',val:14},
    ],
    stories:[
      {date:'Feb 19',text:'"Completed my first 28km run. Legs were dead but mind was electric."'},
      {date:'Feb 12',text:'"Skipped Tuesday. Back Thursday. That\'s the version of me I want to be."'},
    ],
    peers:['SM','TK'],
  },
  {
    id:'g2', name:'Write My First Novel',
    why:'"The story in me deserves to exist in the world."',
    cat:'writing', hex:'#6B8C7A',
    target:80000, current:28400, unit:'words',
    startDate:'2025-11-01', endDate:'2026-07-31',
    milestones:[{l:'Outline',done:true},{l:'Ch. 1–5',done:true},{l:'Midpoint',done:false},{l:'First Draft',done:false}],
    subs:[
      {id:'g2s1', text:'Write 700 words before lunch',   done:false},
      {id:'g2s2', text:'Read 20 mins for craft research', done:false},
    ],
    entries:[
      {date:'2026-1-22',val:700},{date:'2026-1-20',val:700},{date:'2026-1-19',val:650},
      {date:'2026-1-18',val:800},{date:'2026-1-15',val:600},
    ],
    stories:[
      {date:'Feb 20',text:'"Chapter 12 surprised me. The character said something I didn\'t plan — and it was better."'},
    ],
    peers:['MR'],
  },
  {
    id:'g3', name:'Save $20,000',
    why:'"Freedom. Options. The ability to say yes to what matters."',
    cat:'finance', hex:'#5B7EA6',
    target:20000, current:16200, unit:'$',
    startDate:'2024-01-01', endDate:'2026-06-30',
    milestones:[{l:'$5K',done:true},{l:'$10K',done:true},{l:'$15K',done:true},{l:'$20K 🎯',done:false}],
    subs:[
      {id:'g3s1', text:'Transfer $300 to savings account', done:false},
    ],
    entries:[
      {date:'2026-1-22',val:300},{date:'2026-1-15',val:300},{date:'2026-1-8',val:300},
    ],
    stories:[
      {date:'Feb 01',text:'"Hit $15K. Three years ago I couldn\'t save $100. Today I have a cushion past-me would be speechless about."'},
    ],
    peers:[],
  },
];

// ── Helpers ──────────────────────────────────────────────────
function goalPct(g){ return Math.min(100, Math.round(g.current / g.target * 100)); }

function fmtMetric(val, unit){
  if(!val && val!==0) return '—';
  if(unit==='$') return '$'+val.toLocaleString();
  return val.toLocaleString()+' '+unit;
}

function normalizeMetricUnit(raw){
  const u = (raw || '').toString().trim().toLowerCase();
  if(!u) return '';
  if(u === '$' || u.includes('usd') || u.includes('dollar')) return '$';
  if(u === 'km' || u.startsWith('kilometer')) return 'km';
  if(u === 'mi' || u.startsWith('mile')) return 'miles';
  if(u.startsWith('word')) return 'words';
  if(u === 'pg' || u === 'pgs' || u.startsWith('page')) return 'pages';
  if(u.startsWith('min')) return 'mins';
  if(u.startsWith('hr') || u.startsWith('hour')) return 'hrs';
  if(u === 'kg' || u.startsWith('kilogram')) return 'kg';
  if(u === 'lb' || u === 'lbs' || u.startsWith('pound')) return 'lbs';
  if(u.startsWith('rep')) return 'reps';
  if(u.startsWith('step')) return 'steps';
  if(u === 'unit' || u === 'units') return 'units';
  return u;
}

function parseMetricFromText(text){
  if(!text) return null;
  const cash = text.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if(cash){
    const value = parseFloat(cash[1].replace(/,/g, ''));
    return Number.isFinite(value) ? { value, unit:'$' } : null;
  }
  const m = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(km|kilometers?|mi|miles?|words?|pages?|pgs?|pg|mins?|minutes?|hrs?|hours?|kg|kgs?|lb|lbs?|reps?|steps?)/i);
  if(!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ''));
  if(!Number.isFinite(value)) return null;
  return { value, unit: normalizeMetricUnit(m[2]) };
}

function inferGoalUnitFromSubs(subs){
  if(!Array.isArray(subs)) return '';
  for(const s of subs){
    const parsed = parseMetricFromText(s?.text || '');
    if(parsed?.unit) return parsed.unit;
  }
  return '';
}

function goalSubMetric(g, sub){
  const parsed = parseMetricFromText(sub?.text || '');
  if(!parsed) return null;
  const goalUnit = normalizeMetricUnit(g?.unit);
  if(goalUnit && goalUnit !== 'units' && goalUnit !== parsed.unit) return null;
  return parsed;
}

function getGoalAutoMetricSpec(g){
  if(!g?.subs?.length) return null;
  for(const s of g.subs){
    const metric = goalSubMetric(g, s);
    if(metric){
      return { subId: s.id, subText: s.text, value: metric.value, unit: metric.unit };
    }
  }
  return null;
}

function goalUsesAutoTracking(g){
  return !!getGoalAutoMetricSpec(g);
}

function applyAutoMetricForGoalSub(goalId, subId, isDone, yr, mo, dy){
  const g = GOALS.find(x=>x.id===goalId); if(!g) return false;
  const s = g.subs.find(x=>x.id===subId); if(!s) return false;
  const metric = goalSubMetric(g, s);
  if(!metric) return false;

  const key = `${yr}-${mo}-${dy}`;
  const source = `sub:${subId}`;
  const idx = g.entries.findIndex(e => e.date===key && e.auto===true && e.source===source);

  if(isDone){
    if(idx === -1){
      if(g.entries.some(e => e.date===key && !e.auto)) return false;
      g.current += metric.value;
      g.entries.unshift({ date:key, val:metric.value, auto:true, source });
      return true;
    }
    if(g.entries[idx].val !== metric.value){
      g.current += (metric.value - g.entries[idx].val);
      g.entries[idx].val = metric.value;
      return true;
    }
    return false;
  }

  if(idx !== -1){
    g.current = Math.max(0, g.current - g.entries[idx].val);
    g.entries.splice(idx, 1);
    return true;
  }
  return false;
}

function applyAutoMetricForIntentionText(text, isDone, yr, mo, dy){
  if(!text) return false;
  const target = text.trim().toLowerCase();
  let changed = false;
  GOALS.forEach(g => {
    if(!goalActiveOnDay(g, yr, mo, dy)) return;
    g.subs.forEach(s => {
      const subText = (s.text || '').trim().toLowerCase();
      if(!(subText===target || subText.includes(target) || target.includes(subText))) return;
      changed = applyAutoMetricForGoalSub(g.id, s.id, isDone, yr, mo, dy) || changed;
    });
  });
  return changed;
}

function goalActiveInMonth(g, yr, mo){
  // Returns true if goal's timeframe overlaps with given year/month
  const mStart = new Date(yr, mo, 1);
  const mEnd   = new Date(yr, mo+1, 0);
  const gS = g.startDate ? new Date(g.startDate) : new Date('1970-01-01');
  const gE = g.endDate   ? new Date(g.endDate)   : new Date('2099-12-31');
  return gS <= mEnd && gE >= mStart;
}

function goalTodayEntry(g){ return g.entries.find(e => e.date === `${calYear}-${calMonth}-${selectedDate||TODAY_CAL.day}`); }

// ── Render Goals View ─────────────────────────────────────────
function renderGoals(){
  const c = document.getElementById('goals-container');
  if(!c) return;
  c.innerHTML = '';
  GOALS.forEach((g, idx) => {
    const pct = goalPct(g);
    const circ = 138.2;
    const offset = circ - (circ * pct / 100);
    const cat = CAT_META[g.cat] || CAT_META.custom;
    const tfLabel = (g.startDate && g.endDate)
      ? new Date(g.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})
        + ' → '
        + new Date(g.endDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : '';

    const milestoneHTML = g.milestones.map((m,mi) =>
      `<div class="milestone-chip${m.done?' done':''}" onclick="completeMilestone(event,this,'${g.id}',${mi})">${m.l}</div>`
    ).join('');

    const recentEntries = g.entries.slice(0,3).map(e =>
      `<div class="metric-entry"><span class="metric-entry-date">${e.date.split('-').slice(1).join('/')}</span><span class="metric-entry-val">+${fmtMetric(e.val,g.unit)}</span></div>`
    ).join('') || '<div style="font-size:11px;color:var(--ink-muted);font-style:italic">No entries yet</div>';

    const subsHTML = g.subs.map(s =>
      `<div class="goal-sub-item${s.done?' sub-done':''}" onclick="toggleGoalSub('${g.id}','${s.id}',this)">
        <div class="sub-chk">${s.done?'✓':''}</div>
        <div class="sub-txt">${s.text}</div>
        <span class="sub-daily-tag">📅 Daily</span>
      </div>`
    ).join('');

    const storiesHTML = g.stories.map(s =>
      `<div class="story-entry"><div class="story-dot" style="background:${g.hex}"></div><div><div class="story-date">${s.date}</div><div class="story-text">${s.text}</div></div></div>`
    ).join('');

    const peersHTML = g.peers.map(p => {
      const colors = {SM:'var(--sage)',TK:'var(--rose)',MR:'var(--sky)',PD:'#7B6FA0'};
      return `<div class="peer-avatar" style="background:${colors[p]||'var(--gold)'}">${p}</div>`;
    }).join('');

    const card = document.createElement('div');
    // Map to CSS class or use inline custom property for the colored side bar
    const colorClass = {health:'color-sage',finance:'color-sky',writing:'color-gold',body:'color-rose',mindset:'color-violet',custom:''}[g.cat]||'';
    card.className = 'goal-card' + (colorClass?' '+colorClass:'');
    card.style.cssText = `--goal-color:${g.hex};animation-delay:${idx*0.07}s`;
    // Override the ::before with the specific hex via CSS custom property
    card.style.setProperty('--goal-color', g.hex);
    card.setAttribute('data-id', g.id);
    card.innerHTML = `
      <div class="goal-top" onclick="toggleGoal(this.closest('.goal-card'))">
        <div>
          <div class="goal-category">
            <span class="category-dot" style="background:${g.hex}"></span>
            ${cat.icon} ${cat.label}
          </div>
          <div class="goal-name">${g.name}</div>
          <div class="goal-why">${g.why}</div>
          ${tfLabel ? `<div class="goal-timeframe">📅 ${tfLabel}</div>` : ''}
        </div>
        <div class="goal-right">
          <div class="ring-container">
            <svg viewBox="0 0 56 56">
              <circle class="ring-bg" cx="28" cy="28" r="22"/>
              <circle class="ring-fill" cx="28" cy="28" r="22" stroke="${g.hex}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="ring-text">${pct}%</div>
          </div>
        </div>
      </div>
      <div class="progress-row" onclick="toggleGoal(this.closest('.goal-card'))">
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%;background:${g.hex}"></div></div>
        <div class="progress-label">${fmtMetric(g.current,g.unit)} / ${fmtMetric(g.target,g.unit)}</div>
      </div>
      <div class="milestones" onclick="event.stopPropagation()">${milestoneHTML}</div>
      <div class="goal-detail">

        <!-- Metric progress block with inline logging -->
        <div class="metric-block">
          <div class="metric-hdr">
            <div>
              <div class="metric-lbl">Total Progress</div>
              <div><span class="metric-big">${fmtMetric(g.current,g.unit)}</span> <span class="metric-unit">of ${fmtMetric(g.target,g.unit)}</span></div>
            </div>
            <div>
              ${(() => {
                const auto = getGoalAutoMetricSpec(g);
                if(auto) {
                  return `<div class="smart-detected"><span class="smart-detected-icon">🤖</span> Auto-tracked from intentions (+${fmtMetric(auto.value, auto.unit)} per completion).</div>`;
                }
                return `<div><div class="metric-lbl" style="text-align:right">Log Today</div><div class="metric-log-row"><input class="metric-num-input" type="number" min="0" placeholder="0" id="mi-${g.id}"><span class="metric-unit">${g.unit}</span><button class="metric-log-btn" onclick="logMetric('${g.id}');event.stopPropagation()">+ Log</button></div></div>`;
              })()}
            </div>
          </div>
          <div class="metric-history">${recentEntries}</div>
        </div>

        <!-- Linked daily sub-tasks/intentions -->
        <div class="goal-subs" onclick="event.stopPropagation()">
          <div class="goal-subs-hdr">
            <span>Linked Daily Intentions</span>
            <button class="sub-add-inline-btn" onclick="showSubAdder('${g.id}',this)">+ Add task</button>
          </div>
          <div id="subs-${g.id}">${subsHTML}</div>
          <div id="sub-adder-${g.id}" style="display:none">
            <div class="sub-inline-add-row">
              <input class="sub-inline-input" type="text" placeholder="e.g. 10km morning run" id="sub-input-${g.id}" onkeydown="if(event.key==='Enter')saveSubAdder('${g.id}')">
              <button class="sub-inline-save" onclick="saveSubAdder('${g.id}')">Save</button>
            </div>
          </div>
        </div>

        <!-- Story thread -->
        <div class="story-thread">
          <div class="story-label">📝 Your Story Thread</div>
          <div id="stories-${g.id}">${storiesHTML}</div>
          <button class="add-story-btn" onclick="openMomentModal('${g.id}',event)">+ Add a moment</button>
        </div>

        <div class="accountability-row">
          <div class="accountability-label" style="display:flex;align-items:center;gap:8px">
            Accountability Circle
            ${g.peers.length ? `<span style="font-size:10px;font-family:'DM Mono',monospace;color:var(--ink-muted)">${g.peers.length} member${g.peers.length>1?'s':''}</span>` : ''}
          </div>
          <div class="peer-avatars">${peersHTML}<div class="peer-avatar add-peer" onclick="openPeerModal('${g.id}',event)" title="Add someone to your circle">+</div></div>
        </div>
      </div>`;
    c.appendChild(card);
  });
}

function rerenderGoalsKeepExpanded(goalId){
  const keepId = goalId || document.querySelector('.goal-card.expanded')?.getAttribute('data-id');
  renderGoals();
  if(!keepId) return;
  const card = document.querySelector(`.goal-card[data-id="${keepId}"]`);
  if(card) card.classList.add('expanded');
}

function toggleGoal(card){
  const was = card.classList.contains('expanded');
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('expanded'));
  if(!was) card.classList.add('expanded');
}

function completeMilestone(e, chip, goalId, mi){
  e.stopPropagation();
  chip.classList.add('done');
  const g = GOALS.find(g=>g.id===goalId);
  if(g && g.milestones[mi]) g.milestones[mi].done = true;
  showToast('🎯 Milestone unlocked!');
}

function toggleGoalSub(goalId, subId, el){
  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  const s = g.subs.find(s=>s.id===subId); if(!s) return;
  s.done = !s.done;
  el.classList.toggle('sub-done');
  el.querySelector('.sub-chk').textContent = s.done ? '?' : '';
  const autoChanged = applyAutoMetricForGoalSub(goalId, subId, s.done, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
  setPersonalIntentionCheckedByText(s.text, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day, s.done);
  syncIntentionsToCalendar();
  renderAlwaysPanel();
  if(autoChanged) rerenderGoalsKeepExpanded(goalId);
  if(s.done) showToast('? Intention complete. Linked to calendar.');
}

function showSubAdder(goalId, btn){
  const a = document.getElementById('sub-adder-'+goalId);
  if(!a) return;
  a.style.display = 'block';
  const inp = document.getElementById('sub-input-'+goalId);
  if(inp) inp.focus();
  btn.style.display = 'none';
}

function saveSubAdder(goalId){
  const inp = document.getElementById('sub-input-'+goalId);
  if(!inp) return;
  const text = inp.value.trim(); if(!text) return;
  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  const sub = {id:'gs'+Date.now(), text, done:false};
  g.subs.push(sub);
  const inferredUnit = inferGoalUnitFromSubs(g.subs);
  if((!g.unit || normalizeMetricUnit(g.unit)==='units') && inferredUnit){
    g.unit = inferredUnit;
  }
  const cont = document.getElementById('subs-'+goalId);
  if(cont){
    const item = document.createElement('div');
    item.className = 'goal-sub-item';
    item.innerHTML = `<div class="sub-chk"></div><div class="sub-txt">${text}</div><span class="sub-daily-tag">📅 Daily</span>`;
    item.onclick = ()=>toggleGoalSub(goalId, sub.id, item);
    cont.appendChild(item);
  }
  document.getElementById('sub-adder-'+goalId).style.display = 'none';
  syncIntentionsToCalendar();
  renderAlwaysPanel();
  showToast(`Task linked to "${g.name}" & appears on calendar ✓`);
}

// ── Log metric from goal card ─────────────────────────────────
function logMetric(goalId){
  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  if(goalUsesAutoTracking(g)){ showToast('This goal is auto-tracked from linked intentions.'); return; }
  const inp = document.getElementById('mi-'+goalId); if(!inp) return;
  const val = parseFloat(inp.value);
  if(!val||val<=0){ showToast('Enter a value first.'); return; }
  const today = TODAY_KEY;
  g.current += val;
  g.entries.unshift({date:today, val});
  inp.value = '';
  renderGoals();
  renderCalGoalStrip();
  buildCalendar();
  showToast(`+${fmtMetric(val,g.unit)} logged for "${g.name}" ✓`);
}

// ── Log metric from daily log panel ──────────────────────────
function logDayMetric(goalId, key){
  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  if(goalUsesAutoTracking(g)){ showToast('This goal is auto-tracked from linked intentions.'); return; }
  const inp = document.getElementById('lgr-'+goalId); if(!inp) return;
  const val = parseFloat(inp.value);
  if(!val||val<=0){ showToast('Enter a value first.'); return; }
  // Overwrite existing entry for this day
  const ei = g.entries.findIndex(e=>e.date===key);
  if(ei !== -1){ g.current -= g.entries[ei].val; g.entries.splice(ei,1); }
  g.current += val;
  g.entries.unshift({date:key, val});
  inp.value = '';
  // Show logged indicator
  const lbl = document.getElementById('lgr-lbl-'+goalId);
  if(lbl){ lbl.textContent = `✓ ${fmtMetric(val,g.unit)} logged`; lbl.style.display='block'; }
  renderGoals();
  renderCalGoalStrip();
  buildCalendar();
  renderAlwaysPanel();
  showToast(`+${fmtMetric(val,g.unit)} logged toward "${g.name}" ✓`);
}

// ── Calendar goal strip ───────────────────────────────────────
function renderCalGoalStrip(){
  const strip = document.getElementById('cal-goals-strip'); if(!strip) return;
  const panel = strip.closest('.cal-filters-panel');
  const active = GOALS.filter(g => goalActiveInMonth(g, calYear, calMonth));

  if(!active.length){
    if(panel) panel.classList.remove('with-goal-label');
    strip.innerHTML = '<span style="font-size:11px;color:var(--ink-muted);font-style:italic">No goals active this month</span>';
    // Reset cat bar
    const bar = document.getElementById('cal-cat-bar');
    if(bar) bar.innerHTML = '<div class="cal-cat-pill active" data-cat="all" onclick="calSetCat(\'all\',this)">All</div>';
    return;
  }

  if(panel) panel.classList.add('with-goal-label');
  strip.innerHTML = '<span class="cgp-label">Active this month:</span>';
  const bar = document.getElementById('cal-cat-bar');
  if(bar) bar.innerHTML = '<div class="cal-cat-pill active" data-cat="all" onclick="calSetCat(\'all\',this)">All</div>';

  active.forEach(g => {
    const pct = goalPct(g);
    const cat = CAT_META[g.cat]||CAT_META.custom;
    const pill = document.createElement('div');
    pill.className = 'cal-goal-pill';
    pill.style.cssText = `color:${g.hex};border-color:${g.hex}33;background:${g.hex}12;`;
    pill.innerHTML = `<div class="cgp-dot" style="background:${g.hex}"></div>${g.name}<span class="cgp-pct">${pct}%</span>`;
    pill.title = `${g.name} · ${fmtMetric(g.current,g.unit)} of ${fmtMetric(g.target,g.unit)}`;
    pill.onclick = ()=>{ switchView('goals',null); setTimeout(()=>{ const c=document.querySelector(`[data-id="${g.id}"]`); if(c){c.classList.add('expanded');c.scrollIntoView({behavior:'smooth',block:'start'});} },80); };
    strip.appendChild(pill);

    // Add category pill to filter bar
    if(bar && !bar.querySelector(`[data-cat="${g.cat}"]`)){
      const cp = document.createElement('div');
      cp.className = 'cal-cat-pill';
      cp.setAttribute('data-cat', g.cat);
      cp.textContent = `${cat.icon} ${cat.label}`;
      cp.onclick = ()=>calSetCat(g.cat, cp);
      bar.appendChild(cp);
    }
  });
}

// Always-on panel: date + intentions + collapsible goal tasks
let alwaysExpandedGoalId = null;
let motivationRotateTimer = null;
let activeMotivationQuote = '';

function pickMotivationQuote(){
  const src = (typeof QUOTES !== 'undefined' && Array.isArray(QUOTES) && QUOTES.length)
    ? QUOTES
    : [
        'Small actions repeated become identity.',
        'Focus on this step. The next step appears after.',
        'Consistency beats intensity when practiced daily.'
      ];
  const pool = src.filter(q => q !== activeMotivationQuote);
  const next = (pool.length ? pool : src)[Math.floor(Math.random() * (pool.length ? pool.length : src.length))];
  activeMotivationQuote = next;
  return next;
}

function startMotivationRotation(){
  if(!activeMotivationQuote) pickMotivationQuote();
  if(motivationRotateTimer) return;
  motivationRotateTimer = setInterval(() => {
    const el = document.getElementById('always-motivation-quote');
    if(!el) return;
    el.textContent = pickMotivationQuote();
  }, 20000);
}

function stopMotivationRotation(){
  if(motivationRotateTimer){
    clearInterval(motivationRotateTimer);
    motivationRotateTimer = null;
  }
}

function toggleAlwaysGoalSection(goalId, yr, mo, dy){
  alwaysExpandedGoalId = alwaysExpandedGoalId === goalId ? null : goalId;
  const yy = Number.isInteger(yr) ? yr : (selectedYear ?? calYear ?? TODAY_CAL.year);
  const mm = Number.isInteger(mo) ? mo : (selectedMonth ?? calMonth ?? TODAY_CAL.month);
  const dd = Number.isInteger(dy) ? dy : (selectedDate ?? TODAY_CAL.day);
  renderAlwaysPanel(yy, mm, dd);
}

function renderAlwaysPanel(yr, mo, dy){
  yr = yr || calYear || TODAY_CAL.year;
  mo = mo || calMonth || TODAY_CAL.month;
  dy = dy || (selectedDate || TODAY_CAL.day);

  const body = document.getElementById('always-content') || document.getElementById('always-body');
  if(!body) return;

  const heading = document.getElementById('log-date-heading');
  const sub = document.getElementById('log-sub');
  const isToday = isTodayDate(yr, mo, dy);
  const d = new Date(yr, mo, dy);
  const longDateLabel = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  if(heading) heading.textContent = longDateLabel;
  const picker = document.getElementById('always-day-picker');
  if(picker) picker.value = toDateInputValue(yr, mo, dy);
  if(sub) sub.textContent = 'Log your progress, check intentions & leave a reflection.';

  const key = `${yr}-${mo}-${dy}`;
  const sections = [];

  const personalRows = getPersonalIntentionRowsForDate(yr, mo, dy, true);
  const adderOpen = !!intentionAdderContext?.open && intentionAdderContext?.yr === yr && intentionAdderContext?.mo === mo && intentionAdderContext?.dy === dy;
  const adderMode = ['daily', 'day', 'alternate', 'weekly', 'custom'].includes(intentionAdderContext?.mode) ? intentionAdderContext.mode : 'day';
  const customDays = Array.isArray(intentionAdderContext?.customDays) && intentionAdderContext.customDays.length
    ? intentionAdderContext.customDays.map(n => Number(n)).filter(n => n >= 0 && n <= 6)
    : [new Date(yr, mo, dy).getDay()];
  const customIntervalWeeks = [1, 2, 4].includes(Number(intentionAdderContext?.customIntervalWeeks))
    ? Number(intentionAdderContext.customIntervalWeeks)
    : 1;

  const personalItems = personalRows.map(t => {
    return `<div class="always-task${t.checked ? ' at-done' : ''}" onclick="alwaysToggleIntention('${t.id}',${yr},${mo},${dy})">
      <div class="at-chk">${t.checked ? '&#10003;' : ''}</div>
      <div class="at-text">${t.text}</div>
    </div>`;
  }).join('');

  const dayPickerButtons = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    .map((label, idx) => `<button class="always-custom-day${customDays.includes(idx) ? ' sel' : ''}" type="button" onclick="toggleIntentionCustomDay(${idx})">${label}</button>`)
    .join('');

  const addPrompt = adderOpen
    ? `<div class="always-intention-adder">
        <input id="always-intention-input" class="always-intention-input" type="text" placeholder="What do you want to do?" onkeydown="if(event.key==='Enter')addIntention()">
        <div class="always-intention-schedule-row">
          <div class="always-intention-kind">
            <button class="always-kind-btn${adderMode==='daily' ? ' sel' : ''}" type="button" onclick="setIntentionAdderMode('daily')">Every day</button>
            <button class="always-kind-btn${adderMode==='day' ? ' sel' : ''}" type="button" onclick="setIntentionAdderMode('day')">Just this day</button>
            <button class="always-kind-btn${adderMode==='alternate' ? ' sel' : ''}" type="button" onclick="setIntentionAdderMode('alternate')">Alternate day</button>
            <button class="always-kind-btn${adderMode==='weekly' ? ' sel' : ''}" type="button" onclick="setIntentionAdderMode('weekly')">Weekly</button>
          </div>
          <button class="always-custom-schedule-btn${adderMode==='custom' ? ' sel' : ''}" type="button" onclick="toggleIntentionCustomSchedule()" aria-label="Custom schedule">📅</button>
        </div>
        ${adderMode === 'custom'
          ? `<div class="always-custom-schedule-panel">
              <div class="always-custom-int-label">Repeat On</div>
              <div class="always-custom-days">${dayPickerButtons}</div>
              <div class="always-custom-int-label">Frequency</div>
              <div class="always-custom-interval">
                <button class="always-custom-interval-btn${customIntervalWeeks===1 ? ' sel' : ''}" type="button" onclick="setIntentionCustomInterval(1)">Every week</button>
                <button class="always-custom-interval-btn${customIntervalWeeks===2 ? ' sel' : ''}" type="button" onclick="setIntentionCustomInterval(2)">Every 2 weeks</button>
                <button class="always-custom-interval-btn${customIntervalWeeks===4 ? ' sel' : ''}" type="button" onclick="setIntentionCustomInterval(4)">Every 4 weeks</button>
              </div>
            </div>`
          : ''}
        <div class="always-intention-actions">
          <button class="always-intention-save" type="button" onclick="addIntention()">Add intention</button>
          <button class="always-intention-cancel" type="button" onclick="closeIntentionAdder()">Cancel</button>
        </div>
      </div>`
    : '';

  sections.push(`<div class="always-section">
    <div class="always-sec-hdr">
      <div class="always-sec-lbl always-intentions-lbl">${isToday ? "Today's Intentions" : 'Intentions'}</div>
      <button class="always-add-btn" onclick="openIntentionAdder(${yr},${mo},${dy})">+ Add</button>
    </div>
    ${personalItems || `<div class="at-empty">No intentions for this day yet.</div>`}
    ${addPrompt}
  </div>`);

  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, yr, mo, dy) && g.subs.length);
  if(alwaysExpandedGoalId && !activeGoals.some(g => g.id === alwaysExpandedGoalId)){
    alwaysExpandedGoalId = null;
  }

  let pendingGoalCount = 0;
  if(activeGoals.length){
    const goalBlocks = activeGoals.map(g => {
      const savedTasks = (dayLogs[key] || {}).tasks || [];
      let doneCount = 0;

      const rows = g.subs.map(s => {
        const saved = savedTasks.find(t => t._fromGoal === g.id && (t._subId === s.id || textsMatch(t.text, s.text)));
        const done = isToday ? !!s.done : !!saved?.checked;
        if(done) doneCount++;
        return { sub:s, done };
      });

      const pendingRows = rows.filter(r => !r.done);
      pendingGoalCount += pendingRows.length;

      const items = pendingRows.map(r => {
        const s = r.sub;
        return `<div class="always-task" onclick="alwaysToggleGoalSub(this,'${g.id}','${s.id}',${yr},${mo},${dy})">
          <div class="at-chk"></div>
          <div class="at-text">${s.text}</div>
          <span class="at-badge" style="background:${g.hex}">${g.name}</span>
        </div>`;
      }).join('');

      const dayDelta = g.entries
        .filter(e => e.date === key)
        .reduce((sum, e) => sum + (e.val || 0), 0);
      const pct = goalPct(g);
      const isExpanded = alwaysExpandedGoalId === g.id;
      const progressBar = `<div class="always-metric-bar">
        <div style="height:3px;flex:1;background:var(--cream-dark);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${g.hex};transition:width 0.5s ease"></div>
        </div>
        <span style="font-size:9px;font-family:'DM Mono',monospace;color:${g.hex};font-weight:600;white-space:nowrap">
          ${fmtMetric(g.current,g.unit)} / ${fmtMetric(g.target,g.unit)}
          ${dayDelta ? ` · <span style="color:#6B8C7A">+${fmtMetric(dayDelta,g.unit)} today</span>` : ''}
        </span>
      </div>`;

      return `<div class="always-goal-block${isExpanded ? ' expanded' : ''}">
        <button class="always-goal-toggle" type="button" onclick="toggleAlwaysGoalSection('${g.id}',${yr},${mo},${dy})" aria-expanded="${isExpanded ? 'true' : 'false'}">
          <div class="always-goal-main">
            <span class="always-goal-dot" style="background:${g.hex}"></span>
            <span class="always-goal-name">${CAT_META[g.cat]?.icon || '*'} ${g.name}</span>
          </div>
          <span class="always-goal-meta">${doneCount}/${g.subs.length}</span>
          <span class="always-goal-chevron">${isExpanded ? '-' : '+'}</span>
        </button>
        <div class="always-goal-items">
          ${items || `<div class='at-empty' style='padding:10px 2px'>All goal intentions complete.</div>`}
          ${progressBar}
        </div>
      </div>`;
    }).join('');

    sections.push(`<div class="always-section">
      <div class="always-sec-hdr">
        <div class="always-sec-lbl">Goal Intentions</div>
      </div>
      <div class="always-goals-list">${goalBlocks}</div>
    </div>`);
  }

  if(!personalRows.length && pendingGoalCount === 0){
    pickMotivationQuote();
    sections.push(`<div class="always-section always-motivation-wrap">
      <div class="always-sec-hdr">
        <div class="always-sec-lbl always-intentions-lbl">${isToday ? "Today's Motivation" : 'Motivation'}</div>
      </div>
      <div class="always-motivation-quote" id="always-motivation-quote">${activeMotivationQuote}</div>
    </div>`);
    startMotivationRotation();
  } else {
    stopMotivationRotation();
  }

  body.innerHTML = sections.join('');

  if(adderOpen){
    setTimeout(() => {
      const input = document.getElementById('always-intention-input');
      if(input) input.focus();
    }, 0);
  }
}

// Whether a goal is active on a specific day (stricter than month check)
function goalActiveOnDay(g, yr, mo, dy){
  const dayDate = new Date(yr, mo, dy);
  const gS = g.startDate ? new Date(g.startDate) : new Date('1970-01-01');
  const gE = g.endDate   ? new Date(g.endDate)   : new Date('2099-12-31');
  return gS <= dayDate && gE >= dayDate;
}

function alwaysToggleIntention(intentId, yr, mo, dy){
  const yy = parseInt(yr, 10);
  const mm = parseInt(mo, 10);
  const dd = parseInt(dy, 10);
  const key = `${yy}-${mm}-${dd}`;

  const rows = getPersonalIntentionRowsForDate(yy, mm, dd, true);
  const row = rows.find(r => r.id === intentId);
  if(!row) return;

  const next = !row.checked;
  setPersonalIntentionChecked(intentId, yy, mm, dd, next);
  const goalSyncChanged = syncGoalSubsFromPersonalText(row.text, next, yy, mm, dd);
  const autoChanged = applyAutoMetricForIntentionText(row.text, next, yy, mm, dd);

  buildCalendar();
  renderAlwaysPanel(yy, mm, dd);
  renderDayGlance(yy, mm, dd, getPersonalIntentionRowsForDate(yy, mm, dd, false), buildGoalLinkedIntentionRows(dayLogs[key], GOALS.filter(g => goalActiveOnDay(g, yy, mm, dd))));
  if(yy === TODAY_CAL.year && mm === TODAY_CAL.month && dd === TODAY_CAL.day){
    updateRightPanelIntentions(intentId, next);
  } else {
    renderRightPanelIntentions();
  }

  const allCells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  if(allCells[dd-1]) allCells[dd-1].classList.add('selected');

  if(goalSyncChanged || autoChanged) rerenderGoalsKeepExpanded();
  if(next) showToast(`? ${row.text.slice(0,40)}`);
}

// Legacy index-based fallback.
function alwaysTogglePastTask(el, yr, mo, dy, idx){
  const yy = parseInt(yr,10), mm = parseInt(mo,10), dd = parseInt(dy,10);
  const rows = getPersonalIntentionRowsForDate(yy, mm, dd, true);
  const row = rows[idx];
  if(row) alwaysToggleIntention(row.id, yy, mm, dd);
}

function alwaysToggleGoalSub(el, goalId, subId, yr, mo, dy){
  const g = GOALS.find(goal => goal.id === goalId); if(!g) return;
  const s = g.subs.find(sub => sub.id === subId); if(!s) return;
  const yy = parseInt(yr,10), mm = parseInt(mo,10), dd = parseInt(dy,10);
  const key = `${yy}-${mm}-${dd}`;
  const isToday = isTodayDate(yy, mm, dd);

  const existing = (dayLogs[key]?.tasks || []).find(t => t._fromGoal === goalId && (t._subId === subId || textsMatch(t.text, s.text)));
  const currentDone = isToday ? !!s.done : !!existing?.checked;
  const isDone = !currentDone;

  const autoChanged = applyAutoMetricForGoalSub(goalId, subId, isDone, yy, mm, dd);
  if(isToday) s.done = isDone;

  const log = ensureDayLogEntry(key);
  const goalTask = log.tasks.find(t => t._fromGoal === goalId && (t._subId === subId || textsMatch(t.text, s.text)));
  if(goalTask) goalTask.checked = isDone;
  else log.tasks.push({ text:s.text, checked:isDone, badge:g.name, badgeColor:g.hex, _fromGoal:goalId, _subId:subId });

  setPersonalIntentionCheckedByText(s.text, yy, mm, dd, isDone);

  buildCalendar();
  alwaysExpandedGoalId = goalId;
  renderAlwaysPanel(yy, mm, dd);
  renderDayGlance(yy, mm, dd, getPersonalIntentionRowsForDate(yy, mm, dd, false), buildGoalLinkedIntentionRows(dayLogs[key], GOALS.filter(goal => goalActiveOnDay(goal, yy, mm, dd))));
  if(yy === TODAY_CAL.year && mm === TODAY_CAL.month && dd === TODAY_CAL.day){
    const matchedTodayIds = getPersonalIntentionRowsForDate(yy, mm, dd, true)
      .filter(r => textsMatch(r.text, s.text))
      .map(r => r.id);
    if(matchedTodayIds.length){
      matchedTodayIds.forEach(id => updateRightPanelIntentions(id, isDone));
    } else {
      renderRightPanelIntentions();
    }
  } else {
    renderRightPanelIntentions();
  }

  const allCells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  if(allCells[dd-1]) allCells[dd-1].classList.add('selected');

  if(autoChanged) rerenderGoalsKeepExpanded(goalId);
  if(isDone) showToast(`? ${s.text.slice(0,40)}`);
}
function renderLogGoalMetrics(yr, mo, dy){
  const cont = document.getElementById('log-goal-metrics');
  if(cont) cont.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════
// MODAL — 3-step goal creation
// ═══════════════════════════════════════════════════════════
let _modalPage = 1;
let _modalSubs = [];

function openModal(){
  _modalPage = 1; _modalSubs = [];
  document.getElementById('modal-overlay').classList.add('open');
  setModalPage(1);
  // Clear form
  ['ng-name','ng-why','ng-target','ng-unit','ng-milestones'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const cur=document.getElementById('ng-current'); if(cur) cur.value='0';
  const start=document.getElementById('ng-start');
  if(start) {
    const todayStr = `${TODAY_CAL.year}-${String(TODAY_CAL.month + 1).padStart(2, '0')}-${String(TODAY_CAL.day).padStart(2, '0')}`;
    start.value = todayStr;
  }
  const end=document.getElementById('ng-end'); if(end) end.value='';
  document.getElementById('ng-subs-list').innerHTML='';
  // Pre-select first cat
  const cats=document.querySelectorAll('.cat-pick');
  cats.forEach(c=>c.classList.remove('cp-sel'));
  if(cats[0]){ cats[0].classList.add('cp-sel'); prefillUnit(cats[0]); }
}

function setModalPage(n){
  _modalPage = n;
  document.querySelectorAll('.modal-page').forEach(p=>p.classList.remove('mp-active'));
  const pg = document.getElementById('mpg'+n);
  if(pg) pg.classList.add('mp-active');
  [0,1,2].forEach(i=>{
    const pip = document.getElementById('pip'+i);
    pip.classList.remove('msb-on','msb-done');
    if(i===n-1) pip.classList.add('msb-on');
    else if(i<n-1) pip.classList.add('msb-done');
  });
}

function modalGoTo(n){
  if(n===2){
    if(!document.getElementById('ng-name').value.trim()){ showToast('Name your goal first!'); return; }
  }
  setModalPage(n);
}

function pickCat(el){
  document.querySelectorAll('.cat-pick').forEach(c=>c.classList.remove('cp-sel'));
  el.classList.add('cp-sel');
  prefillUnit(el);
}

function prefillUnit(el){
  const unitEl = document.getElementById('ng-unit');
  if(unitEl){ unitEl.value = el.getAttribute('data-unit')||''; }
}

function addModalSub(){
  const inp=document.getElementById('ng-sub-input'); if(!inp) return;
  const text=inp.value.trim(); if(!text) return;
  _modalSubs.push({id:'ms'+Date.now(), text, done:false});
  const unitEl = document.getElementById('ng-unit');
  if(unitEl){
    const currentUnit = normalizeMetricUnit(unitEl.value.trim());
    const inferred = inferGoalUnitFromSubs(_modalSubs);
    if((!unitEl.value.trim() || currentUnit==='units') && inferred){
      unitEl.value = inferred;
    }
  }
  const chip=document.createElement('div');
  chip.className='new-sub-chip';
  const i=_modalSubs.length-1;
  chip.innerHTML=`<span class="new-sub-chip-text">${text}</span><button class="new-sub-chip-rm" onclick="removeModalSub(${i},this)">×</button>`;
  document.getElementById('ng-subs-list').appendChild(chip);
  inp.value='';
  inp.focus();
}

function removeModalSub(idx, btn){
  _modalSubs.splice(idx,1);
  btn.closest('.new-sub-chip').remove();
}

function addGoal(){
  const name = document.getElementById('ng-name').value.trim();
  if(!name){ showToast('Name your goal first.'); return; }
  const catEl = document.querySelector('.cat-pick.cp-sel');
  const cat = catEl ? catEl.getAttribute('data-cat') : 'custom';
  const hex = catEl ? catEl.getAttribute('data-hex') : '#8C857D';
  const target  = parseFloat(document.getElementById('ng-target').value)||100;
  const unitInput = document.getElementById('ng-unit').value.trim();
  const normalizedInput = normalizeMetricUnit(unitInput);
  const inferredUnit = inferGoalUnitFromSubs(_modalSubs);
  const unit = (!unitInput || normalizedInput === 'units')
    ? (inferredUnit || 'units')
    : (normalizedInput || unitInput);
  const current = parseFloat(document.getElementById('ng-current').value)||0;
  const why     = document.getElementById('ng-why').value.trim();
  const start   = document.getElementById('ng-start').value||null;
  const end     = document.getElementById('ng-end').value||null;
  const msText  = document.getElementById('ng-milestones').value.trim();
  const milestones = msText ? msText.split(',').map(m=>({l:m.trim(),done:false})) : [];

  const goal = {
    id:'g'+Date.now(), name,
    why: why ? `"${why}"` : '"Every day is progress."',
    cat, hex, target, current, unit,
    startDate: start, endDate: end,
    milestones, subs: _modalSubs.map(s=>({...s})),
    entries:[], stories:[], peers:[],
  };
  GOALS.push(goal);

  closeModal();
  renderGoals();
  renderCalGoalStrip();
  syncIntentionsToCalendar();
  renderAlwaysPanel();
  showToast(`⭐ "${name}" planted. Every day counts.`);
}

function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
  _modalSubs = [];
}
function selectColor(el){ document.querySelectorAll('.color-opt').forEach(c=>c.classList.remove('selected'));el.classList.add('selected'); }


// ─── COMPOUND VIEW ───────────────────────────────────────────

