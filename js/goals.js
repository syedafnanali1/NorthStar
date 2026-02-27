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
  el.querySelector('.sub-chk').textContent = s.done ? '✓' : '';
  const autoChanged = applyAutoMetricForGoalSub(goalId, subId, s.done, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
  syncIntentionsToCalendar();
  renderAlwaysPanel();
  if(autoChanged) rerenderGoalsKeepExpanded(goalId);
  if(s.done) showToast('✓ Intention complete. Linked to calendar.');
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
  if(goalUsesAutoTracking(g)){ showToast('ðŸ¤– This goal is auto-tracked from linked intentions.'); return; }
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
  if(goalUsesAutoTracking(g)){ showToast('ðŸ¤– This goal is auto-tracked from linked intentions.'); return; }
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

// ── Always-on panel: today's intentions + goal sub-tasks ─────
function renderAlwaysPanel(yr, mo, dy){
  yr = yr||calYear||TODAY_CAL.year; mo = mo||calMonth||TODAY_CAL.month; dy = dy||(selectedDate||TODAY_CAL.day);
  const body = document.getElementById('always-body'); if(!body) return;
  const tag  = document.getElementById('always-datetag');
  const isToday = isTodayDate(yr, mo, dy);
  const d = new Date(yr, mo, dy);
  const dateLabel = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  if(tag) tag.textContent = dateLabel + (isToday?' · Today':'');
  // Update panel title
  const titleEl = document.querySelector('.always-title');
  if(titleEl) titleEl.textContent = isToday ? "Today's Intentions" : `${dateLabel} — Intentions`;

  const key = `${yr}-${mo}-${dy}`;
  const sections = [];

  // ── 1) Personal intentions ──────────────────────────────────
  let intentionsSrc;
  if(isToday){
    intentionsSrc = intentionsStore;
  } else {
    const logTasks = (dayLogs[key]||{}).tasks || [];
    intentionsSrc = logTasks.filter(t => !t._fromGoal).map(t=>({
      text: t.text, done: t.checked,
      color: t.badgeColor||'var(--ink-muted)', label: t.badge
    }));
  }

  const intItems = intentionsSrc.map((t, i)=>{
    const done = t.done !== undefined ? t.done : !!t.checked;
    const badge = t.label || t.badge || '';
    const bgColor = resolveCssVar(t.color||t.badgeColor||'#8C857D');
    const clickFn = isToday
      ? `alwaysToggleIntention(${i},this,true)`
      : `alwaysTogglePastTask(this,'${yr}','${mo}','${dy}',${i})`;
    return `<div class="always-task${done?' at-done':''}" onclick="${clickFn}">
      <div class="at-chk">${done?'✓':''}</div>
      <div class="at-text">${t.text}</div>
      ${badge ? `<span class="at-badge" style="background:${bgColor}">${badge}</span>` : ''}
    </div>`;
  }).join('');

  sections.push(`<div class="always-section">
    <div class="always-sec-hdr">
      <div class="always-sec-lbl">Daily Intentions</div>
      <button class="always-add-btn" onclick="openIntentionAdder(${yr},${mo},${dy})">+ Add</button>
    </div>
    ${intItems || `<div class="at-empty">No intentions yet — <button onclick="openIntentionAdder(${yr},${mo},${dy})" style="color:var(--gold);background:none;border:none;cursor:pointer;font-size:12px;font-weight:500;padding:0">add one now</button></div>`}
  </div>`);

  // ── 2) Goal sub-tasks active on this specific day ──────────
  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, yr, mo, dy));
  activeGoals.forEach(g => {
    if(!g.subs.length) return;
    const savedTasks = (dayLogs[key]||{}).tasks || [];

    const items = g.subs.map(s => {
      const saved = savedTasks.find(t => t._fromGoal===g.id && t.text===s.text);
      // For today use s.done; for past days use saved state
      const done = isToday ? s.done : (saved ? saved.checked : false);
      return `<div class="always-task${done?' at-done':''}" onclick="alwaysToggleGoalSub(this,'${g.id}','${s.id}',${yr},${mo},${dy})">
        <div class="at-chk">${done?'✓':''}</div>
        <div class="at-text">${s.text}</div>
        <span class="at-badge" style="background:${g.hex}">${g.name}</span>
      </div>`;
    }).join('');

    // Progress mini-bar for this goal on this day
    const dayDelta = g.entries.filter(e=>e.date===key).reduce((sum,e)=>sum + (e.val||0), 0);
    const pct = goalPct(g);
    const progressBar = `<div class="always-metric-bar">
      <div style="height:3px;flex:1;background:var(--cream-dark);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${g.hex};transition:width 0.5s ease"></div>
      </div>
      <span style="font-size:9px;font-family:'DM Mono',monospace;color:${g.hex};font-weight:600;white-space:nowrap">
        ${fmtMetric(g.current,g.unit)} / ${fmtMetric(g.target,g.unit)}
        ${dayDelta ? ` · <span style="color:#6B8C7A">+${fmtMetric(dayDelta,g.unit)} today</span>` : ''}
      </span>
    </div>`;

    sections.push(`<div class="always-section">
      <div class="always-sec-hdr">
        <div class="always-sec-lbl">${CAT_META[g.cat]?.icon||'⭐'} ${g.name} <span style="font-family:'DM Mono',monospace;font-size:9px;opacity:0.45">${pct}%</span></div>
      </div>
      ${items}
      ${progressBar}
    </div>`);
  });

  if(!intentionsSrc.length && !activeGoals.some(g=>g.subs.length)){
    sections.push(`<div class="at-empty" style="padding:4px 0;text-align:center;color:var(--ink-muted)">Nothing to show for this day.</div>`);
  }

  body.innerHTML = sections.join('');
}

