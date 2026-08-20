/* ============ SCARI — scroll engine ============ */
document.documentElement.classList.add("js"); /* reveal-hiding only applies when JS is confirmed present */
gsap.registerPlugin(ScrollTrigger);

const LANG = window.SITE_LANG || "pt";
const BASE = window.ASSET_BASE || "assets/";
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* layout experiment: "b" = hero is the opening cover, the film plays on scroll-out;
   "a" = the film opens the site and hands off into the hero. Revert = flip this flag. */
const LAYOUT = window.SITE_LAYOUT || "b";
document.body.classList.add("layout-" + LAYOUT);

/* ---------- i18n strings used from JS ---------- */
const STR = {
  pt: {
    simLines: [
      "→ lendo sua ideia…",
      "→ mapeando componentes necessários…",
      "→ estimando complexidade e prazo…",
      "→ verificando capacidade do estúdio…",
    ],
    simDone: "<b>✓</b> análise concluída",
    errNoCat: "Escolha uma categoria para rodar a análise.",
    errNoText: "Resuma sua ideia em poucas palavras para rodar a análise.",
    tradStatuses: [
      "levantando requisitos…",
      "reunião de alinhamento…",
      "documentando…",
      "aguardando aprovação…",
      "replanejando…",
    ],
    scariBuilding: "construindo…",
    scariShipped: "lançado ✓ · aprendendo com usuários",
    copied: "copiado ✓",
    copyLabel: "Copiar briefing",
    waPrefix: "Olá! Preenchi o briefing no site da SCARI:\n\n",
    mail: { type: "Tipo de projeto", idea: "Ideia", budget: "Orçamento", timeline: "Prazo", name: "Nome", company: "Empresa", email: "E-mail", phone: "Telefone", none: "Não informado", subject: "Novo projeto" },
  },
  en: {
    simLines: [
      "→ reading your idea…",
      "→ mapping required components…",
      "→ estimating complexity and timeline…",
      "→ checking studio capacity…",
    ],
    simDone: "<b>✓</b> analysis complete",
    errNoCat: "Pick a category to run the analysis.",
    errNoText: "Sum up your idea in a few words to run the analysis.",
    tradStatuses: [
      "gathering requirements…",
      "alignment meeting…",
      "writing documentation…",
      "waiting for approval…",
      "re-planning…",
    ],
    scariBuilding: "building…",
    scariShipped: "shipped ✓ · learning from users",
    copied: "copied ✓",
    copyLabel: "Copy briefing",
    waPrefix: "Hi! I filled the briefing on the SCARI site:\n\n",
    mail: { type: "Project type", idea: "Idea", budget: "Budget", timeline: "Timeline", name: "Name", company: "Company", email: "Email", phone: "Phone", none: "Not specified", subject: "New project" },
  },
}[LANG];

/* ---------- smooth scroll (Lenis + GSAP); native scrolling under reduced motion ---------- */
let lenis = null;
if (!REDUCE) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollToTarget(target, opts = {}) {
  if (lenis) { lenis.scrollTo(target, opts); return; }
  if (typeof target === "number") window.scrollTo({ top: target });
  else target.scrollIntoView();
}

/* ============================================================
   INTRO — pinned canvas sequence + hero overlay
   Pacing: yellow takeover + dive (35% of the film) gets ~18%
   of the scroll; the hero rises OVER the dive into black.
   ============================================================ */
const FRAME_COUNT = 302; /* 30fps × ~10s — dense enough that scrubbing back and forth stays fluid */
const framePath = (i) => `${BASE}intro/frame_${String(i).padStart(3, "0")}.jpg`;

/* film segments in normalized frame fractions (robust to frame-count changes) */
const SEGMENTS = [
  { p0: 0.0, p1: 0.12, f0: 0.0, f1: 0.147 },
  { p0: 0.12, p1: 0.52, f0: 0.147, f1: 0.4 },
  { p0: 0.52, p1: 0.82, f0: 0.4, f1: 0.647 },
  { p0: 0.82, p1: 1.0, f0: 0.647, f1: 1.0 },
];
function progressToFrame(p) {
  p = Math.min(Math.max(p, 0), 1);
  const last = FRAME_COUNT - 1;
  for (const s of SEGMENTS) {
    if (p <= s.p1) {
      const local = (p - s.p0) / (s.p1 - s.p0);
      return Math.round((s.f0 + local * (s.f1 - s.f0)) * last);
    }
  }
  return last;
}

