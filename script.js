const ZODIACS = [
  { key: 'Aries', symbol: '♈' }, { key: 'Taurus', symbol: '♉' }, { key: 'Gemini', symbol: '♊' },
  { key: 'Cancer', symbol: '♋' }, { key: 'Leo', symbol: '♌' }, { key: 'Virgo', symbol: '♍' },
  { key: 'Libra', symbol: '♎' }, { key: 'Scorpio', symbol: '♏' }, { key: 'Sagittarius', symbol: '♐' },
  { key: 'Capricorn', symbol: '♑' }, { key: 'Aquarius', symbol: '♒' }, { key: 'Pisces', symbol: '♓' }
];

// Public freemium API candidate (tested first). If blocked/fails, app falls back to local generated dataset.
const API_INFO = {
  name: 'Horoscope App API (Vercel)',
  docs: 'https://horoscope-app-api.vercel.app/',
  endpoint: 'https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=Aries&day=TODAY'
};

const FALLBACK_DATA = {
  Aries: ['Bold momentum favors your goals.', 'Act with patience in close relationships.', 'A smart budget move reduces future stress.'],
  Taurus: ['Comfort and structure become your power.', 'Steady effort wins at work.', 'Invest in routines that protect your energy.'],
  Gemini: ['Fresh conversations open useful doors.', 'Your curiosity attracts opportunities.', 'Pause before impulsive spending.'],
  Cancer: ['Emotional clarity improves choices.', 'Home and heart need balance.', 'Prioritize deep rest this evening.'],
  Leo: ['Your confidence inspires others.', 'Creative decisions gain traction.', 'Generosity returns in surprising ways.'],
  Virgo: ['Details reveal hidden advantages.', 'Discipline supports long-term growth.', 'Health improves with gentle consistency.'],
  Libra: ['Harmony comes from clear boundaries.', 'Teamwork multiplies progress.', 'A thoughtful plan stabilizes finances.'],
  Scorpio: ['Intuition leads to smart timing.', 'Let go of old tension in love.', 'Focus sharpens your professional edge.'],
  Sagittarius: ['Adventure and learning align well.', 'Speak truth with kindness.', 'Channel optimism into practical action.'],
  Capricorn: ['Strategic patience pays off soon.', 'Reliable habits bring momentum.', 'Protect your time and resources.'],
  Aquarius: ['Innovative ideas stand out today.', 'Community brings valuable support.', 'A mindful reset improves wellness.'],
  Pisces: ['Compassion deepens your connections.', 'Trust your creative instincts.', 'Ground dreams with simple steps.']
};

const categoryLabels = ['Love ❤️', 'Career 💼', 'Finance 💰', 'Health 🧘'];

function seededNumber(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function splitIntoCategories(text, sign, day) {
  const raw = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const sentences = raw.length ? raw : FALLBACK_DATA[sign];
  const offset = seededNumber(`${sign}-${day}`) % sentences.length;

  return categoryLabels.map((label, index) => {
    const sentence = sentences[(index + offset) % sentences.length] || FALLBACK_DATA[sign][index % 3];
    return `${label}: ${sentence}.`;
  });
}

function formatDate(offsetDays = 0) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz
  }).format(now);
  return { formatted, tz };
}

function createFallbackReading(sign, day) {
  const seed = seededNumber(`${sign}-${day}-${new Date().toDateString()}`);
  const base = FALLBACK_DATA[sign];
  const text = `${base[seed % base.length]} ${base[(seed + 1) % base.length]} ${base[(seed + 2) % base.length]}`;
  return splitIntoCategories(text, sign, day);
}

async function fetchHoroscope(sign, day) {
  const url = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${encodeURIComponent(sign)}&day=${day}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API response not OK');
    const data = await res.json();
    const text = data?.data?.horoscope_data || data?.horoscope_data || '';
    if (!text) throw new Error('Missing horoscope text');
    return { reading: splitIntoCategories(text, sign, day), source: 'Live API' };
  } catch (error) {
    return { reading: createFallbackReading(sign, day), source: 'Fallback dataset (API unavailable in this environment)' };
  }
}

function renderReading(listEl, items) {
  listEl.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  });
}

