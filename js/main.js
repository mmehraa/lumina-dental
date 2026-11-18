import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { SplitText } from 'gsap/SplitText.js';
import Lenis from 'lenis';
import { initTooth } from './tooth.js';
import { initBooking } from './booking.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

$('#year').textContent = new Date().getFullYear();

/* ---------- Smooth scrolling ---------- */
const lenis = reduce ? null : new Lenis({ lerp: 0.1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const target = id === '#' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  if (lenis) lenis.scrollTo(target, { offset: id === '#' ? 0 : -90, duration: 1.4 });
  else target.scrollIntoView();
}));

/* ---------- Header: hide on the way down, show on the way up ---------- */
const nav = $('#nav');
if (lenis) lenis.on('scroll', ({ scroll, direction }) => nav.classList.toggle('is-hidden', direction === 1 && scroll > 400));

/* ---------- Mobile menu ---------- */
const burger = $('#burger'), menu = $('#mobile-menu');
function closeMenu() { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); lenis?.start(); }
burger.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
  if (open) { lenis?.stop(); if (!reduce) gsap.from($$('a', menu), { y: 40, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out' }); }
  else lenis?.start();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) closeMenu(); });

/* ---------- 3D tooth ---------- */
const tooth = initTooth($('#tooth'), { reduce });

/* ---------- Services: 3D tilt + spotlight that follows the cursor ---------- */
if (fine && !reduce) {
  $$('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ---------- Before / after slider ---------- */
const compare = $('#compare');
const range = $('.compare-range', compare);
const setPos = (v) => compare.style.setProperty('--pos', `${v}%`);
range.addEventListener('input', () => { sweep?.kill(); setPos(range.value); });
let sweep;
if (!reduce) {
  const o = { v: 50 };
  sweep = gsap.timeline({ paused: true, onUpdate: () => { setPos(o.v); range.value = o.v; } })
    .to(o, { v: 18, duration: 1.1, ease: 'power2.inOut' })
    .to(o, { v: 82, duration: 1.4, ease: 'power2.inOut' })
    .to(o, { v: 50, duration: 1, ease: 'power2.inOut' });
  ScrollTrigger.create({ trigger: compare, start: 'top 70%', once: true, onEnter: () => sweep.play() });
  compare.addEventListener('pointerdown', () => sweep.kill());
}

/* ---------- Reviews (written once, duplicated for a seamless loop) ---------- */
const reviews = [
  ['Hannah K.', 'I used to cancel every dentist appointment. Here I actually look forward to it. They explain everything and never rush.'],
  ['Diego M.', 'Chipped a tooth on a Saturday, called at 9 and was fixed by 11. Honestly couldn\'t believe it.'],
  ['Priya S.', 'Whitening was painless and the result looks natural, not fake. Got compliments for weeks.'],
  ['Tom W.', 'Seeing my 3D scan on the screen made everything so clear. Price upfront, no surprises.'],
  ['Aisha B.', 'My kids ask when they can go back to "the TV dentist". That says it all.'],
  ['Ryan C.', 'Aligners done in 9 months. Dr. Okafor checked in every step of the way.'],
  ['Mei L.', 'Spotless clinic, warm team, and they text reminders. Easiest healthcare I have.'],
  ['Jonah P.', 'Implant looks and feels exactly like my real tooth. Worth every cent.'],
];
const card = ([name, text]) => `
  <article class="review"><p class="stars" aria-label="5 out of 5 stars">★★★★★</p><blockquote>“${text}”</blockquote>
  <footer><span class="avatar" aria-hidden="true">${name[0]}</span><span><b>${name}</b>Google review</span></footer></article>`;
$$('[data-reviews]').forEach((track) => {
  const half = track.dataset.reviews === '0' ? reviews.slice(0, 4) : reviews.slice(4);
  const html = half.map(card).join('');
  track.innerHTML = html + html.replace(/<article class="review"/g, '<article class="review" aria-hidden="true"');
});

/* ---------- FAQ accordion ---------- */
$$('.faq-q').forEach((q) => q.addEventListener('click', () => {
  const open = q.getAttribute('aria-expanded') === 'true';
  $$('.faq-q').forEach((o) => o.setAttribute('aria-expanded', 'false'));
  q.setAttribute('aria-expanded', String(!open));
  setTimeout(() => ScrollTrigger.refresh(), 550);
}));

/* ---------- Booking ---------- */
initBooking({ gsap, reduce });

/* ---------- Scroll animations (after fonts load so text measures correctly) ---------- */
document.fonts.ready.then(() => {
  if (reduce) return;

  // Hero: words rise from masked lines, the rest fades in, the tooth pops in.
  const heroSplit = SplitText.create('[data-hero-title]', { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
  gsap.set('[data-hero-title]', { visibility: 'visible' });
  const intro = gsap.timeline({ delay: 0.15 })
    .from(heroSplit.words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.07 })
    .from('.hero-fade', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.3)
    .from('.chip', { scale: 0.6, opacity: 0, duration: 0.9, ease: 'back.out(2)', stagger: 0.12 }, 0.7);
  if (tooth) {
    intro.from(tooth.holder.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 1.8, ease: 'elastic.out(1, 0.55)' }, 0.2);
    // Scrolling away spins the tooth and lifts it out of view.
    gsap.to(tooth.holder.rotation, { y: Math.PI * 1.5, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to(tooth.holder.position, { y: 1.6, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  }

  // Section headings.
  $$('[data-split]').forEach((el) => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(el, { visibility: 'visible' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // Fade-ups.
  gsap.set('[data-fade]', { y: 40, opacity: 0 });
  ScrollTrigger.batch('[data-fade]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1 }),
  });

  // Visit timeline: the wavy line draws itself and each step lights up.
  gsap.to('.line-fg', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 65%', end: 'bottom 65%', scrub: true } });
  const num = $('#visit-num');
  $$('.step').forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step, start: 'top 65%',
      onEnter: () => { step.classList.add('is-active'); num.textContent = `0${i + 1}`; },
      onLeaveBack: () => { step.classList.remove('is-active'); num.textContent = `0${Math.max(1, i)}`; },
    });
  });

  // Count-up stats.
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count), dec = Number(el.dataset.decimals || 0), suf = el.dataset.suffix || '', o = { v: 0 };
    const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf;
    el.textContent = fmt(0);
    gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); }, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Team photos: a gentle parallax per column.
  $$('.member').forEach((m, i) => gsap.fromTo(m, { y: 30 + (i % 2) * 40 }, { y: -(i % 2) * 40, ease: 'none', scrollTrigger: { trigger: '.team', start: 'top bottom', end: 'bottom top', scrub: true } }));

  // Footer wordmark rises up.
  gsap.from('.footer-word', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer-word', start: 'top 98%' } });

  ScrollTrigger.refresh();
});
