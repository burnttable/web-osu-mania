
const $ = (id) => document.getElementById(id);

const state = {
  maps: [],
  selected: null,
  notes: [],
  activeNotes: [],
  playing: false,
  started: false,
  raf: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  hits: 0,
  misses: 0,
  perfects: 0,
  greats: 0,
  totalJudged: 0,
  audioUrl: null,
  approach: 1800
};

const keyMap = { d: 0, f: 1, j: 2, k: 3 };
const audio = $('audio');
const stage = $('stage');

function setStatus(message, isError = false) {
  $('upload-status').textContent = message;
  $('upload-status').style.color =
    isError ? '#ff7b9f' : 'var(--cyan)';
}

function cleanName(s) {
  return (s || '').trim();
}

function section(text, name) {
  const match = text.match(
    new RegExp(
      '(?:^|\\n)\\[' + name +
      '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)',
      'i'
    )
  );

  return match ? match[1].trim() : '';
}

function parseBeatmap(text, fileName, files) {
  const general = section(text, 'General');
  const metadata = section(text, 'Metadata');
  const difficulty = section(text, 'Difficulty');
  const objects = section(text, 'HitObjects');

  const mode = Number(
    (general.match(/^Mode:\s*(\d+)/mi) || [])[1] || 0
  );

  const keys = Number(
    (difficulty.match(/^CircleSize:\s*([\d.]+)/mi) || [])[1] || 4
  );

  if (mode !== 3) {
    throw new Error('This build supports osu!mania charts only.');
  }

  if (keys !== 4) {
    throw new Error(`This chart is ${keys}K. The current build supports 4K charts.`);
  }

  const audioName = (
    (general.match(/^AudioFilename:\s*(.+)$/mi) || [])[1] || ''
  ).trim();

  const title =
    cleanName((metadata.match(/^Title:\s*(.*)$/mi) || [])[1]) ||
    fileName.replace(/\.osu$/i, '');

  const artist =
    cleanName((metadata.match(/^Artist:\s*(.*)$/mi) || [])[1]) ||
    'Unknown artist';

  const version =
    cleanName((metadata.match(/^Version:\s*(.*)$/mi) || [])[1]) ||
    'Normal';

  const creator =
    cleanName((metadata.match(/^Creator:\s*(.*)$/mi) || [])[1]) ||
    'Unknown mapper';

  const notes = [];

  for (const line of objects.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const p = line.split(',');

    if (p.length < 5) continue;

    const x = Number(p[0]);
    const time = Number(p[2]);
    const type = Number(p[3]);

    if (!Number.isFinite(x) || !Number.isFinite(time)) continue;

    const lane = Math.max(
      0,
      Math.min(3, Math.floor(x / 512 * 4))
    );

    const isHold = (type & 128) !== 0;

    let endTime = time;

    if (isHold && p[5]) {
      const holdEnd = Number(p[5].split(':')[0]);

      if (Number.isFinite(holdEnd)) {
        endTime = holdEnd;
      }
    }

    notes.push({
      lane,
      time,
      endTime,
      hold: isHold
    });
  }

  notes.sort((a, b) => a.time - b.time);

  if (!notes.length) {
    throw new Error('No playable hit objects were found.');
  }

  const audioEntry = audioName ? files[audioName] : null;

  return {
    title,
    artist,
    version,
    creator,
    audioName,
    audioEntry,
    notes,
    fileName,
    count: notes.length
  };
}

function drawLibrary() {
  $('chart-count').textContent =
    `${state.maps.length} MAP${state.maps.length === 1 ? '' : 'S'}`;

  const list = $('chart-list');
  list.innerHTML = '';

  if (!state.maps.length) {
    list.className = 'chart-list empty-state';

    list.innerHTML =
      '<div class="empty-icon">♫</div>' +
      '<strong>Your next favorite map goes here.</strong>' +
      '<span>Import an .osz archive to get started.</span>';

    return;
  }

  list.className = 'chart-list';

  state.maps.forEach((map, index) => {
    const row = document.createElement('div');

    row.className = 'chart-item';

    row.innerHTML =
      '<div class="chart-art">♫</div>' +
      '<div class="chart-meta"><strong></strong><span></span></div>' +
      '<button type="button">PLAY</button>';

    row.querySelector('strong').textContent =
      `${map.artist} — ${map.title}`;

    row.querySelector('span').textContent =
      `${map.version} · ${map.count} objects · mapped by ${map.creator}`;

    row.querySelector('button').addEventListener('click', () => {
      selectMap(index);
    });

    list.appendChild(row);
  });
}

