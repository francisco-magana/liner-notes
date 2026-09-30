import { h, render, Component, createRef } from 'preact';
import htm from 'htm';
import { api } from './api.js';

const html = htm.bind(h);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RED = 'var(--red)';
const INK = 'var(--ink)';
const BG = 'var(--bg)';
const MUTE = 'var(--mute)';
const STRIPE = 'repeating-linear-gradient(135deg,var(--s1) 0 5px,var(--s2) 5px 10px)';
const FORM_STRIPE = 'repeating-linear-gradient(135deg,var(--f1) 0 6px,var(--f2) 6px 12px)';
const BASE_MOODS = ['NOSTALGIC', 'LATE NIGHT', 'CALM', 'DRIVING', 'HOPEFUL', 'MELANCHOLY', 'ENERGETIC'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WD = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const pad = n => String(n).padStart(2, '0');
const fmt = iso => { const d = new Date(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2); };
const stars = r => '★'.repeat(r) + '☆'.repeat(5 - r);
const wc = t => (t.trim().match(/\S+/g) || []).length;
const cap = s => (s || '').replace(/\b\w/g, c => c.toUpperCase());
const bgImage = url => `center / cover no-repeat url("${url}")`;
const art = s => (s && s.art ? bgImage(s.art) : STRIPE);
const excerpt = (t, n = 150) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const emptyForm = () => ({ title: '', artist: '', album: '', year: '', genre: '', firstHeard: todayIso(), rating: 0, moods: [], lyrics: '', art: null });
const lastActivity = s => [s.created, ...s.reflections.map(r => r.date)].sort().pop();
const lineCount = s => (s.lyrics || '').split('\n').filter(l => l.trim()).length;
const pickImg = (imgs, small) => {
  if (!imgs || !imgs.length) return null;
  const s = [...imgs].sort((a, b) => (a.width || 0) - (b.width || 0));
  return small ? (s.find(i => (i.width || 0) >= 64) || s[s.length - 1]).url : s[s.length - 1].url;
};
const autofocus = el => {
  if (!el) return;
  el.focus();
  el.setSelectionRange?.(el.value.length, el.value.length);
};
const underline = (on, color = INK) => `1px solid ${on ? color : 'transparent'}`;
const pill = on => `background:${on ? INK : 'transparent'};color:${on ? BG : INK}`;

/** Crops an image file to a 480px square JPEG data URL. */
function cropToSquare(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 480, c = document.createElement('canvas'), m = Math.min(img.width, img.height);
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

class App extends Component {
  constructor() {
    super();
    const now = new Date();
    this.darkQuery = matchMedia('(prefers-color-scheme: dark)');
    this.state = {
      loaded: false, loadError: '',
      songs: [], settings: { theme: '', clientId: '', clientSecret: '' }, sysDark: this.darkQuery.matches,
      settingsOpen: false, sd: { clientId: '', clientSecret: '' }, showSecret: false, testStatus: '',
      spType: 'track', spQuery: '', spResults: [], spLoading: false, spError: '',
      view: 'library', libTab: 'songs', filter: 'all', sort: 'recent', query: '',
      currentId: null, detailTab: 'lyrics', activeLine: null, noteDraft: '',
      lyricsEditing: false, lyricsDraft: '', confirmDel: false,
      form: emptyForm(), editingId: null, errors: {}, moodDraft: '', saving: false,
      reflId: null, reflDraft: '', reflDate: null, showInsert: false,
      dyYear: now.getFullYear(), dyMonth: now.getMonth(),
      toast: ''
    };
    this.fileRef = createRef();
    this.onSysTheme = e => this.setState({ sysDark: e.matches });
  }

  async componentDidMount() {
    this.darkQuery.addEventListener('change', this.onSysTheme);
    try {
      const { songs, settings } = await api.bootstrap();
      this.setState({ songs, settings, loaded: true });
    } catch (e) {
      this.setState({ loadError: e.message });
    }
  }

  componentWillUnmount() {
    this.darkQuery.removeEventListener('change', this.onSysTheme);
    clearTimeout(this.tt);
  }

  componentDidUpdate() {
    document.documentElement.dataset.theme = this.isDark() ? 'dark' : 'light';
  }

  // --- state helpers -------------------------------------------------------

  isDark() { const t = this.state.settings.theme; return t ? t === 'dark' : this.state.sysDark; }
  flash(msg, ms = 1800) { clearTimeout(this.tt); this.setState({ toast: msg }); this.tt = setTimeout(() => this.setState({ toast: '' }), ms); }
  fail(e) { this.flash(e.message || 'SOMETHING WENT WRONG', 3200); }
  cur() { return this.state.songs.find(s => s.id === this.state.currentId); }
  go(view, extra = {}) { this.setState({ view, confirmDel: false, activeLine: null, lyricsEditing: false, ...extra }); window.scrollTo(0, 0); }
  openSong(id, tab = 'lyrics') { this.go('detail', { currentId: id, detailTab: tab }); }
  setForm(p) { this.setState(st => ({ form: { ...st.form, ...p }, errors: {} })); }
  replaceSong(song) { this.setState(st => ({ songs: st.songs.map(s => (s.id === song.id ? song : s)) })); }

  async reload() {
    try { const { songs } = await api.bootstrap(); this.setState({ songs }); } catch { /* keep what we have */ }
  }

  /** Optimistically applies a patch, then persists it and takes the server's copy. */
  async patchSong(id, patch) {
    const s = this.state.songs.find(x => x.id === id);
    if (!s) return;
    const p = typeof patch === 'function' ? patch(s) : patch;
    this.replaceSong({ ...s, ...p });
    try {
      this.replaceSong(await api.updateSong(id, p));
    } catch (e) {
      this.fail(e);
      this.reload();
    }
  }

  /** Runs a request that returns an updated song. Returns the song, or null on failure. */
  async withSong(promise) {
    try {
      const song = await promise;
      this.replaceSong(song);
      return song;
    } catch (e) {
      this.fail(e);
      return null;
    }
  }

  setSettings(patch) {
    this.setState(st => ({ settings: { ...st.settings, ...patch } }));
    return api.saveSettings(patch).then(settings => this.setState({ settings }), e => this.fail(e));
  }

  // --- actions -------------------------------------------------------------

  goLibrary = () => this.go('library');
  goDiary = () => this.go('diary');
  startAdd = () => this.go('add', { form: emptyForm(), editingId: null, errors: {}, moodDraft: '' });
  openSettings = () => {
    const { clientId, clientSecret } = this.state.settings;
    this.setState({ settingsOpen: true, sd: { clientId, clientSecret }, testStatus: '', showSecret: false });
  };
  closeSettings = () => this.setState({ settingsOpen: false });

  async readArt(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try { this.setForm({ art: await cropToSquare(file) }); } catch { this.flash("COULDN'T READ THAT IMAGE"); }
  }

  async saveForm() {
    const st = this.state, f = st.form, errors = {};
    if (!f.title.trim()) errors.title = '— NEEDED';
    if (!f.artist.trim()) errors.artist = '— NEEDED';
    if (Object.keys(errors).length) { this.setState({ errors }); return; }
    if (st.saving) return;
    const clean = { ...f, title: f.title.trim(), artist: f.artist.trim(), album: f.album.trim(), genre: f.genre.trim(), year: f.year.trim() };
    this.setState({ saving: true });
    try {
      if (st.editingId) {
        const song = await api.updateSong(st.editingId, clean);
        this.replaceSong(song);
        this.openSong(song.id);
        this.flash('CHANGES SAVED');
      } else {
        const song = await api.createSong(clean);
        this.setState(x => ({ songs: [song, ...x.songs] }));
        this.openSong(song.id);
        this.flash('ADDED TO LIBRARY');
      }
    } catch (e) {
      this.fail(e);
    } finally {
      this.setState({ saving: false });
    }
  }

  async deleteSong(id) {
    try {
      await api.deleteSong(id);
      this.setState(x => ({ songs: x.songs.filter(y => y.id !== id) }));
      this.go('library');
      this.flash('SONG DELETED');
    } catch (e) { this.fail(e); }
  }

  async saveReflection() {
    const st = this.state, text = st.reflDraft.trim(), s = this.cur();
    if (!s) return;
    if (!text) { this.flash('WRITE SOMETHING FIRST'); return; }
    const song = await this.withSong(st.reflId
      ? api.updateReflection(s.id, st.reflId, { text })
      : api.addReflection(s.id, { text, date: st.reflDate }));
    if (song) { this.openSong(s.id, 'refl'); this.flash('REFLECTION SAVED'); }
  }

  async deleteReflection() {
    const s = this.cur();
    const song = await this.withSong(api.deleteReflection(s.id, this.state.reflId));
    if (song) { this.openSong(s.id, 'refl'); this.flash('REFLECTION DELETED'); }
  }

  openRefl(r) { this.go('reflect', { reflId: r.id, reflDraft: r.text, reflDate: r.date, showInsert: false }); }

  async spSearch() {
    const q = this.state.spQuery.trim(), type = this.state.spType;
    if (!q) return;
    this.setState({ spLoading: true, spError: '', spResults: [] });
    try {
      const { items } = await api.spotifySearch(type, q);
      this.setState({ spResults: items.map(raw => ({ type, raw })), spLoading: false, spError: items.length ? '' : 'NO RESULTS' });
    } catch (e) { this.setState({ spLoading: false, spError: e.message }); }
  }

  spUse({ type, raw: x }) {
    const artists = list => (list || []).map(a => a.name).join(', ');
    if (type === 'track') {
      const img = pickImg(x.album?.images);
      this.setForm({ title: x.name, artist: artists(x.artists), album: x.album?.name || '', year: (x.album?.release_date || '').slice(0, 4), ...(img ? { art: img } : {}) });
    } else if (type === 'album') {
      const img = pickImg(x.images);
      this.setForm({ album: x.name, artist: artists(x.artists), year: (x.release_date || '').slice(0, 4), ...(img ? { art: img } : {}) });
    } else {
      this.setForm({ artist: x.name, genre: this.state.form.genre || cap((x.genres || [])[0]) });
    }
    this.flash('FILLED FROM SPOTIFY');
  }

  async spAddAlbum(x) {
    const f = this.state.form;
    this.setState({ spLoading: true, spError: '' });
    try {
      const { added, album } = await api.importAlbum({ albumId: x.id, genre: f.genre || '', firstHeard: f.firstHeard || '' });
      this.setState(st => ({ songs: [...added, ...st.songs], spLoading: false, libTab: 'songs', filter: 'all', sort: 'recent', query: album }));
      this.go('library');
      this.flash(added.length ? 'ADDED ' + added.length + ' SONGS FROM ' + album.toUpperCase() : 'ALREADY IN YOUR LIBRARY');
    } catch (e) { this.setState({ spLoading: false, spError: e.message }); }
  }

  async testSpotify() {
    const { clientId, clientSecret } = this.state.sd;
    if (!clientId || !clientSecret) { this.setState({ testStatus: 'ENTER BOTH FIELDS' }); return; }
    this.setState({ testStatus: 'TESTING…' });
    try { await api.testSpotify({ clientId, clientSecret }); this.setState({ testStatus: 'CONNECTED ✓' }); }
    catch (e) { this.setState({ testStatus: e.message }); }
  }

  async saveSettings() {
    const { clientId, clientSecret } = this.state.sd;
    await this.setSettings({ clientId, clientSecret });
    this.setState({ settingsOpen: false, spResults: [], spError: '' });
    this.flash('SETTINGS SAVED');
  }

  // --- render --------------------------------------------------------------

  render() {
    const st = this.state;
    if (!st.loaded) {
      return html`<div class="app loading lbl ${st.loadError ? 'red' : 'muted'}">${st.loadError || 'LOADING…'}</div>`;
    }
    return html`
      <div class="app">
        ${this.renderNav()}
        ${st.view === 'library' && this.renderLibrary()}
        ${st.view === 'add' && this.renderForm()}
        ${st.view === 'detail' && this.cur() && this.renderDetail()}
        ${st.view === 'reflect' && this.cur() && this.renderReflect()}
        ${st.view === 'diary' && this.renderDiary()}
        ${st.settingsOpen && this.renderSettings()}
        ${st.toast && html`
          <div class="lbl" style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:12px 20px;letter-spacing:.08em;z-index:30">${st.toast}</div>`}
      </div>`;
  }

  renderNav() {
    const v = this.state.view;
    return html`
      <div style="height:80px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;font-size:14px;letter-spacing:.04em;position:relative;z-index:2">
        <span class="click" onClick=${this.goLibrary} style="font-weight:600">L/N</span>
        <div style="display:flex;gap:28px">
          <span class="click" onClick=${this.goLibrary} style="padding-bottom:2px;border-bottom:${underline(['library', 'detail', 'reflect'].includes(v))}">LIBRARY</span>
          <span class="click" onClick=${this.goDiary} style="padding-bottom:2px;border-bottom:${underline(v === 'diary')}">DIARY</span>
          <span class="click h-fade" onClick=${this.startAdd} style="color:var(--red);padding-bottom:2px;border-bottom:${underline(v === 'add' && !this.state.editingId, RED)}">+ ADD SONG</span>
          <span class="click h-ink" onClick=${this.openSettings} style="padding-bottom:2px;color:var(--mute)">SETTINGS</span>
        </div>
      </div>`;
  }

  // --- library -------------------------------------------------------------

  renderLibrary() {
    const st = this.state, songs = st.songs, q = st.query.trim().toLowerCase();
    const match = s => !q || [s.title, s.artist, s.album, s.lyrics].some(v => (v || '').toLowerCase().includes(q));
    const artistsMap = {}, albumsMap = {};
    songs.forEach(s => {
      (artistsMap[s.artist] = artistsMap[s.artist] || []).push(s);
      if (s.album) { const k = s.album + '§' + s.artist; (albumsMap[k] = albumsMap[k] || []).push(s); }
    });
    const avg = list => (list.reduce((a, s) => a + (s.rating || 0), 0) / list.length).toFixed(1);
    const tab = (key, label, count) => {
      const on = st.libTab === key;
      return { key, label: (on ? '● ' : '○ ') + label, count, ink: on ? INK : MUTE, line: on ? INK : 'transparent', onClick: () => this.setState({ libTab: key }) };
    };
    const tabs = [tab('songs', 'SONGS', songs.length), tab('artists', 'ARTISTS', Object.keys(artistsMap).length), tab('albums', 'ALBUMS', Object.keys(albumsMap).length)];
    const title = { songs: 'LIBRARY', artists: 'ARTISTS', albums: 'ALBUMS' }[st.libTab];
    const chip = (label, active, onClick) => ({ label, active, onClick });

    let chips, list, noResults;
    if (st.libTab === 'songs') {
      const F = { all: () => true, five: s => s.rating === 5, refl: s => s.reflections.length > 0, nolyrics: s => !lineCount(s) };
      chips = [
        chip('ALL ' + songs.length, st.filter === 'all', () => this.setState({ filter: 'all' })),
        chip('★★★★★ ' + songs.filter(F.five).length, st.filter === 'five', () => this.setState({ filter: 'five' })),
        chip('WITH REFLECTION ' + songs.filter(F.refl).length, st.filter === 'refl', () => this.setState({ filter: 'refl' })),
        chip('NEEDS LYRICS ' + songs.filter(F.nolyrics).length, st.filter === 'nolyrics', () => this.setState({ filter: 'nolyrics' })),
        chip(st.sort === 'recent' ? 'SORT: RECENT ↓' : st.sort === 'rating' ? 'SORT: RATING ↓' : 'SORT: A–Z', false, () => this.setState({ sort: { recent: 'rating', rating: 'az', az: 'recent' }[st.sort] }))
      ];
      const sorter = { recent: (a, b) => b.created.localeCompare(a.created), rating: (a, b) => b.rating - a.rating, az: (a, b) => a.title.localeCompare(b.title) }[st.sort];
      const rows = songs.filter(F[st.filter]).filter(match).sort(sorter);
      noResults = !rows.length;
      list = this.renderSongRows(rows);
    } else {
      chips = [chip(st.libTab === 'artists' ? 'MOST SONGS' : 'RECENT', true, () => {})];
      const toSongs = query => this.setState({ libTab: 'songs', filter: 'all', query });
      if (st.libTab === 'artists') {
        const rows = Object.entries(artistsMap).filter(([n, l]) => !q || n.toLowerCase().includes(q) || l.some(match))
          .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
          .map(([name, l], i) => {
            const top = [...l].sort((a, b) => b.rating - a.rating)[0];
            return { key: name, num: pad(i + 1), name: name.toUpperCase(), genre: (l.find(s => s.genre)?.genre || '—').toUpperCase(), count: pad(l.length), avg: avg(l), top: top.title.toUpperCase(), date: fmt(l.map(lastActivity).sort().pop()), art: art(l.find(s => s.art)), open: () => toSongs(name) };
          });
        noResults = !rows.length;
        list = this.renderArtistRows(rows);
      } else {
        const latest = l => l.map(lastActivity).sort().pop();
        const rows = Object.entries(albumsMap).filter(([k, l]) => !q || k.toLowerCase().includes(q) || l.some(match))
          .sort((a, b) => latest(b[1]).localeCompare(latest(a[1])))
          .map(([k, l]) => ({ key: k, title: l[0].album.toUpperCase(), artist: l[0].artist.toUpperCase(), year: l[0].year || '', avg: avg(l), count: l.length + (l.length > 1 ? ' SONGS' : ' SONG'), art: art(l.find(s => s.art)), open: () => toSongs(l[0].album) }));
        noResults = !rows.length;
        list = this.renderAlbumGrid(rows);
      }
    }

    const last = [...songs].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))[0];
    const hero = last
      ? { kicker: 'LAST REVIEWED', title: last.title.toUpperCase(), caption: stars(last.rating) + ' / ' + fmt(lastActivity(last)), art: art(last), open: () => this.openSong(last.id) }
      : { kicker: 'NOTHING HERE', title: 'ADD A SONG', caption: '', art: STRIPE, open: this.startAdd };

    return html`
      <div style="display:grid;grid-template-columns:380px minmax(0,1fr)">
        <div style="position:relative">
          <div style="position:sticky;top:0;height:calc(100vh - 80px);min-height:640px;overflow:hidden">
            <div style="position:absolute;left:-340px;top:calc(50% - 340px);width:680px;height:680px;border-radius:50%;border:1px solid var(--red2)"></div>
            <div style="position:absolute;left:-310px;top:calc(50% - 310px);width:620px;height:620px;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1c1c1c 2px 4px)"></div>
            <div style="position:absolute;left:-90px;top:calc(50% - 90px);width:180px;height:180px;border-radius:50%;background:${hero.art}"></div>
            <div style="position:absolute;left:-6px;top:calc(50% - 6px);width:12px;height:12px;border-radius:50%;background:var(--bg)"></div>
            <div style="position:absolute;left:334px;top:calc(50% - 6px);width:12px;height:12px;border-radius:50%;background:var(--red2);box-shadow:0 0 0 4px var(--bg),0 0 0 5px var(--red2)"></div>
            <div class="click" onClick=${hero.open} style="position:absolute;left:112px;top:calc(50% - 18px);display:flex;flex-direction:column;gap:4px;color:#f7f6f2;max-width:190px">
              <span class="mono" style="font-size:10px;opacity:.7;letter-spacing:.06em">${hero.kicker}</span>
              <span style="font-size:18px;letter-spacing:.02em;line-height:1.1">${hero.title}</span>
            </div>
            <div class="mono muted" style="position:absolute;left:40px;bottom:30px;font-size:12px">${hero.caption}</div>
          </div>
        </div>
        <div style="padding:4px 40px 80px;display:flex;flex-direction:column;gap:18px;min-width:0">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px">
            <div class="display" style="font-size:clamp(80px,8vw,140px);line-height:.82;min-width:0">${title}</div>
            <div class="mono" style="display:flex;flex-direction:column;gap:6px;font-weight:500;font-size:12px;letter-spacing:.06em;padding-bottom:4px;min-width:150px">
              ${tabs.map(t => html`
                <div key=${t.key} class="click h-ink" onClick=${t.onClick} style="display:flex;justify-content:space-between;gap:24px;color:${t.ink};border-bottom:1px solid ${t.line};padding-bottom:2px">
                  <span>${t.label}</span><span>${t.count}</span>
                </div>`)}
            </div>
          </div>
          <div class="lbl" style="display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:8px 0">
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              ${chips.map(c => html`<span key=${c.label} class="click h-under" onClick=${c.onClick} style="padding:4px 8px;white-space:nowrap;${pill(c.active)}">${c.label}</span>`)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex:0 1 260px;min-width:160px;border-bottom:1px solid var(--line)">
              <span class="muted">⌕</span>
              <input class="lbl" value=${st.query} onInput=${e => this.setState({ query: e.target.value })} placeholder="SEARCH TITLE, ARTIST, LYRIC"
                style="flex:1;min-width:0;border:0;background:transparent;outline:none;padding:4px 0" />
              ${st.query && html`<span class="click muted" onClick=${() => this.setState({ query: '' })}>✕</span>`}
            </div>
          </div>
          ${!noResults && list}
          ${noResults && html`
            <div class="mono" style="padding:60px 0;display:flex;flex-direction:column;gap:14px;align-items:flex-start;font-weight:500;font-size:12px;letter-spacing:.06em">
              <span style="font-family:'Archivo';font-size:48px;font-stretch:72%;letter-spacing:-.02em">${songs.length ? 'NOTHING MATCHES' : 'YOUR LIBRARY IS EMPTY'}</span>
              <span class="muted">${songs.length ? 'TRY ANOTHER SEARCH OR FILTER.' : 'ADD THE FIRST SONG YOU WANT TO THINK ABOUT.'}</span>
              <span class="click" onClick=${this.startAdd} style="background:var(--ink);color:var(--bg);padding:12px 20px">+ ADD A SONG</span>
            </div>`}
        </div>
      </div>`;
  }

  renderSongRows(rows) {
    const cols = 'grid-template-columns:30px 44px minmax(0,1fr) 150px 84px 50px 70px;gap:14px';
    return html`
      <div style="display:flex;flex-direction:column">
        <div class="mono muted" style="display:grid;${cols};font-weight:500;font-size:10px;letter-spacing:.06em;padding-bottom:8px">
          <span>NO</span><span></span><span>TITLE / ARTIST</span><span>ALBUM</span><span>RATING</span><span>NOTES</span><span style="text-align:right">ADDED</span>
        </div>
        ${rows.map((s, i) => {
          const notes = Object.keys(s.notes).length;
          return html`
            <div key=${s.id} class="mono click h-row" onClick=${() => this.openSong(s.id)} style="display:grid;${cols};align-items:center;padding:6px 0;border-top:1px solid var(--rule);font-size:12px">
              <span class="muted">${pad(i + 1)}</span>
              <div style="width:44px;height:44px;background:${art(s)}"></div>
              <div style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="ellipsis" style="font-weight:500">${s.title.toUpperCase()}</span><span class="muted">${s.artist.toUpperCase()}</span></div>
              <span class="ellipsis" style="color:var(--ink2)">${(s.album || '—').toUpperCase()}</span>
              <span class="red" style="letter-spacing:1px">${stars(s.rating)}</span>
              <span>${notes ? pad(notes) : '—'}</span>
              <span style="text-align:right">${fmt(s.created)}</span>
            </div>`;
        })}
      </div>`;
  }

  renderArtistRows(rows) {
    const cols = 'grid-template-columns:30px 44px minmax(0,1fr) 60px 70px 180px 70px;gap:14px';
    return html`
      <div style="display:flex;flex-direction:column">
        <div class="mono muted" style="display:grid;${cols};font-weight:500;font-size:10px;letter-spacing:.06em;padding-bottom:8px">
          <span>NO</span><span></span><span>ARTIST</span><span>SONGS</span><span>AVG</span><span>TOP SONG</span><span style="text-align:right">LAST</span>
        </div>
        ${rows.map(a => html`
          <div key=${a.key} class="mono click h-row" onClick=${a.open} style="display:grid;${cols};align-items:center;padding:6px 0;border-top:1px solid var(--rule);font-size:12px">
            <span class="muted">${a.num}</span>
            <div style="width:44px;height:44px;border-radius:50%;background:${a.art}"></div>
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-weight:500">${a.name}</span><span class="muted">${a.genre}</span></div>
            <span>${a.count}</span>
            <span class="red">★ ${a.avg}</span>
            <span class="ellipsis" style="color:var(--ink2)">${a.top}</span>
            <span style="text-align:right">${a.date}</span>
          </div>`)}
      </div>`;
  }

  renderAlbumGrid(rows) {
    return html`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:24px 20px">
        ${rows.map(b => html`
          <div key=${b.key} class="click h-fade75" onClick=${b.open} style="display:flex;flex-direction:column;gap:8px">
            <div class="mono" style="aspect-ratio:1;background:${b.art};display:flex;align-items:flex-end;justify-content:flex-end;padding:8px;box-sizing:border-box;font-size:10px">
              <span style="background:var(--ink);color:var(--bg);padding:2px 5px">${b.count}</span>
            </div>
            <div class="mono" style="display:flex;flex-direction:column;gap:2px;font-size:11px">
              <span style="font-weight:500">${b.title}</span>
              <div class="muted" style="display:flex;justify-content:space-between"><span>${b.artist}</span><span>${b.year}</span></div>
              <span class="red">★ ${b.avg}</span>
            </div>
          </div>`)}
      </div>`;
  }

  // --- add / edit ----------------------------------------------------------

  renderForm() {
    const st = this.state, f = st.form, e = st.errors;
    const spReady = !!(st.settings.clientId && st.settings.clientSecret);
    const on = k => ev => this.setForm({ [k]: ev.target.value });
    const moods = [...new Set([...BASE_MOODS, ...st.songs.flatMap(s => s.moods), ...f.moods])];
    const inputStyle = 'font-size:20px;padding:4px 0 8px';
    const label = (text, color = MUTE) => html`<span class="lbl" style="color:${color}">${text}</span>`;
    const onMoodKey = ev => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const m = st.moodDraft.trim().toUpperCase();
      if (m && !f.moods.includes(m)) this.setForm({ moods: [...f.moods, m] });
      this.setState({ moodDraft: '' });
    };

    return html`
      <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr);gap:48px">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="display" style="font-size:clamp(80px,8vw,112px);line-height:.84">${st.editingId ? 'EDIT' : 'NEW'}<br/>${st.editingId ? 'SONG' : 'ENTRY'}</div>
          <input type="file" accept="image/*" ref=${this.fileRef} onChange=${ev => { this.readArt(ev.target.files[0]); ev.target.value = ''; }} style="display:none" />
          <div class="mono click"
            onClick=${() => this.fileRef.current?.click()}
            onDragOver=${ev => ev.preventDefault()}
            onDrop=${ev => { ev.preventDefault(); this.readArt(ev.dataTransfer.files[0]); }}
            style="width:100%;aspect-ratio:1;box-sizing:border-box;border:1px dashed var(--mute);white-space:nowrap;background:${f.art ? art(f) : FORM_STRIPE};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-weight:500;font-size:12px;letter-spacing:.06em">
            ${!f.art && html`
              <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
                <span>DROP ALBUM ART</span>
                <span class="muted">JPG OR PNG · CROPPED TO SQUARE</span>
                <span class="h-invert" style="margin-top:8px;border:1px solid var(--ink);padding:8px 14px">BROWSE FILES</span>
              </div>`}
          </div>
          ${f.art && html`
            <div class="lbl" style="display:flex;gap:18px">
              <span class="click" onClick=${() => this.fileRef.current?.click()} style="border-bottom:1px solid var(--ink)">REPLACE</span>
              <span class="click red" onClick=${ev => { ev.stopPropagation(); this.setForm({ art: null }); }}>REMOVE</span>
            </div>`}
        </div>

        <div style="display:flex;flex-direction:column;gap:22px;padding-top:6px;max-width:760px">
          <div class="lbl muted" style="display:flex;flex-wrap:wrap;gap:4px 16px;white-space:nowrap;justify-content:space-between"><span>EVERYTHING STAYS ON THIS DEVICE</span><span>* REQUIRED</span></div>

          <div style="border:1px solid var(--ink);padding:14px 16px;display:flex;flex-direction:column;gap:12px">
            <div class="lbl" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <span class="red" style="white-space:nowrap">LOAD FROM SPOTIFY</span>
              <div style="display:flex;gap:6px">
                ${[['track', 'SONG'], ['album', 'ALBUM'], ['artist', 'ARTIST']].map(([k, l]) => html`
                  <span key=${k} class="click" onClick=${() => this.setState({ spType: k, spResults: [], spError: '' })} style="padding:3px 8px;${pill(st.spType === k)}">${l}</span>`)}
              </div>
            </div>
            ${spReady ? this.renderSpotifySearch() : html`
              <div class="lbl muted" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                <span>ADD SPOTIFY CREDENTIALS IN SETTINGS TO SEARCH SONGS, ALBUMS AND ARTISTS.</span>
                <span class="click" onClick=${this.openSettings} style="color:var(--ink);border-bottom:1px solid var(--ink);white-space:nowrap">OPEN SETTINGS</span>
              </div>`}
          </div>

          <label style="display:flex;flex-direction:column;gap:6px">
            ${label('TITLE * ' + (e.title || ''), RED)}
            <input class="field f-red" value=${f.title} onInput=${on('title')} placeholder="Song title"
              style="border-bottom-color:${e.title ? RED : INK};font-size:40px;font-weight:500;font-stretch:72%;letter-spacing:-.02em;padding:2px 0 8px;text-transform:uppercase" />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
            <label style="display:flex;flex-direction:column;gap:6px">
              ${label('ARTIST * ' + (e.artist || ''), e.artist ? RED : MUTE)}
              <input class="field f-red" value=${f.artist} onInput=${on('artist')} placeholder="Who made it" style="border-bottom-color:${e.artist ? RED : INK};${inputStyle}" />
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              ${label('ALBUM')}
              <input class="field f-red" value=${f.album} onInput=${on('album')} placeholder="Album or single" style=${inputStyle} />
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px">
            <label style="display:flex;flex-direction:column;gap:6px">
              ${label('YEAR')}
              <input class="field f-red" value=${f.year} onInput=${on('year')} placeholder="2026" inputMode="numeric" style=${inputStyle} />
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              ${label('GENRE')}
              <input class="field f-red" value=${f.genre} onInput=${on('genre')} placeholder="Dream pop" style=${inputStyle} />
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              ${label('FIRST HEARD')}
              <input class="field f-red" type="date" value=${f.firstHeard} onInput=${on('firstHeard')} style="font-size:18px;padding:4px 0 8px" />
            </label>
          </div>
          <div style="display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px">
            <div style="display:flex;flex-direction:column;gap:8px">
              ${label('RATING')}
              <div style="display:flex;gap:4px">
                ${[1, 2, 3, 4, 5].map(n => html`
                  <span key=${n} class="click h-scale" onClick=${() => this.setForm({ rating: f.rating === n ? 0 : n })} style="font-size:30px;color:${n <= f.rating ? RED : 'var(--line)'}">★</span>`)}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
              ${label('MOOD')}
              <div class="mono" style="display:flex;flex-wrap:wrap;gap:8px;font-weight:500;font-size:11px;letter-spacing:.04em">
                ${moods.map(m => {
                  const sel = f.moods.includes(m);
                  return html`<span key=${m} class="click" onClick=${() => this.setForm({ moods: sel ? f.moods.filter(x => x !== m) : [...f.moods, m] })}
                    style="padding:6px 10px;${pill(sel)};border:1px solid ${sel ? INK : 'var(--line)'}">${m}</span>`;
                })}
                <input class="mono" value=${st.moodDraft} onInput=${ev => this.setState({ moodDraft: ev.target.value })} onKeyDown=${onMoodKey} placeholder="+ NEW, ENTER"
                  style="width:110px;padding:6px 10px;border:1px dashed var(--mute);background:transparent;outline:none;font-weight:500;font-size:11px;letter-spacing:.04em" />
              </div>
            </div>
          </div>
          <label style="display:flex;flex-direction:column;gap:8px">
            <div class="lbl muted" style="display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:space-between"><span>LYRICS — OPTIONAL</span><span>ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION</span></div>
            <textarea class="mono f-box" value=${f.lyrics} onInput=${on('lyrics')} placeholder="Paste or type lyrics…"
              style="height:120px;resize:vertical;border:1px solid var(--line);background:var(--field);padding:12px 14px;outline:none;font-size:13px;line-height:1.6"></textarea>
          </label>
          <div class="mono" style="display:flex;justify-content:flex-end;gap:12px;font-weight:500;font-size:12px;letter-spacing:.06em">
            <span class="click h-row" onClick=${() => (st.editingId ? this.openSong(st.editingId) : this.go('library'))} style="padding:14px 22px;border:1px solid var(--ink)">CANCEL</span>
            <span class="click h-redbg" onClick=${() => this.saveForm()} style="padding:14px 28px;background:var(--ink);color:var(--bg);opacity:${st.saving ? .6 : 1}">
              ${st.saving ? 'SAVING…' : st.editingId ? 'SAVE CHANGES →' : 'SAVE ENTRY →'}
            </span>
          </div>
        </div>
      </div>`;
  }

  renderSpotifySearch() {
    const st = this.state;
    const placeholder = { track: 'Search a song title', album: 'Search an album', artist: 'Search an artist' }[st.spType];
    const artists = list => (list || []).map(a => a.name).join(', ');
    return html`
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:10px;align-items:center">
          <input class="f-ink" value=${st.spQuery} onInput=${e => this.setState({ spQuery: e.target.value })}
            onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); this.spSearch(); } }} placeholder=${placeholder}
            style="flex:1;min-width:0;border:0;border-bottom:1px solid var(--line);background:transparent;outline:none;font-size:16px;padding:6px 0" />
          <span class="lbl click h-redbg" onClick=${() => this.spSearch()} style="background:var(--ink);color:var(--bg);padding:8px 14px">SEARCH</span>
        </div>
        ${st.spLoading && html`<span class="lbl muted">SEARCHING…</span>`}
        ${st.spError && !st.spLoading && html`<span class="lbl red">${st.spError}</span>`}
        ${st.spResults.length > 0 && html`
          <div style="display:flex;flex-direction:column;max-height:248px;overflow:auto">
            ${st.spResults.map(it => {
              const x = it.raw;
              const th = pickImg(it.type === 'track' ? x.album?.images : x.images, true);
              const sub = it.type === 'track' ? artists(x.artists) + ' · ' + (x.album?.name || '')
                : it.type === 'album' ? [artists(x.artists), (x.release_date || '').slice(0, 4), x.total_tracks ? x.total_tracks + ' TRACKS' : ''].filter(Boolean).join(' · ')
                : ((x.genres || []).slice(0, 2).join(', ') || 'ARTIST');
              return html`
                <div key=${x.id} style="display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--rule2)">
                  <div style="width:40px;height:40px;border-radius:${it.type === 'artist' ? '50%' : '0'};background:${th ? bgImage(th) : STRIPE}"></div>
                  <div class="mono" style="display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px">
                    <span class="ellipsis" style="font-weight:500">${x.name.toUpperCase()}</span>
                    <span class="ellipsis muted">${sub.toUpperCase()}</span>
                  </div>
                  <div class="lbl" style="display:flex;gap:8px;font-size:10px">
                    <span class="click h-invert" onClick=${() => this.spUse(it)} style="border:1px solid var(--ink);padding:5px 8px;white-space:nowrap">USE</span>
                    ${it.type === 'album' && html`<span class="click" onClick=${() => this.spAddAlbum(x)} style="background:var(--red);color:#fff;padding:6px 8px;white-space:nowrap">ADD ALL ${x.total_tracks || ''}</span>`}
                  </div>
                </div>`;
            })}
          </div>`}
      </div>`;
  }

  // --- detail --------------------------------------------------------------

  renderDetail() {
    const st = this.state, s = this.cur();
    const hasLyrics = lineCount(s) > 0;
    const refls = [...s.reflections].sort((a, b) => b.date.localeCompare(a.date));
    const meta = [['ALBUM', s.album], ['YEAR', s.year], ['FIRST HEARD', s.firstHeard ? fmt(s.firstHeard + 'T12:00') : ''], ['ADDED', fmt(s.created)]];
    const dTabs = [['lyrics', 'LYRICS & NOTES'], ['refl', `REFLECTIONS (${s.reflections.length})`]];

    return html`
      <div style="padding:4px 40px 80px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:48px">
        <div style="display:flex;flex-direction:column;gap:14px">
          <span class="lbl muted click h-ink" onClick=${this.goLibrary}>← BACK TO LIBRARY</span>
          <div style="width:240px;height:240px;background:${art(s)}"></div>
          <div class="mono" style="display:flex;flex-direction:column;font-size:11px">
            ${meta.map(([k, v]) => html`
              <div key=${k} style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--rule)"><span class="muted">${k}</span><span style="text-align:right">${(v || '—').toUpperCase()}</span></div>`)}
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)">
              <span class="muted">RATING</span>
              <div style="display:flex;gap:1px">
                ${[1, 2, 3, 4, 5].map(i => html`
                  <span key=${i} class="click h-scale2" onClick=${() => this.patchSong(s.id, { rating: s.rating === i ? 0 : i })} style="font-size:15px;color:${i <= s.rating ? RED : 'var(--line)'}">★</span>`)}
              </div>
            </div>
          </div>
          <div class="mono" style="display:flex;flex-wrap:wrap;gap:6px;font-weight:500;font-size:10px;letter-spacing:.04em">
            ${s.moods.map(m => html`<span key=${m} style="padding:5px 8px;background:var(--ink);color:var(--bg)">${m}</span>`)}
          </div>
          <div class="lbl" style="display:flex;gap:16px;padding-top:8px">
            <span class="click" onClick=${() => this.go('add', { editingId: s.id, errors: {}, moodDraft: '', form: { title: s.title, artist: s.artist, album: s.album || '', year: s.year || '', genre: s.genre || '', firstHeard: s.firstHeard || '', rating: s.rating, moods: [...s.moods], lyrics: s.lyrics || '', art: s.art } })}
              style="border-bottom:1px solid var(--ink)">EDIT DETAILS</span>
            <span class="click red" onClick=${() => this.setState({ confirmDel: true })}>DELETE</span>
          </div>
          ${st.confirmDel && html`
            <div class="lbl" style="border:1px solid var(--red);padding:12px;display:flex;flex-direction:column;gap:10px">
              <span>DELETE THIS SONG, ITS NOTES AND REFLECTIONS?</span>
              <div style="display:flex;gap:10px">
                <span class="click" onClick=${() => this.deleteSong(s.id)} style="background:var(--red);color:#fff;padding:6px 12px">DELETE</span>
                <span class="click" onClick=${() => this.setState({ confirmDel: false })} style="padding:6px 12px;border:1px solid var(--ink)">KEEP</span>
              </div>
            </div>`}
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <div class="display" style="font-size:108px;line-height:.84;text-wrap:balance">${s.title.toUpperCase()}</div>
          <div class="mono" style="font-weight:500;font-size:12px;letter-spacing:.06em">${[s.artist, s.genre].filter(Boolean).join(' — ').toUpperCase()}</div>
          <div class="mono" style="display:flex;gap:28px;border-bottom:1px solid var(--ink);font-weight:500;font-size:12px;letter-spacing:.06em;margin-top:12px">
            ${dTabs.map(([k, l]) => html`
              <span key=${k} class="click" onClick=${() => this.setState({ detailTab: k, activeLine: null })}
                style="padding:10px 0;margin-bottom:-1px;border-bottom:2px solid ${st.detailTab === k ? INK : 'transparent'};color:${st.detailTab === k ? INK : MUTE}">${l}</span>`)}
          </div>

          ${st.detailTab === 'lyrics' && !st.lyricsEditing && hasLyrics && this.renderLyrics(s)}
          ${st.detailTab === 'lyrics' && !st.lyricsEditing && !hasLyrics && html`
            <div class="mono" style="padding:40px 0;display:flex;flex-direction:column;gap:12px;align-items:flex-start;font-weight:500;font-size:12px;letter-spacing:.06em">
              <span style="font-family:'Archivo';font-size:40px;font-stretch:72%;letter-spacing:-.02em">NO LYRICS YET</span>
              <span class="muted">ADD THEM TO START ANNOTATING LINE BY LINE.</span>
              <span class="click" onClick=${() => this.startLyrics(s)} style="background:var(--ink);color:var(--bg);padding:12px 20px">+ ADD LYRICS</span>
            </div>`}
          ${st.detailTab === 'lyrics' && st.lyricsEditing && html`
            <div style="display:flex;flex-direction:column;gap:10px;padding-top:12px">
              <div class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION · NOTES STAY ON THEIR LINE NUMBER</div>
              <textarea class="mono" ref=${autofocus} value=${st.lyricsDraft} onInput=${e => this.setState({ lyricsDraft: e.target.value })} placeholder="Paste or type lyrics…"
                style="height:320px;resize:vertical;border:1px solid var(--ink);background:var(--field);padding:14px 16px;outline:none;font-size:14px;line-height:1.7"></textarea>
              <div class="lbl" style="display:flex;gap:12px">
                <span class="click" onClick=${() => this.saveLyrics(s)} style="background:var(--ink);color:var(--bg);padding:10px 18px">SAVE LYRICS</span>
                <span class="click" onClick=${() => this.setState({ lyricsEditing: false })} style="padding:10px 18px;border:1px solid var(--ink)">CANCEL</span>
              </div>
            </div>`}

          ${st.detailTab === 'refl' && html`
            <div style="display:flex;flex-direction:column;padding-top:8px">
              <div class="mono click h-slide" onClick=${() => this.go('reflect', { reflId: null, reflDraft: '', reflDate: new Date().toISOString(), showInsert: false })}
                style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-weight:500;font-size:12px;letter-spacing:.06em;color:var(--red)">
                <span>+ WRITE A NEW REFLECTION</span><span>→</span>
              </div>
              ${refls.map(r => {
                const d = new Date(r.date);
                return html`
                  <div key=${r.id} class="click h-row" onClick=${() => this.openRefl(r)} style="display:grid;grid-template-columns:120px minmax(0,1fr) 60px;gap:24px;border-top:1px solid var(--rule);padding:16px 0">
                    <div style="display:flex;flex-direction:column;gap:2px">
                      <span style="font-size:36px;line-height:1;font-weight:500;font-stretch:72%">${pad(d.getDate()) + '.' + pad(d.getMonth() + 1)}</span>
                      <span class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">${WD[d.getDay()].slice(0, 3) + ' · ' + d.getFullYear()}</span>
                    </div>
                    <span style="font-size:16px;line-height:1.5;text-wrap:pretty;white-space:pre-line">${excerpt(r.text, 220)}</span>
                    <span class="mono muted" style="font-weight:500;font-size:10px;text-align:right">${wc(r.text)} W</span>
                  </div>`;
              })}
              ${!s.reflections.length && html`
                <div class="lbl muted" style="border-top:1px solid var(--rule);padding:20px 0">NOTHING WRITTEN YET. WHAT DOES THIS SONG BRING UP FOR YOU?</div>`}
            </div>`}
        </div>
      </div>`;
  }

  startLyrics(s) { this.setState({ lyricsEditing: true, lyricsDraft: s.lyrics || '', activeLine: null }); }

  saveLyrics(s) {
    this.patchSong(s.id, { lyrics: this.state.lyricsDraft.replace(/\s+$/, '') });
    this.setState({ lyricsEditing: false });
    this.flash('LYRICS SAVED');
  }

  saveNote(s) {
    const i = this.state.activeLine, t = this.state.noteDraft.trim();
    this.patchSong(s.id, x => { const notes = { ...x.notes }; if (t) notes[i] = t; else delete notes[i]; return { notes }; });
    this.setState({ activeLine: null });
  }

  removeNote(s) {
    const i = this.state.activeLine;
    this.patchSong(s.id, x => { const notes = { ...x.notes }; delete notes[i]; return { notes }; });
    this.setState({ activeLine: null });
  }

  renderLyrics(s) {
    const st = this.state;
    const cols = 'grid-template-columns:30px minmax(0,1fr) minmax(0,1fr);column-gap:24px';
    let n = 0;
    const lines = (s.lyrics || '').split('\n').map((text, i) => {
      const isText = !!text.trim();
      if (isText) n++;
      return { i, text, isText, n: pad(n), note: s.notes[i] || '', isActive: st.activeLine === i };
    });
    const openLine = i => this.setState({ activeLine: i, noteDraft: s.notes[i] || '' });

    return html`
      <div style="display:flex;flex-direction:column">
        <div class="mono muted" style="display:grid;${cols};font-weight:500;font-size:10px;letter-spacing:.06em;padding:8px 0">
          <span></span>
          <div style="display:flex;justify-content:space-between"><span>LYRICS</span><span class="click" onClick=${() => this.startLyrics(s)} style="color:var(--ink);border-bottom:1px solid var(--ink)">EDIT LYRICS</span></div>
          <span>NOTES — CLICK A LINE TO ANNOTATE</span>
        </div>
        ${lines.map(l => {
          if (!l.isText) return l.i > 0 ? html`<div key=${l.i} style="height:18px"></div>` : null;
          return html`
            <div key=${l.i} style="display:grid;${cols};align-items:baseline;border-top:1px solid var(--rule2);padding:6px 0;background:${l.isActive ? 'var(--hover)' : 'transparent'}">
              <span class="mono muted" style="font-size:10px">${l.n}</span>
              <span class="click h-lyric" onClick=${() => openLine(l.i)} style="font-size:18px;line-height:1.3;color:${l.note || l.isActive ? 'var(--redInk)' : INK}">${l.text}</span>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${l.note && !l.isActive && html`<span class="click" onClick=${() => openLine(l.i)} style="font-size:14px;line-height:1.4;color:var(--ink3);text-wrap:pretty">${l.note}</span>`}
                ${l.isActive && html`
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <textarea ref=${autofocus} value=${st.noteDraft} onInput=${e => this.setState({ noteDraft: e.target.value })}
                      onKeyDown=${e => {
                        if (e.key === 'Escape') this.setState({ activeLine: null });
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) this.saveNote(s);
                      }}
                      placeholder="What do you hear in this line?"
                      style="height:76px;resize:vertical;border:1px solid var(--ink);background:var(--field);padding:8px 10px;outline:none;font-size:14px;line-height:1.4"></textarea>
                    <div class="mono" style="display:flex;gap:12px;font-weight:500;font-size:10px;letter-spacing:.06em">
                      <span class="click" onClick=${() => this.saveNote(s)} style="background:var(--ink);color:var(--bg);padding:5px 10px">SAVE ⌘↵</span>
                      <span class="click" onClick=${() => this.setState({ activeLine: null })} style="padding:5px 0">CANCEL</span>
                      ${l.note && html`<span class="click red" onClick=${() => this.removeNote(s)} style="padding:5px 0">REMOVE</span>`}
                    </div>
                  </div>`}
              </div>
            </div>`;
        })}
      </div>`;
  }

  // --- reflection ----------------------------------------------------------

  renderReflect() {
    const st = this.state, s = this.cur();
    const d = new Date(st.reflDate || Date.now());
    const lyricLines = (s.lyrics || '').split('\n').filter(l => l.trim());
    const others = [...s.reflections].sort((a, b) => b.date.localeCompare(a.date)).filter(r => r.id !== st.reflId);
    const quote = text => this.setState(x => ({ reflDraft: x.reflDraft.replace(/\s*$/, '') + (x.reflDraft.trim() ? '\n\n' : '') + '“' + text + '”\n\n' }));
    const back = () => this.openSong(s.id, 'refl');

    return html`
      <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:64px">
        <div style="display:flex;flex-direction:column;gap:20px;padding-left:80px">
          <div class="lbl click h-fade" onClick=${back} style="display:flex;align-items:center;gap:14px">
            <span class="muted">←</span>
            <div style="width:40px;height:40px;background:${art(s)}"></div>
            <div style="display:flex;flex-direction:column;gap:2px"><span>${s.title.toUpperCase()}</span><span class="muted">${[s.artist, s.genre].filter(Boolean).join(' — ').toUpperCase()}</span></div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:18px">
            <div class="display" style="font-size:150px;line-height:.8;letter-spacing:-.05em">${pad(d.getDate()) + '.' + pad(d.getMonth() + 1)}</div>
            <div class="lbl" style="display:flex;flex-direction:column;gap:4px;padding-bottom:6px">
              <span>${WD[d.getDay()]}</span>
              <span class="muted">${d.getFullYear() + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes())}</span>
            </div>
          </div>
          <div class="lbl" style="display:flex;gap:18px;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);padding:9px 0;color:var(--ink2)">
            <span class="click" onClick=${() => this.setState({ showInsert: !st.showInsert })} style="color:${st.showInsert ? RED : 'var(--ink2)'}">❝ INSERT LYRIC</span>
            <span style="flex:1"></span>
            <span class="muted">${wc(st.reflDraft)} WORDS</span>
          </div>
          <textarea ref=${autofocus} value=${st.reflDraft} onInput=${e => this.setState({ reflDraft: e.target.value })}
            placeholder="Where were you when you listened? What did it bring up?"
            style="min-height:360px;max-width:680px;resize:vertical;border:0;background:transparent;outline:none;font-size:21px;line-height:1.6"></textarea>
          <div class="mono" style="display:flex;gap:12px;font-weight:500;font-size:12px;letter-spacing:.06em">
            <span class="click h-redbg" onClick=${() => this.saveReflection()} style="padding:14px 28px;background:var(--ink);color:var(--bg)">SAVE REFLECTION</span>
            <span class="click" onClick=${back} style="padding:14px 22px;border:1px solid var(--ink)">CANCEL</span>
            ${st.reflId && html`<span class="click red" onClick=${() => this.deleteReflection()} style="padding:14px 0">DELETE</span>`}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;border-left:1px solid var(--rule);padding-left:28px">
          ${st.showInsert && html`
            <div style="display:flex;flex-direction:column;gap:4px;padding-bottom:16px">
              <div class="lbl red" style="padding-bottom:8px">CLICK A LINE TO QUOTE IT</div>
              ${lyricLines.map((text, i) => html`
                <span key=${i} class="click h-row" onClick=${() => quote(text)} style="font-size:14px;line-height:1.4;padding:5px 6px;border-top:1px solid var(--rule2)">${text}</span>`)}
              ${!lyricLines.length && html`<span class="lbl muted">NO LYRICS ADDED FOR THIS SONG.</span>`}
            </div>`}
          <div class="lbl red">EARLIER REFLECTIONS</div>
          ${others.map(r => html`
            <div key=${r.id} class="click h-fade" onClick=${() => this.openRefl(r)} style="display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--rule);padding-top:12px">
              <div class="lbl" style="display:flex;justify-content:space-between"><span>${fmt(r.date)}</span><span class="muted">${wc(r.text)} W</span></div>
              <span style="font-size:14px;line-height:1.45;color:var(--ink3);text-wrap:pretty">${excerpt(r.text, 120)}</span>
            </div>`)}
          ${!others.length && html`<span class="lbl muted">THIS IS YOUR FIRST ONE.</span>`}
        </div>
      </div>`;
  }

  // --- diary ---------------------------------------------------------------

  renderDiary() {
    const st = this.state, songs = st.songs, y = st.dyYear, m = st.dyMonth;
    const inMonth = iso => { const d = new Date(iso); return d.getFullYear() === y && d.getMonth() === m; };
    const events = [];
    songs.forEach(s => {
      s.reflections.filter(r => inMonth(r.date)).forEach(r => events.push({ key: r.id, date: r.date, s, text: excerpt(r.text, 110) }));
      if (inMonth(s.created) && !s.reflections.some(r => inMonth(r.date) && r.date.slice(0, 10) === s.created.slice(0, 10))) {
        events.push({ key: 'add-' + s.id, date: s.created, s, text: 'Added to the library.' });
      }
    });
    events.sort((a, b) => b.date.localeCompare(a.date));
    const perDay = {};
    events.forEach(e => { const d = new Date(e.date).getDate(); perDay[d] = (perDay[d] || 0) + 1; });
    const nDays = new Date(y, m + 1, 0).getDate();
    const touched = [...new Set(events.map(e => e.s))];
    const refls = songs.flatMap(s => s.reflections.filter(r => inMonth(r.date)));
    const bar = (arr, max) => arr.map(([k, v]) => ({ k, v, w: (max ? Math.round(v / max * 100) : 0) + '%' }));
    const rc = [5, 4, 3, 2, 1].map(r => [stars(r), songs.filter(s => s.rating === r).length]);
    const mc = {};
    songs.forEach(s => s.moods.forEach(x => { mc[x] = (mc[x] || 0) + 1; }));
    const mt = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const stats = [
      { v: pad(touched.length), k: 'SONGS LISTENED TO' },
      { v: touched.length ? (touched.reduce((a, s) => a + s.rating, 0) / touched.length).toFixed(1) : '—', k: 'AVG RATING' },
      { v: pad(refls.length), k: 'REFLECTIONS' },
      { v: refls.reduce((a, r) => a + wc(r.text), 0).toLocaleString(), k: 'WORDS WRITTEN' }
    ];
    const prevMonth = () => this.setState(x => (x.dyMonth === 0 ? { dyMonth: 11, dyYear: x.dyYear - 1 } : { dyMonth: x.dyMonth - 1 }));
    const nextMonth = () => this.setState(x => (x.dyMonth === 11 ? { dyMonth: 0, dyYear: x.dyYear + 1 } : { dyMonth: x.dyMonth + 1 }));
    const bars = (rows, color, keyWidth, keyColor) => rows.map(r => html`
      <div key=${r.k} class="mono" style="display:grid;grid-template-columns:${keyWidth}px 1fr 24px;gap:10px;align-items:center;font-size:11px">
        <span style="color:${keyColor}">${r.k}</span>
        <div style="height:8px;background:var(--track)"><div style="height:8px;background:${color};width:${r.w}"></div></div>
        <span style="text-align:right">${r.v}</span>
      </div>`);

    return html`
      <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:56px">
        <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
          <div style="display:flex;align-items:flex-end;justify-content:space-between">
            <div class="display" style="font-size:clamp(72px,8vw,140px);line-height:.82;min-width:0">${MONTHS[m]}</div>
            <div class="mono" style="display:flex;gap:14px;flex-shrink:0;font-weight:500;font-size:12px;padding-bottom:6px">
              <span class="click h-red" onClick=${prevMonth}>←</span><span>${y}</span><span class="click h-red" onClick=${nextMonth}>→</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)">
            ${stats.map(x => html`
              <div key=${x.k} style="display:flex;flex-direction:column;gap:4px;padding:14px 0">
                <span style="font-size:56px;line-height:1;font-weight:500;font-stretch:72%;letter-spacing:-.03em">${x.v}</span>
                <span class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">${x.k}</span>
              </div>`)}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="lbl" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;white-space:nowrap">
              <span class="red">DAYS WITH ENTRIES</span><span class="muted">GREY NONE · BLACK 1 · RED 2+</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(16,1fr);gap:4px">
              ${Array.from({ length: nDays }, (_, i) => {
                const c = perDay[i + 1] || 0;
                return html`<div key=${i} class="mono" title=${c + (c === 1 ? ' entry' : ' entries')}
                  style="height:40px;background:${c > 1 ? RED : c ? INK : 'var(--track)'};color:${c ? BG : MUTE};font-size:9px;padding:4px;box-sizing:border-box">${pad(i + 1)}</div>`;
              })}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
            <div style="display:flex;flex-direction:column;gap:8px">
              <span class="lbl red">RATINGS · WHOLE LIBRARY</span>
              ${bars(bar(rc, Math.max(...rc.map(r => r[1]))), INK, 70, RED)}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <span class="lbl red">TOP MOODS · WHOLE LIBRARY</span>
              ${bars(bar(mt, mt.length ? mt[0][1] : 0), RED, 90, INK)}
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;border-left:1px solid var(--rule);padding-left:28px">
          <div class="lbl red" style="padding-bottom:12px">DIARY</div>
          ${events.map(e => {
            const d = new Date(e.date);
            return html`
              <div key=${e.key} class="click h-row" onClick=${() => this.openSong(e.s.id, 'refl')} style="display:grid;grid-template-columns:56px 1fr;gap:14px;border-top:1px solid var(--rule);padding:12px 0">
                <div style="display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:32px;line-height:1;font-weight:500;font-stretch:72%">${pad(d.getDate())}</span>
                  <span class="mono muted" style="font-weight:500;font-size:10px">${WD[d.getDay()].slice(0, 3)}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  <div class="mono" style="display:flex;justify-content:space-between;gap:10px;font-weight:500;font-size:11px;line-height:1.3;letter-spacing:.04em">
                    <span class="ellipsis" style="min-width:0">${e.s.title.toUpperCase()}</span>
                    <span class="red" style="white-space:nowrap">${stars(e.s.rating)}</span>
                  </div>
                  <span style="font-size:14px;line-height:1.4;color:var(--ink3);text-wrap:pretty">${e.text}</span>
                </div>
              </div>`;
          })}
          ${!events.length && html`<span class="lbl muted" style="border-top:1px solid var(--rule);padding-top:14px">NO ENTRIES THIS MONTH.</span>`}
        </div>
      </div>`;
  }

  // --- settings ------------------------------------------------------------

  renderSettings() {
    const st = this.state, dark = this.isDark();
    const saved = !!(st.settings.clientId && st.settings.clientSecret);
    const status = st.testStatus || (saved ? 'SAVED' : 'NOT CONNECTED');
    const statusInk = /✓|SAVED/.test(status) ? INK : MUTE;
    const field = 'border:0;border-bottom:1px solid var(--ink);background:transparent;outline:none;font-size:14px;padding:6px 0';

    return html`
      <div onClick=${this.closeSettings} style="position:fixed;inset:0;background:rgba(10,10,9,.5);z-index:20;display:flex;align-items:center;justify-content:center">
        <div onClick=${e => e.stopPropagation()} style="width:560px;max-width:calc(100vw - 48px);max-height:calc(100vh - 48px);overflow:auto;box-sizing:border-box;background:var(--bg);color:var(--ink);border:1px solid var(--ink);padding:32px;display:flex;flex-direction:column;gap:26px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="display" style="font-size:72px;line-height:.82">SETTINGS</div>
            <span class="lbl click h-red" onClick=${this.closeSettings} style="padding:4px">✕ CLOSE</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--ink);padding-top:14px">
            <span class="lbl red">APPEARANCE</span>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:17px">Theme</span>
              <div style="display:flex;border:1px solid var(--ink)">
                ${[['LIGHT', 'light'], ['DARK', 'dark']].map(([l, v]) => html`
                  <span key=${v} class="lbl click" onClick=${() => this.setSettings({ theme: v })} style="padding:8px 16px;${pill(dark === (v === 'dark'))}">${l}</span>`)}
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--ink);padding-top:14px">
            <div class="lbl" style="display:flex;justify-content:space-between"><span class="red">SPOTIFY</span><span style="color:${statusInk}">${status}</span></div>
            <span style="font-size:14px;line-height:1.5;color:var(--ink3);text-wrap:pretty">Optional. Create an app in the Spotify developer dashboard and paste its Client ID and Client secret. They're saved only in this app's local database and used to look up songs, albums and artists.</span>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span class="lbl muted">CLIENT ID</span>
              <input class="mono f-red" value=${st.sd.clientId} onInput=${e => this.setState({ sd: { ...st.sd, clientId: e.target.value.trim() }, testStatus: '' })} placeholder="32-character ID" spellCheck=${false} style=${field} />
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <div class="lbl muted" style="display:flex;justify-content:space-between">
                <span>CLIENT SECRET</span>
                <span class="click" onClick=${e => { e.preventDefault(); this.setState({ showSecret: !st.showSecret }); }} style="color:var(--ink)">${st.showSecret ? 'HIDE' : 'SHOW'}</span>
              </div>
              <input class="mono f-red" type=${st.showSecret ? 'text' : 'password'} value=${st.sd.clientSecret} onInput=${e => this.setState({ sd: { ...st.sd, clientSecret: e.target.value.trim() }, testStatus: '' })} placeholder="32-character secret" spellCheck=${false} style=${field} />
            </label>
            <div class="lbl" style="display:flex;gap:16px;align-items:center">
              <span class="click h-row" onClick=${() => this.testSpotify()} style="border:1px solid var(--ink);padding:8px 14px">TEST CONNECTION</span>
              <span class="click red" onClick=${() => this.setState({ sd: { clientId: '', clientSecret: '' }, testStatus: '' })}>REMOVE</span>
            </div>
          </div>
          <div class="mono" style="display:flex;justify-content:flex-end;gap:12px;border-top:1px solid var(--rule);padding-top:18px;font-weight:500;font-size:12px;letter-spacing:.06em">
            <span class="click" onClick=${this.closeSettings} style="padding:12px 20px;border:1px solid var(--ink)">CANCEL</span>
            <span class="click h-redbg" onClick=${() => this.saveSettings()} style="padding:12px 24px;background:var(--ink);color:var(--bg)">SAVE</span>
          </div>
        </div>
      </div>`;
  }
}

render(html`<${App} />`, document.getElementById('app'));