// Whether a goal is active on a specific day (stricter than month check)
function goalActiveOnDay(g, yr, mo, dy){
  const dayDate = new Date(yr, mo, dy);
  const gS = g.startDate ? new Date(g.startDate) : new Date('1970-01-01');
  const gE = g.endDate   ? new Date(g.endDate)   : new Date('2099-12-31');
  return gS <= dayDate && gE >= dayDate;
}

function alwaysToggleIntention(idx, el, isToday){
  if(isToday && intentionsStore[idx]){
    intentionsStore[idx].done = !intentionsStore[idx].done;
    el.classList.toggle('at-done');
    el.querySelector('.at-chk').textContent = intentionsStore[idx].done ? '✓' : '';

    const autoChanged = applyAutoMetricForIntentionText(intentionsStore[idx].text, intentionsStore[idx].done, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);

    // Mirror to right panel
    const rpItems = document.querySelectorAll('#intentions-list .intention-item');
    rpItems.forEach(rp=>{
      if(rp.querySelector('.intention-text')?.textContent===intentionsStore[idx].text){
        intentionsStore[idx].done ? rp.classList.add('done') : rp.classList.remove('done');
        rp.querySelector('.intention-check').textContent = intentionsStore[idx].done?'✓':'';
      }
    });

    syncIntentionsToCalendar();
    if(autoChanged) rerenderGoalsKeepExpanded();
  }
}

// Toggle an intention from a past day's panel
function alwaysTogglePastTask(el, yr, mo, dy, idx){
  const key = `${yr}-${mo}-${dy}`;
  if(!dayLogs[key]) return;
  const tasks = dayLogs[key].tasks.filter(t=>!t._fromGoal);
  if(!tasks[idx]) return;
  tasks[idx].checked = !tasks[idx].checked;
  el.classList.toggle('at-done');
  const yy = parseInt(yr,10), mm = parseInt(mo,10), dd = parseInt(dy,10);
  const autoChanged = applyAutoMetricForIntentionText(tasks[idx].text, tasks[idx].checked, yy, mm, dd);
  buildCalendar();
  renderAlwaysPanel(yy, mm, dd);
  if(autoChanged) rerenderGoalsKeepExpanded();
  el.querySelector('.at-chk').textContent = tasks[idx].checked ? '✓' : '';
}