const canvas = document.getElementById("introCanvas");
const ctx = canvas.getContext("2d");
const frames = new Array(FRAME_COUNT).fill(null);
let currentFrame = 0;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  drawFrame(currentFrame, true);
}

function nearestLoaded(i) {
  if (frames[i] && frames[i].complete && frames[i].naturalWidth) return i;
  for (let d = 1; d < FRAME_COUNT; d++) {
    const lo = i - d, hi = i + d;
    if (lo >= 0 && frames[lo] && frames[lo].complete && frames[lo].naturalWidth) return lo;
    if (hi < FRAME_COUNT && frames[hi] && frames[hi].complete && frames[hi].naturalWidth) return hi;
  }
  return -1;
}

function drawFrame(i, force) {
  const idx = nearestLoaded(i);
  if (idx < 0) return;
  if (!force && idx === drawFrame._last) return;
  drawFrame._last = idx;
  const img = frames[idx];
  const cw = canvas.width, ch = canvas.height;
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function loadFrame(i) {
  if (frames[i]) return;
  const img = new Image();
  img.src = framePath(i);
  img.onload = () => {
    if (Math.abs(i - currentFrame) < 4) drawFrame(currentFrame, true);
  };
  frames[i] = img;
}
const isMobile = window.matchMedia("(max-width: 700px)").matches;

const introHint = document.getElementById("introHint");
const introSkip = document.getElementById("introSkip");
const introHero = document.getElementById("introHero");
const heroLines = introHero.querySelectorAll(".line");
const nav = document.getElementById("nav");

const HERO_IN_START = 0.9;
const HERO_IN_END = 0.995;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
let introST = null;

if (!REDUCE) {
  const step = isMobile ? 2 : 1;
  loadFrame(0);
  loadFrame(FRAME_COUNT - 1);
  for (let i = 0; i < FRAME_COUNT; i += 10) loadFrame(i);
  setTimeout(() => {
    for (let i = 0; i < FRAME_COUNT; i += step) loadFrame(i);
  }, 400);
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  /* short pin: one normal scroll completes the film */
  const PIN_LEN = LAYOUT === "a" ? (isMobile ? 220 : 260) : LAYOUT === "c" ? (isMobile ? 160 : 200) : (isMobile ? 140 : 180);

  if (LAYOUT === "b" || LAYOUT === "c") {
    /* hero cover is visible from the first paint */
    introHero.style.opacity = 1;
    introHero.classList.add("is-live");
    gsap.fromTo(heroLines, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, ease: "power4.out", stagger: 0.1, delay: 0.15 });
  }

  /* layout C: clean black hero; the small mark at the bottom grows into the film.
     The mark asset is CUT FROM frame 0 itself (assets/intro-mark.png), so when it
     reaches the film's cover-fit scale the swap is pixel-identical. */
  const introMark = document.getElementById("introMark");
  var setMarkRef = null;
  /* source rect of the mark inside the 1920x1080 film (from the extraction script) */
  const MARK_RECT = { x: 453, y: 162, w: 1020, h: 615, iw: 1920, ih: 1080 };

  if (LAYOUT === "c" && introMark) {
    canvas.style.opacity = 0;
    const smallH = isMobile ? 56 : 72;
    const setMark = (p) => {
      const cw = window.innerWidth, ch = window.innerHeight;
      /* the same cover-fit math drawFrame uses, in CSS pixels */
      const scale = Math.max(cw / MARK_RECT.iw, ch / MARK_RECT.ih);
      const ox = (cw - MARK_RECT.iw * scale) / 2, oy = (ch - MARK_RECT.ih * scale) / 2;
      const cx = ox + (MARK_RECT.x + MARK_RECT.w / 2) * scale;
      const cy = oy + (MARK_RECT.y + MARK_RECT.h / 2) * scale;
      const t = gsap.utils.clamp(0, 1, p / 0.16);
      const e = 1 - Math.pow(1 - t, 3);
      const k0 = smallH / MARK_RECT.h, kT = scale; /* kT = exact film scale */
      const x0 = cw / 2, y0 = ch - 96 - smallH / 2;
      const k = k0 + (kT - k0) * e;
      const x = x0 + (cx - x0) * e;
      const y = y0 + (cy - y0) * e;
      introMark.style.transform = `translate(-50%, -50%) scale(${k})`;
      introMark.style.left = x + "px";
      introMark.style.top = y + "px";
      /* identical pixels underneath — the handoff can be almost a hard swap */
      introMark.style.opacity = String(1 - gsap.utils.clamp(0, 1, (p - 0.155) / 0.025));
      canvas.style.opacity = String(gsap.utils.clamp(0, 1, (p - 0.125) / 0.03));
    };
    setMarkRef = setMark;
    setMark(0);
    window.addEventListener("resize", () => setMark(introST ? introST.progress : 0));
  }

  introST = ScrollTrigger.create({
    trigger: ".intro",
    start: "top top",
    end: "+=" + PIN_LEN + "%",
    pin: true,
    scrub: 0.5,
    anticipatePin: 1,
    onUpdate(self) {
      const p = self.progress;
      introHint.style.opacity = p > 0.02 ? 0 : 1;

      if (LAYOUT === "b" || LAYOUT === "c") {
        /* cover fades away, then the film runs and hands off into the page */
        const t = gsap.utils.clamp(0, 1, p / 0.1);
        const e = easeOutCubic(t);
        introHero.style.opacity = String(1 - e);
        introHero.style.transform = `translateY(${-e * 44}px)`;
        introHero.classList.toggle("is-live", t < 0.4);
        if (LAYOUT === "c") {
          setMarkRef && setMarkRef(p);
          const fp = gsap.utils.clamp(0, 1, (p - 0.18) / 0.78); /* film done by p=0.96 */
          currentFrame = progressToFrame(fp);
          /* the film lands on a statement, not on empty black */
          const introOutro = document.getElementById("introOutro");
          if (introOutro) {
            const ot = gsap.utils.clamp(0, 1, (p - 0.9) / 0.09);
            const oe = easeOutCubic(ot);
            introOutro.style.opacity = oe;
            introOutro.style.transform = `translateY(${(1 - oe) * 36}px)`;
            introOutro.classList.toggle("is-live", ot > 0.6);
          }
        } else {
          const fp = gsap.utils.clamp(0, 1, (p - 0.05) / 0.95);
          currentFrame = progressToFrame(fp);
        }
        drawFrame(currentFrame);
        nav.classList.toggle("is-scrolled", p > 0.9);
      } else {
        currentFrame = progressToFrame(p);
        drawFrame(currentFrame);
        introSkip.style.opacity = p < 0.85 ? 1 : 0;
        introSkip.style.pointerEvents = p < 0.85 ? "auto" : "none";
        /* hero rises over the dive into black — masked line by line */
        const t = gsap.utils.clamp(0, 1, (p - HERO_IN_START) / (HERO_IN_END - HERO_IN_START));
        introHero.style.opacity = easeOutCubic(t);
        heroLines.forEach((ln, i) => {
          const lt = gsap.utils.clamp(0, 1, (t - i * 0.13) / 0.74);
          ln.style.transform = `translateY(${(1 - easeOutCubic(lt)) * 108}%)`;
        });
        introHero.classList.toggle("is-live", t > 0.55);
        nav.classList.toggle("is-scrolled", p > 0.985);
      }
    },
  });

  if (LAYOUT !== "b") {
    introSkip.addEventListener("click", () => scrollToTarget(introST.end + 2, { duration: 1.1 }));
  }

  /* deep links skip the film; a clean load starts at the top of it */
  const hashEl = location.hash.length > 1 && document.querySelector(location.hash);
  if (hashEl) {
    setTimeout(() => scrollToTarget(hashEl, { immediate: true, offset: -70 }), 150);
  } else {
    window.scrollTo(0, 0);
  }
} else {
  /* reduced motion: static hero, no film */
  introHero.style.opacity = 1;
  introHero.classList.add("is-live");
  heroLines.forEach((ln) => (ln.style.transform = "none"));
  nav.classList.add("is-scrolled");
}

