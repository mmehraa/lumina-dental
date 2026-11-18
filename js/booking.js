/*
  Three-step booking widget: service → date & time → details → confirmation.
  Demo only: nothing is sent anywhere. For a real clinic, POST the FormData in finish()
  to the practice's booking system (e.g. NexHealth, Calendly or a form service).
*/

const LABELS = ['Choose a service', 'Pick a date & time', 'Your details'];
const DAY = 864e5;
const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Deterministic "already booked" slots so the calendar looks realistic but stable.
const isTaken = (key) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 10 < 3;
};

const toLabel = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
};

export function initBooking({ gsap, reduce }) {
  const root = document.getElementById('booking');
  if (!root) return;
  const form = root.querySelector('#booking-form');
  const steps = [...root.querySelectorAll('.bstep')];
  const bar = root.querySelector('#booking-bar');
  const label = root.querySelector('#booking-label');
  const error = root.querySelector('#booking-error');
  const back = root.querySelector('#booking-back');
  const next = root.querySelector('#booking-next');
  const datesEl = root.querySelector('#dates');
  const timesEl = root.querySelector('#times');
  let step = 0;

  // Next 12 open days (closed Sundays).
  const days = [];
  for (let d = new Date(); days.length < 12; d = new Date(d.getTime() + DAY)) if (d.getDay() !== 0) days.push(new Date(d));
  datesEl.innerHTML = days.map((d, i) => `
    <label><input type="radio" name="date" value="${d.toDateString()}" ${i === 0 ? 'checked' : ''} />
      <span><small>${i === 0 ? 'Today' : fmtDay.format(d)}</small><b>${d.getDate()}</b><small>${d.toLocaleString('en-US', { month: 'short' })}</small></span></label>`).join('');

  const renderTimes = () => {
    const ds = form.date.value, d = new Date(ds);
    const [open, close] = d.getDay() === 6 ? [9 * 60, 13 * 60 + 30] : [8 * 60, 17 * 60 + 30];
    const now = new Date(), isToday = d.toDateString() === now.toDateString();
    const nowMins = now.getHours() * 60 + now.getMinutes() + 30;
    let html = '', free = 0;
    for (let m = open; m <= close; m += 30) {
      const disabled = isTaken(ds + m) || (isToday && m < nowMins);
      if (!disabled) free++;
      html += `<label><input type="radio" name="time" value="${toLabel(m)}" ${disabled ? 'disabled' : ''} /><span>${toLabel(m)}</span></label>`;
    }
    timesEl.innerHTML = free ? html : '<p class="times-empty">Fully booked. Please pick another day.</p>';
    return free;
  };
  datesEl.addEventListener('change', renderTimes);
  // Start on the first day that still has free slots (e.g. skip "today" in the evening).
  const selectFirstFree = () => {
    for (const r of datesEl.querySelectorAll('input')) { r.checked = true; if (renderTimes()) return; }
  };
  selectFirstFree();

  const show = (i) => {
    const from = steps[step];
    step = i;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    const done = i === steps.length - 1;
    root.classList.toggle('is-done', done);
    bar.style.width = done ? '100%' : `${((i + 1) / 3) * 100}%`;
    label.textContent = done ? '' : `Step ${i + 1} of 3 · ${LABELS[i]}`;
    back.hidden = i === 0 || done;
    next.textContent = i === 2 ? 'Confirm booking' : 'Continue →';
    error.textContent = '';
    if (!reduce && from !== steps[i]) gsap.fromTo(steps[i], { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  };

  const validate = () => {
    if (step === 0 && !form.service.value) return 'Please choose a service.';
    if (step === 1 && !(form.date.value && form.time?.value)) return 'Please pick a date and an available time.';
    if (step === 2) {
      let ok = true;
      for (const name of ['name', 'phone', 'email']) {
        const input = form[name], valid = input.value.trim() !== '' && input.checkValidity();
        input.setAttribute('aria-invalid', String(!valid));
        ok &&= valid;
      }
      if (!ok) return 'Please fill in your name, mobile number and a valid email.';
    }
    return '';
  };

  const finish = () => {
    const f = new FormData(form);
    root.querySelector('#booking-summary').textContent =
      `${f.get('service')} on ${fmtLong.format(new Date(f.get('date')))} at ${f.get('time')}. We'll text a confirmation to ${f.get('phone')}.`;
    show(3);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      error.textContent = msg;
      if (!reduce) gsap.fromTo(root, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    if (step === 2) finish();
    else show(step + 1);
  });
  back.addEventListener('click', () => show(step - 1));
  root.querySelector('#booking-again').addEventListener('click', () => {
    form.reset();
    selectFirstFree();
    show(0);
  });
  // Choosing a service moves straight on, which feels snappier.
  form.addEventListener('change', (e) => {
    if (e.target.name === 'service') setTimeout(() => step === 0 && show(1), 250);
  });
}