// Toggle a goal sub-task from the always panel (any day)
function alwaysToggleGoalSub(el, goalId, subId, yr, mo, dy){
  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  const s = g.subs.find(s=>s.id===subId); if(!s) return;
  const isToday = isTodayDate(yr, mo, dy);
  el.classList.toggle('at-done');
  const isDone = el.classList.contains('at-done');
  el.querySelector('.at-chk').textContent = isDone ? '✓' : '';
  const autoChanged = applyAutoMetricForGoalSub(goalId, subId, isDone, yr, mo, dy);
  if(isToday) s.done = isDone;
  // Persist to dayLog
  const key = `${yr}-${mo}-${dy}`;
  if(!dayLogs[key]) dayLogs[key] = { mood:'', sleep:'', note:'', tasks:[] };
  const existing = dayLogs[key].tasks.find(t=>t._fromGoal===goalId && t.text===s.text);
  if(existing){ existing.checked = isDone; }
  else { dayLogs[key].tasks.push({text:s.text, checked:isDone, badge:g.name, badgeColor:g.hex, _fromGoal:goalId}); }
  buildCalendar();
  // Re-select the cell
  const allCells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  if(allCells[dy-1]) allCells[dy-1].classList.add('selected');
  if(autoChanged) rerenderGoalsKeepExpanded(goalId);
  if(isDone) showToast(`✓ ${s.text.slice(0,40)}`);
}

// ── Log panel: goal metric inputs ─────────────────────────────
function renderLogGoalMetrics(yr, mo, dy){
  const cont = document.getElementById('log-goal-metrics'); if(!cont) return;
  const active = GOALS.filter(g => goalActiveInMonth(g, yr, mo));
  if(!active.length){ cont.innerHTML=''; return; }

  const manualGoals = active.filter(g => !goalUsesAutoTracking(g));
  if(!manualGoals.length){
    cont.innerHTML = `<div class="log-section-title">Goal Progress for This Day</div><div class="log-goal-row"><div class="lgr-name">🤖 Auto-tracked Goals</div><div class="lgr-stat">Linked metric intentions update progress automatically. No manual entry needed.</div></div>`;
    return;
  }

  const key = `${yr}-${mo}-${dy}`;
  cont.innerHTML = `<div class="log-section-title">Goal Progress for This Day</div>` +
    manualGoals.map(g => {
      const cat = CAT_META[g.cat]||CAT_META.custom;
      const existing = g.entries.find(e=>e.date===key && !e.auto);
      return `<div class="log-goal-row">
        <div class="lgr-name"><span>${cat.icon}</span>${g.name} <span style="font-size:10px;color:var(--ink-muted);font-weight:400">${goalPct(g)}%</span></div>
        <div class="lgr-stat">${fmtMetric(g.current,g.unit)} / ${fmtMetric(g.target,g.unit)}${existing?` · <span style="color:#6B8C7A;font-weight:600">+${fmtMetric(existing.val,g.unit)} today</span>`:''}</div>
        <div class="lgr-inputs">
          <input class="lgr-input" type="number" min="0" id="lgr-${g.id}" placeholder="${g.unit==='$'?'300':'8'}" value="${existing?existing.val:''}">
          <span class="lgr-unit">${g.unit}</span>
          <button class="lgr-btn" onclick="logDayMetric('${g.id}','${key}')">Log</button>
        </div>
        <span class="lgr-logged" id="lgr-lbl-${g.id}" style="display:${existing?'block':'none'}">${existing?`✓ ${fmtMetric(existing.val,g.unit)} logged`:''}</span>
      </div>`;
    }).join('');
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