/* keep nav solid after the intro */
ScrollTrigger.create({
  trigger: ".marquee",
  start: "top 90%",
  onEnter: () => nav.classList.add("is-scrolled"),
});

/* ---------- in-page anchors go through the smooth scroller ---------- */
const pinEnd = () => (introST ? introST.end : 0);
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    document.body.classList.remove("menu-open");
    navBurger && navBurger.setAttribute("aria-expanded", "false");
    if (id === "#top") {
      /* layout b: the hero IS the top. layout a: past the film, home = the hero at the pin's end */
      const home = LAYOUT === "b" ? 0 : (window.scrollY > pinEnd() ? pinEnd() : 0);
      scrollToTarget(home, { duration: 1 });
    } else {
      scrollToTarget(el, { offset: -70, duration: 1 });
    }
  });
});

/* ---------- mobile menu ---------- */
const navBurger = document.getElementById("navBurger");
if (navBurger) {
  navBurger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    navBurger.setAttribute("aria-expanded", String(open));
  });
}

/* ============================================================
   GENERIC REVEALS + PARALLAX
   ============================================================ */
if (!REDUCE) {
  document.querySelectorAll(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  /* parallax lives on wrappers, never on elements that also reveal */
  document.querySelectorAll("[data-parallax]").forEach((el) => {
    gsap.fromTo(
      el,
      { y: 46 },
      {
        y: -46,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
      }
    );
  });

  /* marquee — two lanes, opposite directions */
  gsap.to("#marqueeTrack", { xPercent: -50, ease: "none", duration: 22, repeat: -1 });
  const track2 = document.getElementById("marqueeTrack2");
  if (track2) gsap.fromTo(track2, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 26, repeat: -1 });

  /* yellow highlight sweeps behind key words when they enter */
  document.querySelectorAll(".hl").forEach((el) => {
    gsap.to(el, {
      backgroundSize: "100% 42%",
      duration: 0.9,
      ease: "power2.inOut",
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
  });

  /* drifting glyph particles */
  const GLYPHS = "01<>{}/#$%&*+=?".split("");
  document.querySelectorAll("[data-particles]").forEach((zone) => {
    const n = +zone.dataset.particles || 20;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "particle" + (Math.random() < 0.14 ? " particle--yellow" : "");
      s.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.fontSize = 8 + Math.random() * 6 + "px";
      zone.appendChild(s);
      gsap.to(s, {
        x: () => gsap.utils.random(-60, 60),
        y: () => gsap.utils.random(-80, 80),
        opacity: () => gsap.utils.random(0.08, 0.45),
        duration: () => gsap.utils.random(4, 9),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 4,
      });
    }
  });
}

/* ---------- method: steps light up + line draws ---------- */
document.querySelectorAll(".method__step").forEach((stepEl) => {
  ScrollTrigger.create({
    trigger: stepEl,
    start: "top 62%",
    end: "bottom 38%",
    onToggle: (self) => stepEl.classList.toggle("is-active", self.isActive),
  });
});
if (!REDUCE) {
  gsap.fromTo(
    "#methodLine",
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: { trigger: ".method__steps", start: "top 62%", end: "bottom 45%", scrub: 0.4 },
    }
  );
} else {
  gsap.set("#methodLine", { scaleY: 1 });
}