function initHoroscopePage() {
  const grid = document.getElementById('zodiacGrid');
  if (!grid) return;

  const todayLabel = document.getElementById('todayLabel');
  const tomorrowLabel = document.getElementById('tomorrowLabel');
  const timezoneLabel = document.getElementById('timezoneLabel');
  const panel = document.getElementById('horoscopePanel');
  const selectedSign = document.getElementById('selectedSign');
  const todayReading = document.getElementById('todayReading');
  const tomorrowReading = document.getElementById('tomorrowReading');
  const dataSource = document.getElementById('dataSource');

  const todayDate = formatDate(0);
  const tomorrowDate = formatDate(1);
  todayLabel.textContent = `Today: ${todayDate.formatted}`;
  tomorrowLabel.textContent = `Tomorrow: ${tomorrowDate.formatted}`;
  timezoneLabel.textContent = `Timezone: ${todayDate.tz}`;

  ZODIACS.forEach(sign => {
    const card = document.createElement('button');
    card.className = 'zodiac-card';
    card.innerHTML = `<div><span>${sign.symbol}</span><small>${sign.key}</small></div>`;

    card.addEventListener('click', async () => {
      document.querySelectorAll('.zodiac-card').forEach(node => node.classList.remove('active'));
      card.classList.add('active');
      selectedSign.textContent = `${sign.symbol} ${sign.key}`;

      const [today, tomorrow] = await Promise.all([
        fetchHoroscope(sign.key, 'TODAY'),
        fetchHoroscope(sign.key, 'TOMORROW')
      ]);

      renderReading(todayReading, today.reading);
      renderReading(tomorrowReading, tomorrow.reading);
      dataSource.textContent = `${today.source}. API: ${API_INFO.name} | Docs: ${API_INFO.docs} | Example: ${API_INFO.endpoint}`;

      panel.classList.remove('hidden');
      panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease' });
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    grid.appendChild(card);
  });
}

const COMPATIBILITY_MATRIX = {
  Aries: { Leo: 90, Sagittarius: 88, Libra: 84, Aries: 78, default: 67 },
  Taurus: { Virgo: 91, Capricorn: 89, Cancer: 85, Taurus: 80, default: 66 },
  Gemini: { Libra: 92, Aquarius: 89, Aries: 83, Gemini: 79, default: 68 },
  Cancer: { Scorpio: 92, Pisces: 90, Taurus: 84, Cancer: 80, default: 65 },
  Leo: { Aries: 90, Sagittarius: 91, Gemini: 84, Leo: 82, default: 69 },
  Virgo: { Taurus: 91, Capricorn: 90, Cancer: 82, Virgo: 79, default: 67 },
  Libra: { Gemini: 92, Aquarius: 90, Leo: 84, Libra: 81, default: 69 },
  Scorpio: { Cancer: 92, Pisces: 90, Virgo: 82, Scorpio: 78, default: 66 },
  Sagittarius: { Aries: 88, Leo: 91, Aquarius: 83, Sagittarius: 79, default: 68 },
  Capricorn: { Taurus: 89, Virgo: 90, Scorpio: 81, Capricorn: 82, default: 67 },
  Aquarius: { Gemini: 89, Libra: 90, Sagittarius: 83, Aquarius: 80, default: 69 },
  Pisces: { Cancer: 90, Scorpio: 90, Capricorn: 80, Pisces: 79, default: 66 }
};

function getCompatibility(sign1, sign2) {
  return COMPATIBILITY_MATRIX[sign1][sign2] || COMPATIBILITY_MATRIX[sign1].default;
}

function animateMeter(target) {
  const meter = document.getElementById('compatMeter');
  const meterText = document.getElementById('meterText');
  let current = 0;
  const duration = 900;
  const stepMs = 16;
  const increment = target / (duration / stepMs);

  const interval = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    const rounded = Math.round(current);
    meter.style.background = `conic-gradient(var(--gold) ${rounded}%, rgba(255,255,255,0.13) ${rounded}% 100%)`;
    meterText.textContent = `${rounded}%`;
  }, stepMs);
}

function initCompatibilityPage() {
  const selectOne = document.getElementById('signOne');
  if (!selectOne) return;

  const selectTwo = document.getElementById('signTwo');
  const checkBtn = document.getElementById('checkCompatibility');
  const result = document.getElementById('compatibilityResult');

  ZODIACS.forEach(sign => {
    const option1 = new Option(sign.key, sign.key);
    const option2 = new Option(sign.key, sign.key);
    selectOne.add(option1);
    selectTwo.add(option2);
  });

  checkBtn.addEventListener('click', () => {
    const one = selectOne.value;
    const two = selectTwo.value;
    const overall = getCompatibility(one, two);
    const love = Math.min(99, overall + 3);
    const communication = Math.max(45, overall - 4);
    const trust = Math.max(42, overall - 2 + (one === two ? -4 : 0));

    animateMeter(overall);
    document.getElementById('loveScore').textContent = `${love}%`;
    document.getElementById('communicationScore').textContent = `${communication}%`;
    document.getElementById('trustScore').textContent = `${trust}%`;
    document.getElementById('summaryText').textContent =
      overall >= 86 ? 'A magnetic cosmic alignment with high harmony and long-term potential.' :
      overall >= 74 ? 'A strong connection that thrives through communication and emotional maturity.' :
      'A learning relationship—balance and understanding can transform this match beautifully.';

    result.classList.remove('hidden');
    result.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400 });
  });

  document.getElementById('shareCompatibility').addEventListener('click', async () => {
    const text = `✨ Zodiac Compatibility: ${selectOne.value} + ${selectTwo.value} = ${document.getElementById('meterText').textContent}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Stellar Luxe Compatibility', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Compatibility result copied to clipboard!');
      }
    } catch {
      alert('Sharing was cancelled or unavailable.');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 1000);
  }

  initHoroscopePage();
  initCompatibilityPage();
});
