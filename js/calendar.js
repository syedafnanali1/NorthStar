// North Star — Calendar: buildCalendar, selectDay, dayLogs panel, AlwaysPanel, CalGoalStrip

// ─── CALENDAR ────────────────────────────────────────────────
const _runtimeToday = new Date();
const TODAY_CAL = {
  year: _runtimeToday.getFullYear(),
  month: _runtimeToday.getMonth(),
  day: _runtimeToday.getDate()
};
const TODAY_KEY = `${TODAY_CAL.year}-${TODAY_CAL.month}-${TODAY_CAL.day}`;

function isTodayDate(yr, mo, dy){
  return yr===TODAY_CAL.year && mo===TODAY_CAL.month && dy===TODAY_CAL.day;
}

function selectedDayKey(){
  const yy = selectedYear ?? TODAY_CAL.year;
  const mm = selectedMonth ?? TODAY_CAL.month;
  const dd = selectedDate ?? TODAY_CAL.day;
  return `${yy}-${mm}-${dd}`;
}

let calYear=TODAY_CAL.year, calMonth=TODAY_CAL.month, selectedDate=TODAY_CAL.day, selectedMonth=TODAY_CAL.month, selectedYear=TODAY_CAL.year;
let calCat='all';
const dayLogs={};

function selectTodayOnCalendar(openDayPanel){
  const shouldOpen = openDayPanel !== false;
  calYear = TODAY_CAL.year;
  calMonth = TODAY_CAL.month;
  selectedYear = TODAY_CAL.year;
  selectedMonth = TODAY_CAL.month;
  selectedDate = TODAY_CAL.day;

  buildCalendar();

  if(!shouldOpen) return;
  const grid = document.getElementById('cal-grid');
  if(!grid) return;
  const cells = grid.querySelectorAll('.cal-cell:not(.other-month)');
  const todayCell = cells[TODAY_CAL.day - 1];
  if(todayCell) selectDay(TODAY_CAL.day, todayCell);
}