/* ============================================================
   SPEED RACE — looping head-to-head animation
   ============================================================ */
(function speedRace() {
  const tradBar = document.getElementById("tradBar");
  const tradRunner = document.getElementById("tradRunner");
  const tradStatus = document.getElementById("tradStatus");
  const scariBar = document.getElementById("scariBar");
  const scariRunner = document.getElementById("scariRunner");
  const scariStatus = document.getElementById("scariStatus");
  const scariStamp = document.getElementById("scariStamp");
  if (!tradBar) return;

  if (REDUCE) {
    gsap.set(scariBar, { scaleX: 1 });
    gsap.set(tradBar, { scaleX: 0.42 });
    gsap.set(scariStamp, { scale: 1, rotate: -4, yPercent: -50 });
    scariStatus.textContent = STR.scariShipped;
    return;
  }

  const laneW = () => tradBar.parentElement.clientWidth - 20;
  let statusIdx = 0;

  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 });

  tl.set([tradBar, scariBar], { scaleX: 0 })
    .set([tradRunner, scariRunner], { x: 0 })
    .set(scariStamp, { scale: 0, rotate: -8 })
    .call(() => {
      statusIdx = 0;
      tradStatus.textContent = STR.tradStatuses[0];
      scariStatus.textContent = STR.scariBuilding;
    })
    .to(scariBar, { scaleX: 1, duration: 1.7, ease: "power2.inOut" }, 0.35)
    .to(scariRunner, { x: () => laneW(), duration: 1.7, ease: "power2.inOut" }, 0.35)
    .to(scariStamp, { scale: 1, rotate: -4, duration: 0.4, ease: "back.out(2.5)" }, 2.1)
    .call(() => (scariStatus.textContent = STR.scariShipped), null, 2.15)
    .to(tradBar, { scaleX: 0.42, duration: 7.5, ease: "none" }, 0.35)
    .to(tradRunner, { x: () => laneW() * 0.42, duration: 7.5, ease: "none" }, 0.35);

  setInterval(() => {
    if (!tl.isActive()) return;
    statusIdx = (statusIdx + 1) % STR.tradStatuses.length;
    tradStatus.textContent = STR.tradStatuses[statusIdx];
  }, 1500);

  ScrollTrigger.create({
    trigger: "#race",
    start: "top 78%",
    onEnter: () => tl.play(0),
    onLeave: () => tl.pause(),
    onEnterBack: () => tl.play(),
    onLeaveBack: () => tl.pause(),
  });
})();

