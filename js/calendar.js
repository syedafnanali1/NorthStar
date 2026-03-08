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

function ensureDayLogEntry(key){
  if(!dayLogs[key]) dayLogs[key] = { mood:'', sleep:'', note:'', tasks:[] };
  if(!Array.isArray(dayLogs[key].tasks)) dayLogs[key].tasks = [];
  return dayLogs[key];
}

function textsMatch(a, b){
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

function parseDayKey(key){
  if(!key || typeof key !== 'string') return null;
  const parts = key.split('-').map(Number);
  if(parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return { year:parts[0], month:parts[1], day:parts[2] };
}

function dayKeyToDate(key){
  const p = parseDayKey(key);
  return p ? new Date(p.year, p.month, p.day) : null;
}

function dateToDayKey(dt){
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

function toDateInputValue(yr, mo, dy){
  return `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
}

function daysBetweenKeys(aKey, bKey){
  const a = dayKeyToDate(aKey);
  const b = dayKeyToDate(bKey);
  if(!a || !b) return null;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / 86400000);
}

function normalizeIntentWeekdays(days, fallbackWeekday){
  const arr = Array.isArray(days) ? days : [];
  const normalized = [...new Set(arr.map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))];
  if(normalized.length) return normalized.sort((a, b) => a - b);
  return [fallbackWeekday];
}

function getIntentRecurrenceSignature(intent){
  if(!intent) return 'none';
  const recur = intent.recurrence || 'day';
  if(recur === 'daily') return 'daily';
  if(recur === 'day') return `day:${intent.dateKey || ''}`;
  if(recur === 'alternate') return `alternate:${intent.anchorKey || intent.dateKey || ''}`;
  if(recur === 'weekly') return `weekly:${intent.anchorKey || intent.dateKey || ''}`;
  if(recur === 'custom'){
    const anchorDate = dayKeyToDate(intent.anchorKey || intent.dateKey || TODAY_KEY) || new Date(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
    const days = normalizeIntentWeekdays(intent.weekdays, anchorDate.getDay());
    const interval = [1, 2, 4].includes(Number(intent.intervalWeeks)) ? Number(intent.intervalWeeks) : 1;
    return `custom:${days.join(',')}:${interval}`;
  }
  return recur;
}

function intentionAppliesToDate(intent, key){
  if(!intent) return false;
  if(intent.recurrence === 'daily') return true;
  if(intent.recurrence === 'day') return intent.dateKey === key;
  if(intent.recurrence === 'alternate'){
    const anchor = intent.anchorKey || intent.dateKey;
    const diff = daysBetweenKeys(key, anchor);
    return diff !== null && diff >= 0 && diff % 2 === 0;
  }
  if(intent.recurrence === 'weekly'){
    const anchor = intent.anchorKey || intent.dateKey;
    const diff = daysBetweenKeys(key, anchor);
    return diff !== null && diff >= 0 && diff % 7 === 0;
  }
  if(intent.recurrence === 'custom'){
    const anchorKey = intent.anchorKey || intent.dateKey || TODAY_KEY;
    const anchorDate = dayKeyToDate(anchorKey) || new Date(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day);
    const current = dayKeyToDate(key);
    if(!current) return false;
    const diff = daysBetweenKeys(key, anchorKey);
    if(diff === null || diff < 0) return false;
    const weekdays = normalizeIntentWeekdays(intent.weekdays, anchorDate.getDay());
    if(!weekdays.includes(current.getDay())) return false;
    const intervalWeeks = [1, 2, 4].includes(Number(intent.intervalWeeks)) ? Number(intent.intervalWeeks) : 1;
    const weekDiff = Math.floor(diff / 7);
    return weekDiff % intervalWeeks === 0;
  }
  return false;
}

function getIntentionDefsForDate(key){
  return intentionsStore.filter(intent => intentionAppliesToDate(intent, key));
}

function getPersonalIntentionRowsForDate(yr, mo, dy, mutate){
  const key = `${yr}-${mo}-${dy}`;
  const defs = getIntentionDefsForDate(key);
  const log = dayLogs[key];
  const existing = (log?.tasks || []).filter(t => !t._fromGoal);
  const rows = [];

  defs.forEach(def => {
    let task = existing.find(t => t._intentId === def.id || textsMatch(t.text, def.text));
    if(!task && mutate){
      const target = ensureDayLogEntry(key);
      task = { text:def.text, checked:false, _intentId:def.id, badge:null, badgeColor:null };
      target.tasks.push(task);
    }
    rows.push({
      id: def.id,
      text: def.text,
      checked: !!task?.checked
    });
  });

  return rows;
}

function setPersonalIntentionChecked(intentId, yr, mo, dy, checked){
  const key = `${yr}-${mo}-${dy}`;
  const def = intentionsStore.find(i => i.id === intentId);
  if(!def) return false;

  const log = ensureDayLogEntry(key);
  let task = log.tasks.find(t => !t._fromGoal && (t._intentId === intentId || textsMatch(t.text, def.text)));
  if(!task){
    task = { text:def.text, checked:false, _intentId:intentId, badge:null, badgeColor:null };
    log.tasks.push(task);
  }
  task.checked = !!checked;
  task.badge = null;
  task.badgeColor = null;
  return true;
}

function setPersonalIntentionCheckedByText(text, yr, mo, dy, checked){
  if(!text) return false;
  const key = `${yr}-${mo}-${dy}`;
  let changed = false;

  getIntentionDefsForDate(key)
    .filter(def => textsMatch(def.text, text))
    .forEach(def => { changed = setPersonalIntentionChecked(def.id, yr, mo, dy, checked) || changed; });

  const log = dayLogs[key];
  if(log){
    log.tasks
      .filter(t => !t._fromGoal && textsMatch(t.text, text))
      .forEach(t => { t.checked = !!checked; changed = true; });
  }
  return changed;
}

function syncGoalSubsFromPersonalText(text, isDone, yr, mo, dy){
  if(!text) return false;
  let changed = false;
  const key = `${yr}-${mo}-${dy}`;

  GOALS.forEach(g => {
    if(!goalActiveOnDay(g, yr, mo, dy)) return;
    g.subs.forEach(s => {
      if(!textsMatch(s.text, text)) return;
      if(s.done !== !!isDone){
        s.done = !!isDone;
        changed = true;
      }

      const log = ensureDayLogEntry(key);
      let existing = log.tasks.find(t => t._fromGoal === g.id && (t._subId === s.id || textsMatch(t.text, s.text)));
      if(existing){
        if(existing.checked !== !!isDone){
          existing.checked = !!isDone;
          changed = true;
        }
      } else {
        log.tasks.push({ text:s.text, checked:!!isDone, badge:g.name, badgeColor:g.hex, _fromGoal:g.id, _subId:s.id });
        changed = true;
      }
    });
  });
  return changed;
}

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

    // Include personal intentions active on this day + goal-linked tasks.
    const personalRows = getPersonalIntentionRowsForDate(calYear, calMonth, day, false);
    const allTasks = [
      ...personalRows.map(r => ({ text:r.text, checked:r.checked, badge:null, badgeColor:null })),
      ...((log?.tasks || []).filter(t => t._fromGoal))
    ];
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

function renderDayGlance(yr, mo, dy, baseTasks, goalLinkedRows){
  const key = `${yr}-${mo}-${dy}`;
  const log = dayLogs[key];
  const isToday = isTodayDate(yr, mo, dy);
  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, yr, mo, dy));
  const glance = document.getElementById('log-glance-row');
  if(!glance) return;
  glance.innerHTML = '';

  const totalTasks = baseTasks.length + goalLinkedRows.length;
  const doneTasks = baseTasks.filter(t => !!t.checked).length + goalLinkedRows.filter(t => !!t.checked).length;
  const sleepMap = { under5:'<5 hrs', '5to6':'5-6 hrs', '6to7':'6-7 hrs', '7to8':'7-8 hrs', over8:'8+ hrs' };

  if(log?.mood) glance.innerHTML += `<div class="log-glance-pill">${log.mood} Mood</div>`;
  if(log?.sleep) glance.innerHTML += `<div class="log-glance-pill">Sleep ${sleepMap[log.sleep] || log.sleep}</div>`;
  if(totalTasks > 0 && doneTasks > 0){
    const col = doneTasks === totalTasks ? 'var(--sage)' : 'var(--gold)';
    glance.innerHTML += `<div class="log-glance-pill"><div class="glance-dot" style="background:${col}"></div>${doneTasks}/${totalTasks} completed</div>`;
  }
  if(log?.note) glance.innerHTML += `<div class="log-glance-pill">Reflection added</div>`;

  activeGoals.forEach(g => {
    const e = g.entries.find(en => en.date === key);
    if(e) glance.innerHTML += `<div class="log-glance-pill" style="color:${g.hex};border-color:${g.hex}22">+${fmtMetric(e.val,g.unit)}</div>`;
  });

  if(!glance.children.length){
    glance.innerHTML = `<div class="log-glance-pill" style="color:var(--ink-muted)">${isToday ? 'No check-ins yet today' : 'No check-ins yet for this day'}</div>`;
  }

  const fill = document.getElementById('always-day-progress-fill');
  const text = document.getElementById('always-day-progress-text');
  if(fill && text){
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    fill.style.width = `${pct}%`;
    if(totalTasks === 0){
      text.textContent = 'No intentions yet';
    } else if(doneTasks === totalTasks){
      text.textContent = 'All done today';
    } else {
      text.textContent = `${doneTasks}/${totalTasks} done`;
    }
  }
}

function selectDay(day, cell){
  selectedDate  = day;
  selectedMonth = calMonth;
  selectedYear  = calYear;
  if (typeof alwaysExpandedGoalId !== 'undefined') alwaysExpandedGoalId = null;

  document.querySelectorAll('.cal-cell').forEach(c=>c.classList.remove('selected'));
  cell.classList.add('selected');

  const dt = new Date(calYear, calMonth, day);
  const key = `${calYear}-${calMonth}-${day}`;
  const log = dayLogs[key];

  document.getElementById('log-date-heading').textContent =
    dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const picker = document.getElementById('always-day-picker');
  if(picker) picker.value = toDateInputValue(calYear, calMonth, day);

  document.getElementById('mood-select').value  = log?.mood  || '';
  document.getElementById('sleep-select').value = log?.sleep || '';
  document.getElementById('day-note').value     = log?.note  || '';

  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, calYear, calMonth, day));
  const baseTasks = getPersonalIntentionRowsForDate(calYear, calMonth, day, false);
  const goalLinkedRows = buildGoalLinkedIntentionRows(log, activeGoals);

  renderAlwaysPanel(calYear, calMonth, day);
  renderLogGoalMetrics(calYear, calMonth, day);
  renderDayGlance(calYear, calMonth, day, baseTasks, goalLinkedRows);
  renderRightPanelIntentions();

  const panel = document.getElementById('always-panel');
  if(panel) setTimeout(()=> panel.scrollIntoView({behavior:'smooth', block:'nearest'}), 60);
}

function goToDay(yr, mo, dy, shouldScroll){
  const yy = Number(yr);
  const mm = Number(mo);
  const dd = Number(dy);
  if(!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return;

  calYear = yy;
  calMonth = mm;
  selectedYear = yy;
  selectedMonth = mm;
  selectedDate = dd;
  if (typeof alwaysExpandedGoalId !== 'undefined') alwaysExpandedGoalId = null;

  buildCalendar();
  const cells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  const cell = cells[dd - 1];
  if(cell){
    selectDay(dd, cell);
    return;
  }

  const key = `${yy}-${mm}-${dd}`;
  const log = dayLogs[key];
  const heading = document.getElementById('log-date-heading');
  if(heading){
    heading.textContent = new Date(yy, mm, dd).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }
  const picker = document.getElementById('always-day-picker');
  if(picker) picker.value = toDateInputValue(yy, mm, dd);

  const mood = document.getElementById('mood-select');
  const sleep = document.getElementById('sleep-select');
  const note = document.getElementById('day-note');
  if(mood) mood.value = log?.mood || '';
  if(sleep) sleep.value = log?.sleep || '';
  if(note) note.value = log?.note || '';

  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, yy, mm, dd));
  const baseTasks = getPersonalIntentionRowsForDate(yy, mm, dd, false);
  const goalLinkedRows = buildGoalLinkedIntentionRows(log, activeGoals);
  renderAlwaysPanel(yy, mm, dd);
  renderLogGoalMetrics(yy, mm, dd);
  renderDayGlance(yy, mm, dd, baseTasks, goalLinkedRows);
  renderRightPanelIntentions();

  if(shouldScroll){
    const panel = document.getElementById('always-panel');
    if(panel) setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 60);
  }
}

function stepSelectedDay(offset){
  const yy = selectedYear ?? TODAY_CAL.year;
  const mm = selectedMonth ?? TODAY_CAL.month;
  const dd = selectedDate ?? TODAY_CAL.day;
  const next = new Date(yy, mm, dd);
  next.setDate(next.getDate() + Number(offset || 0));
  goToDay(next.getFullYear(), next.getMonth(), next.getDate(), false);
}

function openSelectedDayPicker(){
  const picker = document.getElementById('always-day-picker');
  if(!picker) return;
  const yy = selectedYear ?? TODAY_CAL.year;
  const mm = selectedMonth ?? TODAY_CAL.month;
  const dd = selectedDate ?? TODAY_CAL.day;
  picker.value = toDateInputValue(yy, mm, dd);
  if(typeof picker.showPicker === 'function') picker.showPicker();
  else picker.click();
}

function jumpToSelectedDay(value){
  if(!value) return;
  const selected = new Date(`${value}T12:00:00`);
  if(Number.isNaN(selected.getTime())) return;
  goToDay(selected.getFullYear(), selected.getMonth(), selected.getDate(), false);
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
  const key = `${yy}-${mm}-${dd}`;

  setPersonalIntentionCheckedByText(text, yy, mm, dd, isDone);
  const goalSyncChanged = syncGoalSubsFromPersonalText(text, isDone, yy, mm, dd);
  const autoChanged = applyAutoMetricForIntentionText(text, isDone, yy, mm, dd);

  if(goalSyncChanged || autoChanged){
    rerenderGoalsKeepExpanded();
    renderCalGoalStrip();
  }

  buildCalendar();
  renderAlwaysPanel(yy, mm, dd);
  renderDayGlance(
    yy,
    mm,
    dd,
    getPersonalIntentionRowsForDate(yy, mm, dd, false),
    buildGoalLinkedIntentionRows(dayLogs[key], GOALS.filter(g => goalActiveOnDay(g, yy, mm, dd)))
  );
  if(yy === TODAY_CAL.year && mm === TODAY_CAL.month && dd === TODAY_CAL.day){
    const matchedTodayIds = getPersonalIntentionRowsForDate(yy, mm, dd, true)
      .filter(r => textsMatch(r.text, text))
      .map(r => r.id);
    if(matchedTodayIds.length){
      matchedTodayIds.forEach(id => updateRightPanelIntentions(id, isDone));
    } else {
      renderRightPanelIntentions();
    }
  } else {
    renderRightPanelIntentions();
  }
}

// Save daily log state
function saveLog(){
  const key = `${calYear}-${calMonth}-${selectedDate}`;
  const mood  = document.getElementById('mood-select')?.value || '';
  const sleep = document.getElementById('sleep-select')?.value || '';
  const note  = document.getElementById('day-note')?.value || '';

  const activeGoals = GOALS.filter(g => goalActiveOnDay(g, calYear, calMonth, selectedDate));
  const log = ensureDayLogEntry(key);
  const existingTasks = log.tasks || [];

  const personalTasks = getPersonalIntentionRowsForDate(calYear, calMonth, selectedDate, true).map(row => {
    const saved = existingTasks.find(t => !t._fromGoal && (t._intentId === row.id || textsMatch(t.text, row.text)));
    return {
      text: row.text,
      checked: saved ? !!saved.checked : !!row.checked,
      _intentId: row.id,
      badge: null,
      badgeColor: null,
      _fromGoal: null,
      _subId: null
    };
  });

  const goalTasks = activeGoals.flatMap(g => {
    return g.subs.map(s => {
      const saved = existingTasks.find(t => t._fromGoal === g.id && (t._subId === s.id || textsMatch(t.text, s.text)));
      const checked = isTodayDate(calYear, calMonth, selectedDate) ? !!s.done : (saved ? !!saved.checked : false);
      return {
        text: s.text,
        checked,
        badgeColor: g.hex,
        badge: g.name,
        _fromGoal: g.id,
        _subId: s.id
      };
    });
  });

  dayLogs[key] = { mood, sleep, note, tasks:[...personalTasks, ...goalTasks] };

  buildCalendar();
  const allCells = document.querySelectorAll('.cal-grid .cal-cell:not(.other-month)');
  if(allCells[selectedDate-1]) allCells[selectedDate-1].classList.add('selected');

  renderAlwaysPanel(calYear, calMonth, selectedDate);
  renderDayGlance(calYear, calMonth, selectedDate, getPersonalIntentionRowsForDate(calYear, calMonth, selectedDate, false), buildGoalLinkedIntentionRows(dayLogs[key], activeGoals));
  renderRightPanelIntentions();
  showToast('Day logged. Every day counts.');
}

// Intentions model: personal intentions support day, daily, alternate, weekly, and custom schedules.
let intentionsStore = [
  { id:'pi1', text:'Read 10 pages before bed', recurrence:'daily' },
  { id:'pi2', text:'Take a 15-minute walk after lunch', recurrence:'daily' },
  { id:'pi3', text:'Call Sarah for a quick check-in', recurrence:'day', dateKey:TODAY_KEY },
];

function syncIntentionsToCalendar() {
  getPersonalIntentionRowsForDate(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day, true);
  const yy = selectedYear ?? TODAY_CAL.year;
  const mm = selectedMonth ?? TODAY_CAL.month;
  const dd = selectedDate ?? TODAY_CAL.day;
  getPersonalIntentionRowsForDate(yy, mm, dd, true);

  buildCalendar();
  renderCalGoalStrip();
  renderAlwaysPanel(yy, mm, dd);
  const key = `${yy}-${mm}-${dd}`;
  renderDayGlance(yy, mm, dd, getPersonalIntentionRowsForDate(yy, mm, dd, false), buildGoalLinkedIntentionRows(dayLogs[key], GOALS.filter(g => goalActiveOnDay(g, yy, mm, dd))));
  renderRightPanelIntentions();
}

function resolveCssVar(v){
  const map = {
    'var(--gold)':'#C4963A','var(--sage)':'#6B8C7A','var(--sky)':'#5B7EA6',
    'var(--rose)':'#B5705B','var(--ink)':'#1A1714','var(--violet)':'#7B6FA0',
    'var(--ink-muted)':'#8C857D'
  };
  return map[v] || v;
}

let intentionAdderContext = {
  yr: TODAY_CAL.year,
  mo: TODAY_CAL.month,
  dy: TODAY_CAL.day,
  open:false,
  mode:'day',
  customDays:[new Date(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day).getDay()],
  customIntervalWeeks:1
};
const rightPanelIntentionRemovalTimers = new Map();

function openIntentionAdder(yr, mo, dy) {
  const yy = Number.isInteger(yr) ? yr : (selectedYear ?? TODAY_CAL.year);
  const mm = Number.isInteger(mo) ? mo : (selectedMonth ?? TODAY_CAL.month);
  const dd = Number.isInteger(dy) ? dy : (selectedDate ?? TODAY_CAL.day);
  const weekday = new Date(yy, mm, dd).getDay();
  intentionAdderContext = {
    yr: yy,
    mo: mm,
    dy: dd,
    open:true,
    mode:'day',
    customDays:[weekday],
    customIntervalWeeks:1
  };
  renderAlwaysPanel(yy, mm, dd);
  setTimeout(() => document.getElementById('always-intention-input')?.focus(), 40);
}

function closeIntentionAdder() {
  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  const weekday = new Date(yy, mm, dd).getDay();
  intentionAdderContext = {
    yr: yy,
    mo: mm,
    dy: dd,
    open:false,
    mode:'day',
    customDays:[weekday],
    customIntervalWeeks:1
  };

  renderAlwaysPanel(yy, mm, dd);
}

function setIntentionAdderMode(mode){
  if(!['daily', 'day', 'alternate', 'weekly', 'custom'].includes(mode)) return;
  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  const fallbackWeekday = new Date(yy, mm, dd).getDay();

  intentionAdderContext.mode = mode;
  intentionAdderContext.customDays = normalizeIntentWeekdays(intentionAdderContext.customDays, fallbackWeekday);
  intentionAdderContext.customIntervalWeeks = [1, 2, 4].includes(Number(intentionAdderContext.customIntervalWeeks))
    ? Number(intentionAdderContext.customIntervalWeeks)
    : 1;

  renderAlwaysPanel(yy, mm, dd);
  setTimeout(() => document.getElementById('always-intention-input')?.focus(), 0);
}

function toggleIntentionCustomSchedule(){
  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  const fallbackWeekday = new Date(yy, mm, dd).getDay();

  if(intentionAdderContext?.mode === 'custom'){
    intentionAdderContext.mode = 'day';
  } else {
    intentionAdderContext.mode = 'custom';
    intentionAdderContext.customDays = normalizeIntentWeekdays(intentionAdderContext.customDays, fallbackWeekday);
  }

  renderAlwaysPanel(yy, mm, dd);
  setTimeout(() => document.getElementById('always-intention-input')?.focus(), 0);
}

function toggleIntentionCustomDay(dayIndex){
  if(!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) return;
  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  const fallbackWeekday = new Date(yy, mm, dd).getDay();

  const existing = normalizeIntentWeekdays(intentionAdderContext?.customDays, fallbackWeekday);
  const next = existing.includes(dayIndex)
    ? existing.filter(d => d !== dayIndex)
    : [...existing, dayIndex];

  intentionAdderContext.customDays = normalizeIntentWeekdays(next, fallbackWeekday);
  intentionAdderContext.mode = 'custom';
  renderAlwaysPanel(yy, mm, dd);
}

function setIntentionCustomInterval(weeks){
  const parsed = Number(weeks);
  if(![1, 2, 4].includes(parsed)) return;
  intentionAdderContext.customIntervalWeeks = parsed;
  intentionAdderContext.mode = 'custom';
  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  renderAlwaysPanel(yy, mm, dd);
}

function recurrenceToastLabel(recurrence){
  if(recurrence === 'daily') return 'Added daily intention.';
  if(recurrence === 'day') return 'Added intention for this day.';
  if(recurrence === 'alternate') return 'Added alternate-day intention.';
  if(recurrence === 'weekly') return 'Added weekly intention.';
  if(recurrence === 'custom') return 'Added custom-schedule intention.';
  return 'Added intention.';
}

function addIntention() {
  const input = document.getElementById('always-intention-input');
  if(!input) return;
  const text = input.value.trim();
  if (!text) {
    input.style.borderColor = '#B5705B';
    setTimeout(() => { input.style.borderColor = ''; }, 900);
    return;
  }

  const yy = intentionAdderContext?.yr ?? (selectedYear ?? TODAY_CAL.year);
  const mm = intentionAdderContext?.mo ?? (selectedMonth ?? TODAY_CAL.month);
  const dd = intentionAdderContext?.dy ?? (selectedDate ?? TODAY_CAL.day);
  const key = `${yy}-${mm}-${dd}`;
  const recurrence = ['daily', 'day', 'alternate', 'weekly', 'custom'].includes(intentionAdderContext?.mode)
    ? intentionAdderContext.mode
    : 'day';
  const fallbackWeekday = new Date(yy, mm, dd).getDay();
  const customDays = normalizeIntentWeekdays(intentionAdderContext?.customDays, fallbackWeekday);
  const customIntervalWeeks = [1, 2, 4].includes(Number(intentionAdderContext?.customIntervalWeeks))
    ? Number(intentionAdderContext.customIntervalWeeks)
    : 1;

  const candidate = {
    recurrence,
    ...(recurrence === 'day' ? { dateKey:key } : {}),
    ...(recurrence === 'alternate' ? { anchorKey:key } : {}),
    ...(recurrence === 'weekly' ? { anchorKey:key } : {}),
    ...(recurrence === 'custom' ? { anchorKey:key, weekdays:customDays, intervalWeeks:customIntervalWeeks } : {})
  };

  const duplicate = intentionsStore.some(intent =>
    textsMatch(intent.text, text) &&
    getIntentRecurrenceSignature(intent) === getIntentRecurrenceSignature(candidate)
  );
  if(duplicate){
    showToast('That intention already exists.');
    return;
  }

  const newIntent = {
    id: `pi-${Date.now()}`,
    text,
    ...candidate
  };
  intentionsStore.push(newIntent);

  getPersonalIntentionRowsForDate(yy, mm, dd, true);
  closeIntentionAdder();
  buildCalendar();
  renderAlwaysPanel(yy, mm, dd);
  renderDayGlance(yy, mm, dd, getPersonalIntentionRowsForDate(yy, mm, dd, false), buildGoalLinkedIntentionRows(dayLogs[key], GOALS.filter(g => goalActiveOnDay(g, yy, mm, dd))));
  renderRightPanelIntentions();

  showToast(recurrenceToastLabel(recurrence));
}

function renderRightPanelIntentions(enterIntentId){
  const list = document.getElementById('intentions-list');
  if(!list) return;

  const rows = getPersonalIntentionRowsForDate(TODAY_CAL.year, TODAY_CAL.month, TODAY_CAL.day, true)
    .filter(r => !r.checked);

  if(!rows.length){
    list.innerHTML = `<div class="at-empty" style="padding:4px 0">All clear for today.</div>`;
    return;
  }

  list.innerHTML = rows.map(r =>
    `<div class="intention-item${enterIntentId===r.id ? ' is-entering' : ''}" data-intent-id="${r.id}" onclick="toggleIntention('${r.id}')"><div class="intention-check"></div><div class="intention-text">${r.text}</div></div>`
  ).join('');

  if(enterIntentId){
    const entering = list.querySelector(`.intention-item[data-intent-id="${enterIntentId}"]`);
    if(entering){
      requestAnimationFrame(() => entering.classList.remove('is-entering'));
    }
  }
}

function updateRightPanelIntentions(intentId, nextChecked){
  const list = document.getElementById('intentions-list');
  if(!list || !intentId){
    renderRightPanelIntentions();
    return;
  }

  const pendingTimer = rightPanelIntentionRemovalTimers.get(intentId);
  if(pendingTimer){
    clearTimeout(pendingTimer);
    rightPanelIntentionRemovalTimers.delete(intentId);
  }

  if(nextChecked){
    const item = list.querySelector(`.intention-item[data-intent-id="${intentId}"]`);
    if(item){
      item.classList.add('done');
      const check = item.querySelector('.intention-check');
      if(check) check.textContent = '✓';
      item.classList.add('is-removing');
      const timer = setTimeout(() => {
        rightPanelIntentionRemovalTimers.delete(intentId);
        renderRightPanelIntentions();
      }, 320);
      rightPanelIntentionRemovalTimers.set(intentId, timer);
      return;
    }
    renderRightPanelIntentions();
    return;
  }

  renderRightPanelIntentions(intentId);
}

function toggleIntention(intentId) {
  const yy = TODAY_CAL.year;
  const mm = TODAY_CAL.month;
  const dd = TODAY_CAL.day;
  const key = `${yy}-${mm}-${dd}`;

  const rows = getPersonalIntentionRowsForDate(yy, mm, dd, true);
  const row = rows.find(r => r.id === intentId);
  if(!row) return;

  const next = !row.checked;
  setPersonalIntentionChecked(intentId, yy, mm, dd, next);
  const goalSyncChanged = syncGoalSubsFromPersonalText(row.text, next, yy, mm, dd);
  const autoChanged = applyAutoMetricForIntentionText(row.text, next, yy, mm, dd);

  buildCalendar();
  renderCalGoalStrip();
  if(goalSyncChanged || autoChanged) rerenderGoalsKeepExpanded();

  renderAlwaysPanel(selectedYear ?? yy, selectedMonth ?? mm, selectedDate ?? dd);
  renderDayGlance(selectedYear ?? yy, selectedMonth ?? mm, selectedDate ?? dd, getPersonalIntentionRowsForDate(selectedYear ?? yy, selectedMonth ?? mm, selectedDate ?? dd, false), buildGoalLinkedIntentionRows(dayLogs[`${selectedYear ?? yy}-${selectedMonth ?? mm}-${selectedDate ?? dd}`], GOALS.filter(g => goalActiveOnDay(g, selectedYear ?? yy, selectedMonth ?? mm, selectedDate ?? dd))));
  updateRightPanelIntentions(intentId, next);

  if(next) showToast('Intention complete. Pattern builds.');
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

