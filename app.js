const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringCtx = null;
let ringNode = null;

// ---- Clock ----
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// ---- Save ----
function save() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

// ---- Render ----
function render() {
  const container = document.getElementById('alarms');
  const emptyMsg = document.getElementById('empty-msg');

  container.innerHTML = '';
  emptyMsg.style.display = alarms.length === 0 ? 'block' : 'none';

  alarms.forEach(alarm => {
    const card = document.createElement('div');
    card.className = `alarm-card${alarm.enabled ? '' : ' disabled'}`;

    const daysText = alarm.days.length === 0
      ? '繰り返しなし'
      : alarm.days.length === 7
        ? '毎日'
        : alarm.days.map(d => DAY_NAMES[d]).join(' ');

    card.innerHTML = `
      <div class="alarm-info">
        <div class="alarm-time">${alarm.time}</div>
        <div class="alarm-meta">${alarm.label ? alarm.label + ' ・ ' : ''}${daysText}</div>
      </div>
      <div class="alarm-actions">
        <label class="toggle">
          <input type="checkbox" ${alarm.enabled ? 'checked' : ''} data-id="${alarm.id}">
          <span class="toggle-slider"></span>
        </label>
        <button class="btn-delete" data-id="${alarm.id}" title="削除">✕</button>
      </div>
    `;

    card.querySelector('input[type="checkbox"]').addEventListener('change', e => {
      const a = alarms.find(x => x.id === e.target.dataset.id);
      if (a) { a.enabled = e.target.checked; save(); render(); }
    });

    card.querySelector('.btn-delete').addEventListener('click', e => {
      alarms = alarms.filter(x => x.id !== e.target.dataset.id);
      save();
      render();
    });

    container.appendChild(card);
  });
}

// ---- Add alarm ----
const form = document.getElementById('alarm-form');
const dayBtns = document.querySelectorAll('.day-btn');
let selectedDays = [];

dayBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const d = Number(btn.dataset.day);
    if (selectedDays.includes(d)) {
      selectedDays = selectedDays.filter(x => x !== d);
      btn.classList.remove('active');
    } else {
      selectedDays.push(d);
      btn.classList.add('active');
    }
  });
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const time = document.getElementById('alarm-time').value;
  if (!time) return;

  alarms.push({
    id: Date.now().toString(),
    time,
    label: document.getElementById('alarm-label').value.trim(),
    days: [...selectedDays].sort(),
    enabled: true,
  });

  save();
  render();

  // reset form
  form.reset();
  selectedDays = [];
  dayBtns.forEach(b => b.classList.remove('active'));
});

// ---- Sound (Web Audio API) ----
function startRing() {
  stopRing();
  ringCtx = new (window.AudioContext || window.webkitAudioContext)();

  function beep() {
    if (!ringCtx) return;
    const osc = ringCtx.createOscillator();
    const gain = ringCtx.createGain();
    osc.connect(gain);
    gain.connect(ringCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ringCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ringCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.6, ringCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ringCtx.currentTime + 0.4);
    osc.start(ringCtx.currentTime);
    osc.stop(ringCtx.currentTime + 0.4);
  }

  beep();
  ringNode = setInterval(beep, 1000);
}

function stopRing() {
  clearInterval(ringNode);
  ringNode = null;
  if (ringCtx) { ringCtx.close(); ringCtx = null; }
}

// ---- Modal ----
const modal = document.getElementById('modal');

function showModal(alarm) {
  document.getElementById('modal-label').textContent = alarm.label || '';
  document.getElementById('modal-time').textContent = alarm.time;
  modal.classList.remove('hidden');
  startRing();
}

document.getElementById('stop-btn').addEventListener('click', () => {
  modal.classList.add('hidden');
  stopRing();
});

// ---- Check alarms ----
let lastChecked = '';

function checkAlarms() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm === lastChecked) return;
  lastChecked = hhmm;

  const today = now.getDay();
  alarms.forEach(alarm => {
    if (!alarm.enabled) return;
    if (alarm.time !== hhmm) return;
    if (alarm.days.length > 0 && !alarm.days.includes(today)) return;
    showModal(alarm);

    // 繰り返しなしなら自動でOFF
    if (alarm.days.length === 0) {
      alarm.enabled = false;
      save();
      render();
    }
  });
}

setInterval(checkAlarms, 5000);
checkAlarms();

render();