// Seed realistic demo data so the calendar feels alive on load
(function seedLogs(){
  const CAT_COLORS={ Marathon:'#C4963A', Novel:'#6B8C7A', Savings:'#5B7EA6', Health:'#B5705B', Circle:'#1A1714' };
  const days=[
    {d:1, mood:'🌟', sleep:'7to8', note:'Great start to the month.', tasks:[
      {t:'Morning run 8km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'},
      {t:'Transfer $300', done:true, badge:'Savings', col:'#5B7EA6'}]},
    {d:2, mood:'😊', sleep:'6to7', note:'', tasks:[
      {t:'Morning run 8km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'},
      {t:'Cold shower', done:false, badge:'Health', col:'#B5705B'}]},
    {d:5, mood:'😓', sleep:'5to6', note:'Tired but showed up.', tasks:[
      {t:'Morning run 8km', done:false, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'}]},
    {d:8, mood:'🔥', sleep:'over8', note:'Best day this month — everything clicked.', tasks:[
      {t:'Morning run 10km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'},
      {t:'Transfer $300', done:true, badge:'Savings', col:'#5B7EA6'},
      {t:'Cold shower', done:true, badge:'Health', col:'#B5705B'}]},
    {d:9, mood:'😊', sleep:'7to8', note:'', tasks:[
      {t:'Morning run 8km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'}]},
    {d:12, mood:'😐', sleep:'6to7', note:'', tasks:[
      {t:'Morning run 8km', done:false, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'}]},
    {d:15, mood:'😊', sleep:'7to8', note:'Halfway through — feeling consistent.', tasks:[
      {t:'Morning run 10km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'},
      {t:'Transfer $300', done:true, badge:'Savings', col:'#5B7EA6'}]},
    {d:18, mood:'🌟', sleep:'over8', note:'', tasks:[
      {t:'Morning run 10km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'},
      {t:'Cold shower', done:true, badge:'Health', col:'#B5705B'},
      {t:'Transfer $300', done:true, badge:'Savings', col:'#5B7EA6'}]},
    {d:19, mood:'😊', sleep:'7to8', note:'PB run today. Skipped writing.', tasks:[
      {t:'Morning run 12km PB', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Write 700 words', done:false, badge:'Novel', col:'#6B8C7A'}]},
    {d:20, mood:'😓', sleep:'5to6', note:'Tired but got the words down.', tasks:[
      {t:'Write 700 words', done:true, badge:'Novel', col:'#6B8C7A'}]},
    {d:21, mood:'😊', sleep:'6to7', note:'', tasks:[
      {t:'Morning run 8km', done:true, badge:'Marathon', col:'#C4963A'},
      {t:'Cold shower', done:true, badge:'Health', col:'#B5705B'}]},
  ];
  days.filter(s => s.d <= TODAY_CAL.day).forEach(s=>{
    dayLogs[`${TODAY_CAL.year}-${TODAY_CAL.month}-${s.d}`]={
      mood:s.mood, sleep:s.sleep, note:s.note,
      tasks:s.tasks.map(t=>({text:t.t, checked:t.done, badgeColor:t.col, badge:t.badge}))
    };
  });
})();

function calSetCat(cat, el){
  calCat = cat;
  document.querySelectorAll('.cal-cat-pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  buildCalendar();
}

function buildCalendar(){
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month-label');
  if(!grid) return;
  grid.innerHTML = '';

  const d = new Date(calYear, calMonth, 1);
  label.textContent = d.toLocaleDateString('en-US',{month:'long', year:'numeric'});
  const firstDow = d.getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const TODAY_D = TODAY_CAL.day, TODAY_M = TODAY_CAL.month, TODAY_Y = TODAY_CAL.year;
  const hasSelectedInMonth = Number.isInteger(selectedDate) && selectedMonth===calMonth && selectedYear===calYear;
  if(!hasSelectedInMonth && calYear===TODAY_Y && calMonth===TODAY_M){
    selectedDate = TODAY_D;
    selectedMonth = TODAY_M;
    selectedYear = TODAY_Y;
  }

  // ── Pad start
  for(let i=firstDow-1; i>=0; i--){
    const c = document.createElement('div');
    c.className = 'cal-cell other-month';
    c.innerHTML = `<span class="cal-num">${prevDays-i}</span>`;
    grid.appendChild(c);
  }

  // ── Day cells
  for(let day=1; day<=daysInMonth; day++){
    const isToday = calYear===TODAY_Y && calMonth===TODAY_M && day===TODAY_D;
    const isPast  = (calYear < TODAY_Y) || (calYear===TODAY_Y && calMonth < TODAY_M) || (calYear===TODAY_Y && calMonth===TODAY_M && day <= TODAY_D);
    const isSel   = selectedDate===day && selectedMonth===calMonth && selectedYear===calYear;
    const key = `${calYear}-${calMonth}-${day}`;
    const log = dayLogs[key];

    // Filter tasks by category
    const allTasks = log?.tasks || [];
    // Dynamic category filter based on actual goal names
    const catGoalNames = GOALS.filter(g=>g.cat===calCat).map(g=>g.name);
    const filteredTasks = calCat==='all' ? allTasks : allTasks.filter(t=> catGoalNames.some(n=> t.badge&&t.badge===n));
    const doneCount = filteredTasks.filter(t=>t.checked).length;
    const totalCount = filteredTasks.length;
    const pct = totalCount>0 ? Math.round((doneCount/totalCount)*100) : 0;

    // Check which goals are active on this specific day
    const dayGoals = GOALS.filter(g => goalActiveOnDay(g, calYear, calMonth, day));

    const cell = document.createElement('div');
    let cls = 'cal-cell';
    if(isToday) cls += ' today';
    if(log) cls += ' has-log';
    if(isSel) cls += ' selected';
    if(dayGoals.length) cls += ' in-goal';
    if(!isPast && !isToday){
      const darkMode = document.body.classList.contains('dark');
      cell.style.opacity = darkMode ? '0.62' : '0.5';
    }
    cell.className = cls;
    // Color the goal band with the primary active goal's color
    if(dayGoals.length) cell.style.color = dayGoals[0].hex;

    let html = `<span class="cal-num">${day}</span>`;

    // Mood badge
    if(log?.mood && !isSel) html += `<div class="cal-mood" style="${isSel?'filter:brightness(2)':''}">${log.mood}</div>`;
    if(log?.mood && isSel)  html += `<div class="cal-mood" style="opacity:0.7">${log.mood}</div>`;

    // Goal dots — coloured per goal, greyed if not done
    if(filteredTasks.length > 0){
      html += `<div class="cal-dots" style="margin-top:auto;margin-bottom:8px">`;
      filteredTasks.slice(0,5).forEach(t=>{
        html += `<div class="cal-dot${t.checked?'':' unchecked'}" style="${t.checked?`background:${t.badgeColor}`:''}"></div>`;
      });
      if(filteredTasks.length > 5) html += `<div style="font-size:9px;color:${isSel?'rgba(255,255,255,0.5)':'var(--ink-muted)'};line-height:7px">+${filteredTasks.length-5}</div>`;
      html += `</div>`;
    } else if(dayGoals.length && !filteredTasks.length){
      // Show goal sub-task dots when no log yet but goals are active
      html += `<div class="cal-dots" style="margin-top:auto;margin-bottom:8px">`;
      dayGoals.forEach(g => g.subs.slice(0,2).forEach(s => {
        const saved = (log?.tasks||[]).find(t=>t._fromGoal===g.id && t.text===s.text);
        const done = saved ? saved.checked : (isToday ? s.done : false);
        html += `<div class="cal-dot${done?'':' unchecked'}" style="${done?`background:${g.hex}`:''}"></div>`;
      }));
      html += `</div>`;
    }

    // Completion bar
    if(totalCount > 0){
      html += `<div class="cal-cell-bar"><div class="cal-cell-bar-fill" style="width:${pct}%"></div></div>`;
    }

    // Hover tooltip
    if(isPast || isToday){
      let tip = '';
      if(log && totalCount>0) tip = `${doneCount}/${totalCount} done`;
      else if(isToday) tip = 'Today — tap to log';
      else tip = 'No log yet';
      if(log?.mood) tip += ` · ${log.mood}`;
      if(dayGoals.length) tip += ` · ${dayGoals.map(g=>g.name).join(', ')}`;
      html += `<div class="cal-tooltip">${tip}</div>`;
    }

    cell.innerHTML = html;
    cell.onclick = () => selectDay(day, cell);
    grid.appendChild(cell);
  }

  // ── Pad end
  const used = firstDow + daysInMonth;
  const rem = used%7===0 ? 0 : 7-used%7;
  for(let i=1; i<=rem; i++){
    const c = document.createElement('div');
    c.className = 'cal-cell other-month';
    c.innerHTML = `<span class="cal-num">${i}</span>`;
    grid.appendChild(c);
  }

  updateMonthStats();
  renderCalGoalStrip();
  // refresh always panel for the selected day in the new month
  const _sd = selectedDate||TODAY_CAL.day; const _sm = selectedMonth; const _sy = selectedYear;
  if(_sm===calMonth && _sy===calYear) renderAlwaysPanel(calYear, calMonth, _sd);
}

function changeMonth(dir){
  calMonth += dir;
  if(calMonth>11){calMonth=0; calYear++;}
  if(calMonth<0){calMonth=11; calYear--;}
  buildCalendar();
  renderCalGoalStrip();
}

function updateMonthStats(){
  const TODAY_D=TODAY_CAL.day, TODAY_M=TODAY_CAL.month, TODAY_Y=TODAY_CAL.year;
  if(calYear!==TODAY_Y || calMonth!==TODAY_M){ return; }
  let daysLogged=0, tasksDone=0, streak=0;
  for(let d=1; d<=TODAY_D; d++){
    const log = dayLogs[`${calYear}-${calMonth}-${d}`];
    if(log){ daysLogged++; tasksDone += (log.tasks||[]).filter(t=>t.checked).length; }
  }
  for(let d=TODAY_D; d>=1; d--){
    if(dayLogs[`${calYear}-${calMonth}-${d}`]) streak++;
    else break;
  }
  const pct = Math.round((daysLogged/TODAY_D)*100);
  const maxTasks = 50;

  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  const setW=(id,w)=>{const el=document.getElementById(id);if(el)el.style.width=w+'%';};
  set('stat-logged', daysLogged);
  set('stat-tasks', tasksDone);
  set('stat-streak', streak+'🔥');
  set('stat-pct', pct+'%');
  setW('stat-logged-bar', Math.round((daysLogged/TODAY_D)*100));
  setW('stat-tasks-bar', Math.min(100,Math.round((tasksDone/maxTasks)*100)));
  setW('stat-streak-bar', Math.min(100,Math.round((streak/TODAY_D)*100)));
  setW('stat-pct-bar', pct);
}

function buildGoalLinkedIntentionRows(log, activeGoals){
  const savedTasks = log?.tasks || [];
  const rows = [];
  activeGoals.forEach(g => {
    if(!g.subs?.length) return;
    const savedByGoal = savedTasks.filter(t => t._fromGoal === g.id);
    g.subs.forEach(s => {
      const saved = savedByGoal.find(t => t.text === s.text);
      rows.push({
        goalId: g.id,
        subId: s.id,
        text: s.text,
        checked: saved ? !!saved.checked : !!s.done,
        badge: g.name,
        color: g.hex
      });
    });
  });
  return rows;
}

function appendGoalLinkedIntentionsSection(taskListEl, rows, withTopGap){
  if(!taskListEl || !rows.length) return;

  const section = document.createElement('div');
  section.className = 'goal-linked-section collapsed';
  if(withTopGap) section.style.marginTop = '14px';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'goal-linked-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `
    <span class="goal-linked-title">Goal Linked Intentions</span>
    <span class="goal-linked-line"></span>
    <span class="goal-linked-count">${rows.length}</span>
    <span class="goal-linked-arrow">+</span>
  `;

  const list = document.createElement('div');
  list.className = 'goal-linked-items';
  rows.forEach(r => {
    const el = createTaskEl(r.text, r.checked, r.color, r.badge);
    el.setAttribute('data-goal-id', r.goalId);
    el.setAttribute('data-sub-id', r.subId);
    el.onclick = () => toggleGoalTaskFromLog(el, r.goalId, r.subId);
    list.appendChild(el);
  });

  toggle.onclick = () => {
    const collapsed = section.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    const arrow = toggle.querySelector('.goal-linked-arrow');
    if(arrow) arrow.textContent = collapsed ? '+' : '-';
  };

  section.appendChild(toggle);
  section.appendChild(list);
  taskListEl.appendChild(section);
}

function selectDay(day, cell){
  selectedDate  = day;
  selectedMonth = calMonth;
  selectedYear  = calYear;

  document.querySelectorAll('.cal-cell').forEach(c=>c.classList.remove('selected'));
  cell.classList.add('selected');

  const dt  = new Date(calYear, calMonth, day);
  const key = `${calYear}-${calMonth}-${day}`;
  const isToday = isTodayDate(calYear, calMonth, day);

  document.getElementById('log-date-heading').textContent =
    dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const log = dayLogs[key];
  document.getElementById('mood-select').value  = log?.mood  || '';
  document.getElementById('sleep-select').value = log?.sleep || '';
  document.getElementById('day-note').value     = log?.note  || '';

  // ── Build merged task list for this day ─────────────────────
  // 1) Start with logged tasks (or today's intentions)
  const tl = document.getElementById('task-list');
  tl.innerHTML = '';
  const baseTasks = (log?.tasks || []).filter(t => !t._fromGoal);
  baseTasks.forEach(t => tl.appendChild(createTaskEl(t.text, t.checked, t.badgeColor, t.badge)));

  // 2) Inject goal sub-tasks for goals active on this day
  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, calYear, calMonth, day));
  const goalLinkedRows = buildGoalLinkedIntentionRows(log, activeGoals);
  appendGoalLinkedIntentionsSection(tl, goalLinkedRows, baseTasks.length > 0);

  // ── Always panel: update for selected day ──────────────────
  renderAlwaysPanel(calYear, calMonth, day);

  // ── Log panel: goal metric inputs ──────────────────────────
  renderLogGoalMetrics(calYear, calMonth, day);

  // ── At-a-glance pills ──────────────────────────────────────
  const glance = document.getElementById('log-glance-row');
  glance.innerHTML = '';
  // Count total intentions including goal-linked rows
  const totalTasks = baseTasks.length + goalLinkedRows.length;
  const doneTasks  = baseTasks.filter(t=>t.checked).length + goalLinkedRows.filter(r=>r.checked).length;
  if(log){
    const sleepMap = {under5:'<5 hrs','5to6':'5–6 hrs','6to7':'6–7 hrs','7to8':'7–8 hrs',over8:'8+ hrs'};
    if(log.mood)  glance.innerHTML += `<div class="log-glance-pill">${log.mood} Mood</div>`;
    if(log.sleep) glance.innerHTML += `<div class="log-glance-pill">💤 ${sleepMap[log.sleep]||log.sleep}</div>`;
    if(totalTasks>0){
      const col = doneTasks===totalTasks?'var(--sage)':doneTasks>0?'var(--gold)':'var(--rose)';
      glance.innerHTML += `<div class="log-glance-pill"><div class="glance-dot" style="background:${col}"></div>${doneTasks}/${totalTasks} intentions</div>`;
    }
    if(log.note) glance.innerHTML += `<div class="log-glance-pill">✍️ Reflection</div>`;
    // Goal progress pills
    activeGoals.forEach(g=>{
      const e = g.entries.find(en=>en.date===key);
      if(e) glance.innerHTML += `<div class="log-glance-pill" style="color:${g.hex};border-color:${g.hex}22">+${fmtMetric(e.val,g.unit)}</div>`;
    });
  } else {
    glance.innerHTML = `<div class="log-glance-pill" style="color:var(--ink-muted)">${isToday?'Today — log your progress':'No log yet — fill in below'}</div>`;
  }

  const panel = document.getElementById('daily-log-panel');
  panel.style.display = 'block';
  setTimeout(()=> panel.scrollIntoView({behavior:'smooth', block:'nearest'}), 60);
}

// Toggle a goal sub-task from the daily log panel
function toggleGoalTaskFromLog(el, goalId, subId){
  el.classList.toggle('checked');
  const isDone = el.classList.contains('checked');
  el.querySelector('.task-checkbox').textContent = isDone ? '✓' : '';

  const g = GOALS.find(g=>g.id===goalId); if(!g) return;
  const s = g.subs.find(s=>s.id===subId); if(!s) return;
  s.done = isDone;

  const autoChanged = applyAutoMetricForGoalSub(goalId, subId, isDone, calYear, calMonth, selectedDate || TODAY_CAL.day);
  renderAlwaysPanel(calYear, calMonth, selectedDate || TODAY_CAL.day);
  if(autoChanged){
    rerenderGoalsKeepExpanded(goalId);
    renderCalGoalStrip();
    buildCalendar();
  }

  if(isDone) showToast(`✓ ${s.text.slice(0,30)}…`);
}

// ─── TASKS ───────────────────────────────────────────────────
function createTaskEl(text, checked, color, badge){
  const item = document.createElement('div');
  item.className = 'task-item' + (checked?' checked':'');
  item.onclick = () => toggleTask(item);
  item.innerHTML = `<div class="task-checkbox">${checked?'✓':''}</div><div class="task-text">${text}</div>${badge?`<span class="task-goal-badge" style="background:${color||'var(--ink)'}">${badge}</span>`:''}`;
  return item;
}

function toggleTask(item){
  item.classList.toggle('checked');
  const isDone = item.classList.contains('checked');
  item.querySelector('.task-checkbox').textContent = isDone ? '✓' : '';
  if(isDone) showToast('✓ Intention complete. Keep going.');

  const text = item.querySelector('.task-text').textContent;
  const yy = selectedYear ?? TODAY_CAL.year;
  const mm = selectedMonth ?? TODAY_CAL.month;
  const dd = selectedDate ?? TODAY_CAL.day;
  const autoChanged = applyAutoMetricForIntentionText(text, isDone, yy, mm, dd);

  // If this is today's calendar — sync back to intentionsStore + right panel
  if(isTodayDate(selectedYear, selectedMonth, selectedDate)){
    const found = intentionsStore.find(i => i.text === text);
    if(found){
      found.done = isDone;
      const rpItems = document.querySelectorAll('#intentions-list .intention-item');
      rpItems.forEach(rp => {
        if(rp.querySelector('.intention-text')?.textContent === text){
          if(isDone){ rp.classList.add('done'); rp.querySelector('.intention-check').textContent='✓'; }
          else { rp.classList.remove('done'); rp.querySelector('.intention-check').textContent=''; }
        }
      });
    }
  }

  if(autoChanged){
    rerenderGoalsKeepExpanded();
    renderCalGoalStrip();
    buildCalendar();
    renderAlwaysPanel(yy, mm, dd);
  }
}

function addTask(){
  const input = document.getElementById('new-task-input');
  const text = input.value.trim(); if(!text) return;
  const taskList = document.getElementById('task-list');
  const newItem = createTaskEl(text, false, 'var(--ink-muted)', null);
  const goalSection = taskList.querySelector('.goal-linked-section');
  if(goalSection) taskList.insertBefore(newItem, goalSection);
  else taskList.appendChild(newItem);
  input.value = '';
  showToast('Intention added.');
}

// ─── SAVE LOG ────────────────────────────────────────────────
function saveLog(){
  const key = `${calYear}-${calMonth}-${selectedDate}`;
  const mood  = document.getElementById('mood-select').value;
  const sleep = document.getElementById('sleep-select').value;
  const note  = document.getElementById('day-note').value;
  const tasks = Array.from(document.querySelectorAll('#task-list .task-item')).map(item=>({
    text: item.querySelector('.task-text').textContent,
    checked: item.classList.contains('checked'),
    badgeColor: item.querySelector('.task-goal-badge')?.style.background || null,
    badge: item.querySelector('.task-goal-badge')?.textContent || null,
    _fromGoal: item.getAttribute('data-goal-id') || null,
    _subId: item.getAttribute('data-sub-id') || null
  }));
  dayLogs[key] = {mood, sleep, note, tasks};

  // If saving today — sync task state back to intentionsStore + right panel
  if(isTodayDate(selectedYear, selectedMonth, selectedDate)){
    tasks.forEach(t => {
      const found = intentionsStore.find(i => i.text === t.text);
      if(found) found.done = t.checked;
    });
    // Refresh right panel intentions list visual state
    const rpItems = document.querySelectorAll('#intentions-list .intention-item');
    rpItems.forEach(rp => {
      const text = rp.querySelector('.intention-text')?.textContent;
      const found = intentionsStore.find(i => i.text === text);
      if(found){
        if(found.done){ rp.classList.add('done'); rp.querySelector('.intention-check').textContent='✓'; }
        else { rp.classList.remove('done'); rp.querySelector('.intention-check').textContent=''; }
      }
    });
  }

  buildCalendar();
  const allCells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  if(allCells[selectedDate-1]) allCells[selectedDate-1].classList.add('selected');
  showToast('📅 Day logged. Every day counts.');
}

// ─── INTENTIONS — store, add, toggle, sync ────────────────────
const intentionsStore = [
  { text:'10km morning run — easy pace', done:false, color:'var(--gold)',  label:'Marathon' },
  { text:'Write 700 words before lunch',  done:true,  color:'var(--sage)',  label:'Novel'    },
  { text:'Transfer $300 to savings',      done:false, color:'var(--sky)',   label:'Savings'  },
  { text:'Post a check-in for Sarah',     done:false, color:'var(--ink)',   label:'Circle'   },
];

function syncIntentionsToCalendar() {
  // Sync today's intentions into dayLogs
  if (!dayLogs[TODAY_KEY]) dayLogs[TODAY_KEY] = { mood:'🔥', sleep:'7to8', note:'', tasks:[] };
  // Keep only tasks that aren't from goals (goal subs are handled separately)
  const nonGoalTasks = dayLogs[TODAY_KEY].tasks.filter(t => t._fromGoal);
  dayLogs[TODAY_KEY].tasks = [
    ...intentionsStore.map(i => ({
      text: i.text, checked: i.done, badgeColor: resolveCssVar(i.color), badge: i.label
    })),
    ...nonGoalTasks
  ];
  buildCalendar();
  renderCalGoalStrip();
  renderAlwaysPanel(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
  // If today's log panel is open, refresh its base task list (non-goal tasks)
  if (isTodayDate(selectedYear, selectedMonth, selectedDate)) {
    const panel = document.getElementById('daily-log-panel');
    if (panel && panel.style.display !== 'none') {
      const tl = document.getElementById('task-list');
      if(tl){
        tl.innerHTML = '';
        intentionsStore.forEach(i => tl.appendChild(createTaskEl(i.text, i.done, resolveCssVar(i.color), i.label)));
        const activeGoals = GOALS.filter(g => goalActiveOnDay(g, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day));
        const goalLinkedRows = buildGoalLinkedIntentionRows(dayLogs[TODAY_KEY], activeGoals);
        appendGoalLinkedIntentionsSection(tl, goalLinkedRows, intentionsStore.length > 0);
      }
    }
  }
}

function resolveCssVar(v){
  const map = {
    'var(--gold)':'#C4963A','var(--sage)':'#6B8C7A','var(--sky)':'#5B7EA6',
    'var(--rose)':'#B5705B','var(--ink)':'#1A1714','var(--violet)':'#7B6FA0',
    'var(--ink-muted)':'#8C857D'
  };
  return map[v] || v;
}

let intentionAdderContext = { yr: TODAY_CAL.year, mo: TODAY_CAL.month, dy: TODAY_CAL.day };

function openIntentionAdder(yr, mo, dy) {
  const yy = Number.isInteger(yr) ? yr : TODAY_CAL.year;
  const mm = Number.isInteger(mo) ? mo : TODAY_CAL.month;
  const dd = Number.isInteger(dy) ? dy : TODAY_CAL.day;
  intentionAdderContext = { yr: yy, mo: mm, dy: dd };

  const adder = document.getElementById('intention-adder');
  if(!adder) return;
  adder.style.display = 'block';
  adder.style.animation = 'slideUp 0.2s ease both';
  const inp = document.getElementById('intention-text-input');
  if(inp){
    const isTodayCtx = isTodayDate(yy, mm, dd);
    inp.placeholder = isTodayCtx
      ? 'What do you intend to do today?'
      : `Add an intention for ${new Date(yy, mm, dd).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
  }
  setTimeout(() => { if(inp) inp.focus(); }, 50);
}

function closeIntentionAdder() {
  const adder = document.getElementById('intention-adder');
  if(adder) adder.style.display = 'none';
  const inp = document.getElementById('intention-text-input');
  if(inp){
    inp.value = '';
    inp.placeholder = 'What do you intend to do today?';
  }
  intentionAdderContext = { yr: TODAY_CAL.year, mo: TODAY_CAL.month, dy: TODAY_CAL.day };
  document.querySelectorAll('.itag-btn').forEach((b,i) => {
    if(i===0){ b.classList.add('sel'); const c=resolveCssVar(b.getAttribute('data-color')); b.style.background=c;b.style.color='white';b.style.borderColor=c; }
    else { b.classList.remove('sel');b.style.background='transparent';b.style.color='#8C857D';b.style.borderColor='#EDE7DE'; }
  });
}

function selectITag(btn) {
  document.querySelectorAll('.itag-btn').forEach(b => { b.classList.remove('sel');b.style.background='transparent';b.style.color='#8C857D';b.style.borderColor='#EDE7DE'; });
  btn.classList.add('sel');
  const c = resolveCssVar(btn.getAttribute('data-color'));
  btn.style.background=c; btn.style.color='white'; btn.style.borderColor=c;
}

function addIntention() {
  const input = document.getElementById('intention-text-input');
  const text = input.value.trim();
  if (!text) { input.style.borderColor='#B5705B'; setTimeout(()=>input.style.borderColor='#EDE7DE',1000); return; }
  const selTag = document.querySelector('.itag-btn.sel');
  const label = selTag ? selTag.getAttribute('data-label') : null;
  const colorVar = selTag ? selTag.getAttribute('data-color') : 'var(--ink-muted)';
  const colorHex = resolveCssVar(colorVar);

  const yy = intentionAdderContext?.yr ?? TODAY_CAL.year;
  const mm = intentionAdderContext?.mo ?? TODAY_CAL.month;
  const dd = intentionAdderContext?.dy ?? TODAY_CAL.day;
  const key = `${yy}-${mm}-${dd}`;
  const isTodayCtx = key === TODAY_KEY;

  if(isTodayCtx){
    if(intentionsStore.some(i => i.text === text)){
      showToast('This intention already exists for today.');
      return;
    }
    intentionsStore.push({ text, done:false, color:colorVar, label });
    const list = document.getElementById('intentions-list');
    if(list){
      const item = document.createElement('div');
      item.className = 'intention-item';
      item.onclick = () => toggleIntention(item);
      item.innerHTML = `<div class="intention-check"></div><div class="intention-text">${text}</div>${label?`<span class="intention-goal-tag" style="background:${colorHex}">${label}</span>`:''}`;
      item.style.opacity='0'; item.style.transform='translateY(8px)';
      list.appendChild(item);
      requestAnimationFrame(()=>{ item.style.transition='opacity 0.28s ease,transform 0.28s ease'; item.style.opacity='1'; item.style.transform='translateY(0)'; });
    }
    syncIntentionsToCalendar();
    closeIntentionAdder();
    showToast(`✓ Added to today & calendar: "${text}"`);
    return;
  }

  if(!dayLogs[key]) dayLogs[key] = { mood:'', sleep:'', note:'', tasks:[] };
  const nonGoal = dayLogs[key].tasks.filter(t => !t._fromGoal);
  if(nonGoal.some(t => t.text === text)){
    showToast('This intention already exists for this day.');
    return;
  }
  dayLogs[key].tasks.push({ text, checked:false, badgeColor:colorHex, badge:label||null });

  if(selectedYear===yy && selectedMonth===mm && selectedDate===dd){
    const list = document.getElementById('task-list');
    if(list){
      const item = createTaskEl(text, false, colorHex, label);
      const goalSection = list.querySelector('.goal-linked-section');
      if(goalSection) list.insertBefore(item, goalSection);
      else list.appendChild(item);
    }
  }

  buildCalendar();
  renderAlwaysPanel(yy, mm, dd);
  closeIntentionAdder();
  showToast(`✓ Added to ${new Date(yy, mm, dd).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`);
}

function toggleIntention(item) {
  item.classList.toggle('done');
  const isDone = item.classList.contains('done');
  item.querySelector('.intention-check').textContent = isDone ? '✓' : '';
  const text = item.querySelector('.intention-text').textContent;
  const found = intentionsStore.find(i => i.text === text);
  if (found) found.done = isDone;
  const autoChanged = applyAutoMetricForIntentionText(text, isDone, TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
  syncIntentionsToCalendar();
  if(autoChanged) rerenderGoalsKeepExpanded();
  if (isDone) showToast('✓ Intention complete. Pattern builds.');
}

const LEADERBOARD = [
  {rank:1,  init:'AN', name:'Anika N.',    detail:'30🔥 · 98% tasks',  score:2840, col:'#5DAD82', you:false},
  {rank:2,  init:'JW', name:'James W.',   detail:'28🔥 · 95% tasks',  score:2710, col:'#7B6FA0', you:false},
  {rank:3,  init:'MR', name:'Maya R.',    detail:'31🔥 · 92% tasks',  score:2690, col:'#5B7EA6', you:false},
  {rank:4,  init:'SM', name:'Sarah M.',   detail:'22🔥 · 91% tasks',  score:2580, col:'#6B8C7A', you:false},
  {rank:5,  init:'LC', name:'Leo C.',     detail:'19🔥 · 89% tasks',  score:2400, col:'#C4963A', you:false},
  {rank:6,  init:'PD', name:'Priya D.',   detail:'17🔥 · 88% tasks',  score:2310, col:'#7B6FA0', you:false},
  {rank:7,  init:'JL', name:'You',        detail:'14🔥 · 85% tasks',  score:2180, col:'linear-gradient(135deg,#C4963A,#B5705B)', you:true},
  {rank:8,  init:'TK', name:'Tom K.',     detail:'7🔥  · 80% tasks',  score:1940, col:'#B5705B', you:false},
  {rank:9,  init:'RB', name:'Rashida B.', detail:'12🔥 · 78% tasks',  score:1820, col:'#5DAD82', you:false},
  {rank:10, init:'OS', name:'Oliver S.',  detail:'9🔥  · 75% tasks',  score:1650, col:'#5B7EA6', you:false},
];

const CIRCLE_POSTS = [
  { id:1, author:'Sarah M.', init:'SM', col:'#6B8C7A', time:'2h ago', you:false,
    body:'"Ran 18km today. Wanted to stop at 14. Didn\'t. Legs are done. Soul is full."',
    goal:{icon:'🏃', name:'Marathon Training', pct:78, col:'#6B8C7A'},
    reactions:[{e:'🔥',n:4,active:true},{e:'💪',n:2,active:false},{e:'⭐',n:1,active:false}],
    replies:[{init:'JL',col:'linear-gradient(135deg,#C4963A,#B5705B)',name:'You',text:'This is what it looks like. Proud of you 🔥'}]
  },
  { id:2, author:'Maya R.', init:'MR', col:'#5B7EA6', time:'4h ago', you:false,
    body:'"1,200 words today. Writing finally feels less like fighting and more like breathing. Chapter 14 is alive."',
    goal:{icon:'✍️', name:'Write My Novel', pct:42, col:'#5B7EA6'},
    reactions:[{e:'✨',n:6,active:false},{e:'💙',n:3,active:false}],
    replies:[]
  },
  { id:3, author:'You', init:'JL', col:'linear-gradient(135deg,#C4963A,#B5705B)', time:'6h ago', you:true,
    body:'"Completed my first 28km run. Legs were dead but the mind was electric. 47 days to race day."',
    goal:{icon:'🏃', name:'Run a Marathon', pct:65, col:'#C4963A'},
    reactions:[{e:'🔥',n:7,active:false},{e:'💪',n:4,active:false},{e:'⭐',n:2,active:false}],
    replies:[
      {init:'SM',col:'#6B8C7A',name:'Sarah M.',text:'Let\'s GO. See you at the start line 🏆'},
      {init:'TK',col:'#B5705B',name:'Tom K.',text:'That\'s a massive milestone. Respect.'}
    ]
  },
  { id:4, author:'Tom K.', init:'TK', col:'#B5705B', time:'Yesterday', you:false,
    body:'"Missed my run yesterday. Felt guilty, then let it go. Back at it today. The pattern matters more than the perfect day."',
    goal:{icon:'🏃', name:'Marathon Training', pct:45, col:'#B5705B'},
    reactions:[{e:'💙',n:5,active:false},{e:'🤝',n:3,active:false}],
    replies:[]
  },
  { id:5, author:'Priya D.', init:'PD', col:'#7B6FA0', time:'Yesterday', you:false,
    body:'"Transferred $800 to savings this week. Small amounts, consistent rhythm. The number is finally moving."',
    goal:{icon:'💰', name:'Save $20,000', pct:38, col:'#7B6FA0'},
    reactions:[{e:'💰',n:4,active:false},{e:'🎉',n:2,active:false}],
    replies:[]
  },
];

const COMMUNITY_POSTS = [
  { id:10, author:'Anika N.', init:'AN', col:'#5DAD82', time:'1h ago', you:false,
    body:'"30-day streak hit. I never thought I\'d be the person who does this every day. Turns out I just needed to start."',
    goal:{icon:'🧘', name:'Daily Meditation', pct:95, col:'#5DAD82'},
    reactions:[{e:'🔥',n:18,active:false},{e:'⭐',n:9,active:false},{e:'💙',n:6,active:false}],
    replies:[]
  },
  { id:11, author:'James W.', init:'JW', col:'#7B6FA0', time:'3h ago', you:false,
    body:'"Paid off the last of my $15K credit card debt today. Three years of discipline, one massive exhale."',
    goal:{icon:'💳', name:'Debt Freedom', pct:100, col:'#7B6FA0'},
    reactions:[{e:'🎉',n:24,active:false},{e:'💙',n:11,active:false},{e:'🔥',n:8,active:false}],
    replies:[]
  },
  { id:12, author:'Leo C.', init:'LC', col:'#C4963A', time:'5h ago', you:false,
    body:'"Read for 30 minutes every single day this month. 820 pages. I\'d forgotten how much I love disappearing into a book."',
    goal:{icon:'📚', name:'Read 24 Books', pct:60, col:'#C4963A'},
    reactions:[{e:'📚',n:12,active:false},{e:'✨',n:5,active:false}],
    replies:[]
  },
  { id:13, author:'Rashida B.', init:'RB', col:'#5DAD82', time:'8h ago', you:false,
    body:'"First pull-up done. Sounds small. Six months ago I couldn\'t do one. Cried a little. No shame."',
    goal:{icon:'💪', name:'Build Upper Body Strength', pct:55, col:'#5DAD82'},
    reactions:[{e:'💪',n:31,active:false},{e:'🔥',n:14,active:false},{e:'🎉',n:9,active:false}],
    replies:[]
  },
];

let currentFeed = 'circle';
const userPosts = [];

function switchFeed(tab, el) {
  currentFeed = tab;
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFeed();
}

function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;
  let posts = [];
  if (currentFeed === 'circle') posts = CIRCLE_POSTS;
  else if (currentFeed === 'community') posts = COMMUNITY_POSTS;
  else posts = [...userPosts, ...CIRCLE_POSTS.filter(p => p.you)];

  container.innerHTML = '';
  posts.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.animationDelay = (i * 0.05) + 's';

    const repliesHTML = p.replies.map(r => `
      <div class="reply-item">
        <div class="reply-avatar" style="background:${r.col}">${r.init}</div>
        <div class="reply-bubble">
          <div class="reply-name">${r.name}</div>
          <div class="reply-text">${r.text}</div>
        </div>
      </div>`).join('');

    const reactHTML = p.reactions.map(r =>
      `<button class="react-btn${r.active?' active':''}" onclick="toggleReact(this)">${r.e} ${r.n}</button>`
    ).join('');

    card.innerHTML = `
      <div class="post-header">
        <div class="post-avatar" style="background:${p.col}">${p.init}</div>
        <div class="post-meta">
          <div class="post-name">${p.author} ${p.you?'<span class="post-you-tag">You</span>':''}</div>
          <div class="post-time">${p.time}</div>
        </div>
        ${p.goal?`<span class="post-badge" style="background:${p.goal.col}">${p.goal.icon}</span>`:''}
      </div>
      <div class="post-body">${p.body}</div>
      ${p.goal?`
      <div class="post-goal-bar">
        <div class="pgb-icon">${p.goal.icon}</div>
        <div class="pgb-info">
          <div class="pgb-name">${p.goal.name}</div>
          <div class="pgb-track"><div class="pgb-fill" style="width:${p.goal.pct}%;background:${p.goal.col}"></div></div>
        </div>
        <div class="pgb-pct">${p.goal.pct}%</div>
      </div>`:''}
      <div class="react-row">
        ${reactHTML}
        <button class="react-btn reply-btn" onclick="toggleReply(this)">💬 Reply</button>
      </div>
      <div class="reply-thread${p.replies.length?'':''}" id="thread-${p.id}">
        ${repliesHTML}
        <div class="reply-input-row">
          <div class="reply-avatar" style="background:linear-gradient(135deg,var(--gold),var(--rose));width:24px;height:24px;font-size:8px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;flex-shrink:0">JL</div>
          <input class="reply-input" placeholder="Write a reply…" onkeydown="if(event.key==='Enter')sendReply(this,${p.id})">
          <button class="reply-send" onclick="sendReply(this.previousElementSibling,${p.id})">Send</button>
        </div>
      </div>`;
    container.appendChild(card);

    // Open threads that already have replies
    if (p.replies.length) {
      card.querySelector(`#thread-${p.id}`).classList.add('open');
    }
  });
}

function toggleReply(btn) {
  const card = btn.closest('.post-card');
  const thread = card.querySelector('.reply-thread');
  thread.classList.toggle('open');
  if (thread.classList.contains('open')) {
    thread.querySelector('.reply-input')?.focus();
  }
}

function sendReply(input, postId) {
  const text = input.value.trim();
  if (!text) return;
  const thread = input.closest('.reply-thread');
  const newReply = document.createElement('div');
  newReply.className = 'reply-item';
  newReply.innerHTML = `
    <div class="reply-avatar" style="background:linear-gradient(135deg,var(--gold),var(--rose))">JL</div>
    <div class="reply-bubble">
      <div class="reply-name">You</div>
      <div class="reply-text">${text}</div>
    </div>`;
  thread.insertBefore(newReply, thread.querySelector('.reply-input-row'));
  input.value = '';
  showToast('Reply sent ✓');
}

function toggleComposerTag(btn) {
  btn.classList.toggle('sel');
}

function postUpdate() {
  const text = document.getElementById('composer-text')?.value.trim();
  if (!text) { showToast('Write something first.'); return; }
  const tags = Array.from(document.querySelectorAll('.composer-tag.sel')).map(t => t.textContent.trim());
  const newPost = {
    id: Date.now(), author:'You', init:'JL', col:'linear-gradient(135deg,#C4963A,#B5705B)',
    time:'Just now', you:true,
    body:`"${text}"`,
    goal: tags.length ? {icon:'⭐', name: tags.join(' · '), pct:65, col:'#C4963A'} : null,
    reactions:[{e:'🔥',n:0,active:false},{e:'⭐',n:0,active:false}],
    replies:[]
  };
  userPosts.unshift(newPost);
  CIRCLE_POSTS.unshift(newPost);
  document.getElementById('composer-text').value = '';
  document.querySelectorAll('.composer-tag').forEach(t => t.classList.remove('sel'));
  if (currentFeed === 'circle' || currentFeed === 'mine') renderFeed();
  showToast('Update posted to your Circle ✓');
}

function buildLeaderboard(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const top = LEADERBOARD.slice(0, 10);
  const maxScore = top[0].score;
  el.innerHTML = top.map(p => {
    const rankClass = p.rank===1?'r1':p.rank===2?'r2':p.rank===3?'r3':p.you?'ryou':'';
    const medal = p.rank===1?'🥇':p.rank===2?'🥈':p.rank===3?'🥉':p.rank;
    return `
    <div class="lb-row${p.you?' lb-you':''}">
      <div class="lb-rank ${rankClass}">${medal}</div>
      <div class="lb-av" style="background:${p.col}">${p.init}</div>
      <div class="lb-info">
        <div class="lb-name">${p.name}${p.you?' ← you':''}</div>
        <div class="lb-detail">${p.detail}</div>
      </div>
      <div class="lb-score">${p.score.toLocaleString()}</div>
      <div class="lb-progress"><div class="lb-progress-fill" style="width:${Math.round((p.score/maxScore)*100)}%"></div></div>
    </div>`;
  }).join('');
}

// Override switchView to toggle right panel and render circle
function switchView(v, el) {
  document.querySelectorAll('.page-view').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-icon').forEach(x => x.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  if(el) el.classList.add('active');

  const rpDefault = document.getElementById('rp-default');
  const rpCircle  = document.getElementById('rp-circle');
  if (v === 'circle') {
    if (rpDefault) rpDefault.style.display = 'none';
    if (rpCircle)  rpCircle.style.display  = 'block';
    renderFeed();
    buildLeaderboard('lb-rows-sidebar');
  } else {
    if (rpDefault) rpDefault.style.display = 'block';
    if (rpCircle)  rpCircle.style.display  = 'none';
    if (v === 'analytics' && typeof renderAnalytics === 'function') {
      renderAnalytics();
    }
    if (v === 'calendar') {
      selectTodayOnCalendar(true);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// GOAL DATA MODEL
// ═══════════════════════════════════════════════════════════