$('osz-input').addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.osz')) {
    setStatus('Please choose an .osz file.', true);
    return;
  }

  if (typeof JSZip === 'undefined') {
    setStatus(
      'Could not load ZIP reader. Check your internet connection.',
      true
    );
    return;
  }

  setStatus('Reading archive…');

  try {
    const zip = await JSZip.loadAsync(file);

    const osuFiles = Object.values(zip.files).filter(
      f => !f.dir && f.name.toLowerCase().endsWith('.osu')
    );

    if (!osuFiles.length) {
      throw new Error('No .osu beatmap files found in this archive.');
    }

    let added = 0;
    let errors = [];

    for (const osuFile of osuFiles) {
      try {
        const text = await osuFile.async('string');

        const map = parseBeatmap(
          text,
          osuFile.name.split('/').pop(),
          zip.files
        );

        map.archiveName = file.name;
        map.zip = zip;

        state.maps.push(map);
        added++;

      } catch (err) {
        errors.push(
          `${osuFile.name.split('/').pop()}: ${err.message}`
        );
      }
    }

    drawLibrary();

    if (added) {
      setStatus(
        `Imported ${added} playable 4K difficulty${added === 1 ? '' : 'ies'}` +
        (errors.length ? ` · skipped ${errors.length}` : '')
      );
    } else {
      throw new Error(
        errors.join(' | ') || 'No compatible 4K difficulties found.'
      );
    }

  } catch (err) {
    setStatus(err.message || 'Could not read archive.', true);
  }

  event.target.value = '';
});

async function selectMap(index) {
  const map = state.maps[index];

  if (!map) return;

  state.selected = map;

  if (state.audioUrl) {
    URL.revokeObjectURL(state.audioUrl);
  }

  state.audioUrl = null;

  audio.pause();
  audio.removeAttribute('src');
  audio.load();

  if (map.audioEntry) {
    const blob = await map.audioEntry.async('blob');

    state.audioUrl = URL.createObjectURL(blob);
    audio.src = state.audioUrl;

  } else {
    setStatus(
      `Audio file "${map.audioName}" was not found in archive.`,
      true
    );
  }

  $('playing-title').textContent = map.title;
  $('playing-artist').textContent = map.artist;

  $('playing-difficulty').textContent =
    `${map.version} · ${map.creator}`;

  $('stage-song').textContent =
    `${map.artist} — ${map.title}`.toUpperCase();

  $('library-screen').classList.add('hidden');
  $('play-screen').classList.remove('hidden');
  $('result-overlay').classList.add('hidden');

  resetGame();
}

function resetGame() {
  cancelAnimationFrame(state.raf);

  state.playing = false;
  state.started = false;

  state.notes = state.selected
    ? state.selected.notes.map(n => ({ ...n, judged: false }))
    : [];

  state.activeNotes = [];

  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.hits = 0;
  state.misses = 0;
  state.perfects = 0;
  state.greats = 0;
  state.totalJudged = 0;

  audio.pause();
  audio.currentTime = 0;

  $('notes-layer').innerHTML = '';

  $('countdown').classList.remove('hidden');
  $('countdown').textContent = 'READY?';

  $('judgement').textContent = '';

  $('start-button').disabled = false;
  $('start-button').textContent = '▶  Start song';

  $('result-overlay').classList.add('hidden');

  updateStats();
}

function updateStats() {
  $('score').textContent =
    String(state.score).padStart(7, '0');

  $('accuracy').textContent =
    `${accuracy().toFixed(2)}%`;

  $('combo').textContent = `${state.combo}x`;
  $('max-combo').textContent = `${state.maxCombo}x`;

  $('misses').textContent = state.misses;
  $('greats').textContent = state.greats;
  $('perfects').textContent = state.perfects;
}

function accuracy() {
  if (!state.totalJudged) return 100;

  return (state.hits / state.totalJudged) * 100;
}

function startGame() {
  if (!state.selected || state.playing) return;

  if (!audio.src) {
    $('countdown').textContent = 'NO AUDIO';
    return;
  }

  audio.currentTime = 0;

  audio.play().then(() => {
    state.playing = true;
    state.started = true;

    $('countdown').classList.add('hidden');
    $('start-button').disabled = true;

    state.raf = requestAnimationFrame(tick);

  }).catch(() => {
    $('countdown').textContent = 'PRESS START AGAIN';
  });
}