/* ---------- stat counters ---------- */
document.querySelectorAll(".work__stat-num").forEach((el) => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || "";
  if (REDUCE) { el.textContent = target + suffix; return; }
  const obj = { v: 0 };
  gsap.to(obj, {
    v: target,
    duration: 1.4,
    ease: "power2.out",
    scrollTrigger: { trigger: el, start: "top 85%" },
    onUpdate: () => (el.textContent = Math.round(obj.v) + suffix),
  });
});

/* ============================================================
   PRE-APPROVAL — simulated analysis
   ============================================================ */
const COMP = {
  gps: { pt: "GPS em tempo real", en: "Real-time GPS" },
  maps: { pt: "Mapas", en: "Maps" },
  fleet: { pt: "Painel de frota", en: "Fleet Dashboard" },
  mobile: { pt: "App mobile", en: "Mobile App" },
  aiagent: { pt: "Agente de IA", en: "AI Agent" },
  llm: { pt: "Integração com LLM", en: "LLM Integration" },
  training: { pt: "Dados de treinamento", en: "Custom Training Data" },
  push: { pt: "Notificações push", en: "Push Notifications" },
  stores: { pt: "Publicação nas lojas", en: "App Store Publishing" },
  payments: { pt: "Pagamentos", en: "Payments" },
  catalog: { pt: "Catálogo de produtos", en: "Product Catalog" },
  orders: { pt: "Gestão de pedidos", en: "Order Management" },
  billing: { pt: "Cobrança recorrente", en: "Subscription Billing" },
  tenant: { pt: "Arquitetura multi-tenant", en: "Multi-tenant Architecture" },
  analytics: { pt: "Analytics", en: "Analytics" },
  dashboard: { pt: "Dashboard", en: "Dashboard" },
  pipeline: { pt: "Pipeline de dados", en: "Data Pipeline" },
  automation: { pt: "Automação de processos", en: "Process Automation" },
  integrations: { pt: "Integrações entre sistemas", en: "System Integrations" },
  apis: { pt: "APIs", en: "APIs" },
  engine: { pt: "Motor de jogo", en: "Game Engine" },
  interactive: { pt: "Experiência interativa", en: "Interactive Experience" },
  leaderboard: { pt: "Rankings", en: "Leaderboards" },
  messaging: { pt: "Integração de mensagens", en: "Messaging Integration" },
  notifications: { pt: "Notificações", en: "Notifications" },
  scheduling: { pt: "Sistema de agendamento", en: "Scheduling System" },
  calendar: { pt: "Sincronização de agenda", en: "Calendar Sync" },
  reminders: { pt: "Lembretes", en: "Reminders" },
  auth: { pt: "Autenticação", en: "Authentication" },
  accounts: { pt: "Contas de usuário", en: "User Accounts" },
  web: { pt: "Plataforma web", en: "Web Platform" },
  ui: { pt: "UI responsiva", en: "Responsive UI" },
  cloud: { pt: "Infraestrutura em nuvem", en: "Cloud Infrastructure" },
  admin: { pt: "Painel administrativo", en: "Admin Panel" },
};
const DICT = [
  { k: /fleet|frota|gps|track|rastr|deliver|entrega|log[íi]st/i, c: ["gps", "maps", "fleet", "mobile"] },
  { k: /\bai\b|\bia\b|i\.a\.?|intelig|llm|gpt|agent|chatbot|assist/i, c: ["aiagent", "llm", "training"] },
  { k: /app|mobile|ios|android|celular/i, c: ["mobile", "push", "stores"] },
  { k: /loja|shop|e-?commerce|venda|store|marketplace|pagamento|payment|cobr|checkout/i, c: ["payments", "catalog", "orders"] },
  { k: /saas|assinatura|subscri|plan/i, c: ["billing", "tenant"] },
  { k: /dash|painel|report|relat[óo]rio|metric|analytic|dados|data/i, c: ["analytics", "dashboard", "pipeline"] },
  { k: /autom|integra|workflow|process|rpa|zapier/i, c: ["automation", "integrations", "apis"] },
  { k: /game|jogo|interactive|interativ/i, c: ["engine", "interactive", "leaderboard"] },
  { k: /whats|chat|mensag|sms|notifica/i, c: ["messaging", "notifications"] },
  { k: /agend|schedul|booking|reserv|marca[çc]/i, c: ["scheduling", "calendar", "reminders"] },
  { k: /user|usu[áa]rio|login|conta|auth|assinar/i, c: ["auth", "accounts"] },
  { k: /site|web|landing|plataforma|platform|portal/i, c: ["web", "ui"] },
];
const CATEGORY_COMPS = {
  IA: ["aiagent", "llm"],
  AI: ["aiagent", "llm"],
  App: ["mobile", "push"],
  Plataforma: ["web", "dashboard"],
  Platform: ["web", "dashboard"],
  "Automação": ["automation", "integrations"],
  Automation: ["automation", "integrations"],
  Jogo: ["engine", "interactive"],
  Game: ["engine", "interactive"],
};
const BASE_COMPS = ["cloud", "auth", "admin", "analytics"];