function tick() {
  if (!state.playing) return;

  const now = audio.currentTime * 1000;
  const h = stage.clientHeight;

  const hitY = h - 65 - 8;
  const travel = hitY + 18;

  const active = state.notes.filter(n =>
    !n.judged &&
    n.time - now <= state.approach &&
    n.time - now >= -230
  );

  $('notes-layer').innerHTML = '';

  for (const note of active) {
    const el = document.createElement('div');

    el.className =
      `note lane-${note.lane}${note.hold ? ' hold' : ''}`;

    const y =
      hitY - ((note.time - now) / state.approach) * travel;

    el.style.top =
      `${Math.max(-25, Math.min(h + 20, y))}px`;

    if (note.hold) {
      const tail = Math.max(
        10,
        ((note.endTime - note.time) / state.approach) * travel
      );

      el.style.height = `${Math.min(tail, h)}px`;
    }

    $('notes-layer').appendChild(el);
  }

  for (const note of state.notes) {
    if (!note.judged && now > note.time + 170) {
      judgeMiss(note);
    }
  }

  if (
    now >= Math.max(...state.notes.map(n => n.time)) + 1200 ||
    audio.ended
  ) {
    finishGame();
    return;
  }

  state.raf = requestAnimationFrame(tick);
}

function flashJudgement(label, color) {
  const el = $('judgement');

  el.textContent = label;
  el.style.color = color;

  el.animate(
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-12px)' }
    ],
    {
      duration: 480,
      fill: 'forwards'
    }
  );
}

function judgeMiss(note) {
  note.judged = true;

  state.misses++;
  state.combo = 0;
  state.totalJudged++;

  flashJudgement('MISS', '#ff6d93');

  updateStats();
}

function hitLane(lane) {
  if (!state.playing) return;

  const now = audio.currentTime * 1000;

  const candidates = state.notes.filter(n =>
    !n.judged &&
    n.lane === lane &&
    Math.abs(n.time - now) <= 170
  );

  if (!candidates.length) return;

  candidates.sort(
    (a, b) => Math.abs(a.time - now) - Math.abs(b.time - now)
  );

  const note = candidates[0];
  const delta = Math.abs(note.time - now);

  note.judged = true;

  state.hits++;
  state.totalJudged++;
  state.combo++;

  state.maxCombo = Math.max(
    state.maxCombo,
    state.combo
  );

  if (delta <= 55) {
    state.score += 300;
    state.perfects++;

    flashJudgement('PERFECT', '#6ef2e5');

  } else {
    state.score += 100;
    state.greats++;

    flashJudgement('GREAT', '#b5a0ff');
  }

  updateStats();
}

function finishGame() {
  state.playing = false;

  cancelAnimationFrame(state.raf);
  audio.pause();

  $('notes-layer').innerHTML = '';

  $('final-score').textContent =
    String(state.score).padStart(7, '0');

  $('final-accuracy').textContent =
    `${accuracy().toFixed(2)}% accuracy · ${state.maxCombo}x max combo`;

  $('result-overlay').classList.remove('hidden');
}

function keyDown(event) {
  const key = event.key.toLowerCase();

  if (!(key in keyMap) || event.repeat) return;

  event.preventDefault();

  const lane = keyMap[key];

  const keyEls = document.querySelectorAll('.lane-keys kbd');

  if (keyEls[lane]) {
    keyEls[lane].classList.add('active');
  }

  hitLane(lane);
}

function keyUp(event) {
  const key = event.key.toLowerCase();

  if (!(key in keyMap)) return;

  const keyEls = document.querySelectorAll('.lane-keys kbd');

  if (keyEls[keyMap[key]]) {
    keyEls[keyMap[key]].classList.remove('active');
  }
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);

$('start-button').addEventListener('click', startGame);

$('restart-button').addEventListener('click', resetGame);

$('back-button').addEventListener('click', () => {
  state.playing = false;

  cancelAnimationFrame(state.raf);
  audio.pause();

  $('play-screen').classList.add('hidden');
  $('library-screen').classList.remove('hidden');
});

$('result-library').addEventListener('click', () => {
  $('result-overlay').classList.add('hidden');

  $('play-screen').classList.add('hidden');
  $('library-screen').classList.remove('hidden');
});