const preChips = document.querySelectorAll("#preChips .chip");
let preCategory = null;
preChips.forEach((chip) => {
  chip.setAttribute("aria-pressed", "false");
  chip.addEventListener("click", () => {
    preChips.forEach((c) => { c.classList.remove("is-on"); c.setAttribute("aria-pressed", "false"); });
    chip.classList.add("is-on");
    chip.setAttribute("aria-pressed", "true");
    preCategory = chip.dataset.value;
    preError.hidden = true;
  });
});

const ideaInput = document.getElementById("ideaInput");
const ideaGo = document.getElementById("ideaGo");
const ideaResult = document.getElementById("ideaResult");
const ideaComponents = document.getElementById("ideaComponents");
const preLines = document.getElementById("preLines");
const preFill = document.getElementById("preFill");
const preStampWrap = document.getElementById("preStampWrap");
const preError = document.getElementById("preError");
let preRunning = false;

function runPreApproval() {
  const text = ideaInput.value.trim();
  if (!preCategory) { preError.textContent = STR.errNoCat; preError.hidden = false; return; }
  if (!text) { preError.textContent = STR.errNoText; preError.hidden = false; ideaInput.focus(); return; }
  if (preRunning) return;
  preRunning = true;
  ideaGo.disabled = true;
  preError.hidden = true;

  const found = new Set();
  DICT.forEach(({ k, c }) => { if (k.test(text)) c.forEach((x) => found.add(x)); });
  (CATEGORY_COMPS[preCategory] || []).forEach((x) => found.add(x));
  BASE_COMPS.forEach((x) => { if (found.size < 7) found.add(x); });
  const list = [...found].slice(0, 8).map((key) => COMP[key][LANG]);

  ideaResult.hidden = false;
  preStampWrap.hidden = true;
  ideaComponents.innerHTML = "";
  preLines.innerHTML = "";
  gsap.set(preFill, { scaleX: 0 });

  const tl = gsap.timeline({
    onComplete: () => { preRunning = false; ideaGo.disabled = false; },
  });
  if (REDUCE) tl.timeScale(8);

  tl.to(preFill, { scaleX: 1, duration: 3.4, ease: "power1.inOut" }, 0);

  STR.simLines.forEach((line, i) => {
    tl.call(() => {
      const li = document.createElement("li");
      li.innerHTML = line;
      preLines.appendChild(li);
      gsap.to(li, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" });
    }, null, 0.15 + i * 0.72);
  });
  tl.call(() => {
    const li = document.createElement("li");
    li.innerHTML = STR.simDone;
    preLines.appendChild(li);
    gsap.to(li, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" });
  }, null, 3.2);

  tl.call(() => {
    list.forEach((name) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>✓</b> ${name}`;
      ideaComponents.appendChild(li);
    });
    gsap.to(ideaComponents.children, {
      opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.12,
    });
  }, null, 3.5);

  tl.call(() => {
    preStampWrap.hidden = false;
    gsap.fromTo(preStampWrap, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
    gsap.fromTo(".pre__stamp-badge", { scale: 0, rotate: -14 }, { scale: 1, rotate: -2, duration: 0.55, ease: "back.out(2.2)", delay: 0.15 });
  }, null, 4.6);
}
ideaGo.addEventListener("click", runPreApproval);
ideaInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runPreApproval(); } });

/* ============================================================
   START PROJECT FORM — mailto with visible fallback
   ============================================================ */
document.querySelectorAll("#typeChips .chip").forEach((chip) => {
  chip.setAttribute("aria-pressed", "false");
  chip.addEventListener("click", () => {
    const on = chip.classList.toggle("is-on");
    chip.setAttribute("aria-pressed", String(on));
  });
});

const briefBox = document.getElementById("briefBox");
const briefText = document.getElementById("briefText");
const briefCopy = document.getElementById("briefCopy");
const briefWa = document.getElementById("briefWa");

document.getElementById("projectForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const M = STR.mail;
  const types = [...document.querySelectorAll("#typeChips .chip.is-on")].map((c) => c.dataset.value).join(", ") || M.none;
  const g = (id) => document.getElementById(id).value.trim();
  const body = [
    `${M.type}: ${types}`,
    ``,
    `${M.idea}:`,
    g("fDesc"),
    ``,
    `${M.budget}: ${g("fBudget") || M.none}`,
    `${M.timeline}: ${g("fTime") || M.none}`,
    ``,
    `${M.name}: ${g("fName")}`,
    `${M.company}: ${g("fCompany") || "-"}`,
    `${M.email}: ${g("fEmail")}`,
    `${M.phone}: ${g("fPhone") || "-"}`,
  ].join("\n");

  /* fallback first: the briefing is always visible and reusable */
  briefText.textContent = body;
  briefBox.hidden = false;
  /* TODO: replace with the real WhatsApp number */
  briefWa.href = "https://wa.me/5500000000000?text=" + encodeURIComponent(STR.waPrefix + body);
  document.getElementById("formSent").hidden = false;

  /* then try the user's email client */
  /* TODO: replace with the real project email */
  window.location.href =
    "mailto:hello@scari.com?subject=" +
    encodeURIComponent(`${M.subject} — ${types}`) +
    "&body=" +
    encodeURIComponent(body);
});

if (briefCopy) {
  briefCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(briefText.textContent);
      briefCopy.textContent = STR.copied;
      setTimeout(() => (briefCopy.textContent = STR.copyLabel), 2000);
    } catch (_) {}
  });
}
