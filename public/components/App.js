import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';
import { html } from '../lib/html.js';
import { useSettings } from '../hooks/useSettings.js';
import { useSongs } from '../hooks/useSongs.js';
import { useSystemDarkMode } from '../hooks/useSystemDarkMode.js';
import { useToast } from '../hooks/useToast.js';
import { Nav } from './Nav.js';
import { Toast } from './Toast.js';
import { DiaryView } from './diary/DiaryView.js';
import { currentMonth } from './diary/diaryData.js';
import { LibraryView } from './library/LibraryView.js';
import { DEFAULT_LIBRARY_FILTERS } from './library/libraryData.js';
import { ReflectionEditorView } from './reflection/ReflectionEditorView.js';
import { SettingsModal } from './settings/SettingsModal.js';
import { SongDetailView } from './song-detail/SongDetailView.js';
import { SongFormView } from './song-form/SongFormView.js';

/**
 * Top-level state and navigation. The current screen is a `route`:
 *   { view: 'library' }
 *   { view: 'diary' }
 *   { view: 'songForm', songId }            songId is null for a new song
 *   { view: 'song', songId, tab }           tab is 'lyrics' or 'reflections'
 *   { view: 'reflection', songId, reflectionId }   reflectionId is null for a new one
 * Every navigation bumps `route.visit`, which is used as the view's key so its
 * local state (drafts, open editors) starts fresh.
 */
export function App() {
  const [loadState, setLoadState] = useState({ isLoaded: false, error: '' });
  const [route, setRoute] = useState({ view: 'library', visit: 0 });
  const [libraryFilters, setLibraryFilters] = useState(DEFAULT_LIBRARY_FILTERS);
  const [diaryMonth, setDiaryMonth] = useState(currentMonth);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { message: toastMessage, showToast } = useToast();
  const showError = error => showToast(error.message || 'SOMETHING WENT WRONG', 3200);
  const library = useSongs({ onError: showError });
  const { settings, setSettings, saveSettings } = useSettings({ onError: showError });

  const systemPrefersDark = useSystemDarkMode();
  const isDark = settings.theme ? settings.theme === 'dark' : systemPrefersDark;

  useEffect(() => {
    api.bootstrap().then(
      data => {
        library.setSongs(data.songs);
        setSettings(data.settings);
        setLoadState({ isLoaded: true, error: '' });
      },
      error => setLoadState({ isLoaded: false, error: error.message })
    );
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  // --- navigation ----------------------------------------------------------

  function navigate(nextRoute) {
    setRoute(current => ({ ...nextRoute, visit: current.visit + 1 }));
    window.scrollTo(0, 0);
  }

  const goToLibrary = () => navigate({ view: 'library' });
  const goToDiary = () => navigate({ view: 'diary' });
  const startNewSong = () => navigate({ view: 'songForm', songId: null });
  const editSong = songId => navigate({ view: 'songForm', songId });
  const openSong = (songId, tab = 'lyrics') => navigate({ view: 'song', songId, tab });
  const openReflection = (songId, reflectionId = null) => navigate({ view: 'reflection', songId, reflectionId });

  // --- actions -------------------------------------------------------------

  async function saveSong(songId, fields) {
    try {
      const song = await library.saveSong(songId, fields);
      openSong(song.id);
      showToast(songId ? 'CHANGES SAVED' : 'ADDED TO LIBRARY');
    } catch (error) {
      showError(error);
    }
  }

  async function deleteSong(songId) {
    try {
      await library.deleteSong(songId);
      goToLibrary();
      showToast('SONG DELETED');
    } catch (error) {
      showError(error);
    }
  }

  /** Errors are left to the Spotify panel, which shows them inline. */
  async function importAlbum(request) {
    const { added, album } = await library.importAlbum(request);
    setLibraryFilters({ ...DEFAULT_LIBRARY_FILTERS, query: album });
    goToLibrary();
    showToast(added.length ? `ADDED ${added.length} SONGS FROM ${album.toUpperCase()}` : 'ALREADY IN YOUR LIBRARY');
  }

  async function saveReflection(songId, reflectionId, { text, date }) {
    if (!text) {
      showToast('WRITE SOMETHING FIRST');
      return;
    }
    try {
      await library.saveReflection(songId, reflectionId, { text, date });
      openSong(songId, 'reflections');
      showToast('REFLECTION SAVED');
    } catch (error) {
      showError(error);
    }
  }

  async function deleteReflection(songId, reflectionId) {
    try {
      await library.deleteReflection(songId, reflectionId);
      openSong(songId, 'reflections');
      showToast('REFLECTION DELETED');
    } catch (error) {
      showError(error);
    }
  }

  async function saveCredentials(credentials) {
    await saveSettings(credentials);
    setIsSettingsOpen(false);
    showToast('SETTINGS SAVED');
  }

  // --- render --------------------------------------------------------------

  if (!loadState.isLoaded) {
    return html`<div class="app loading lbl ${loadState.error ? 'red' : 'muted'}">${loadState.error || 'LOADING…'}</div>`;
  }

  function renderView() {
    const { songs } = library;
    const song = songs.find(candidate => candidate.id === route.songId);
    const key = route.visit;

    switch (route.view) {
      case 'library':
        return html`
          <${LibraryView} key=${key} songs=${songs} filters=${libraryFilters}
            onFiltersChange=${changes => setLibraryFilters(current => ({ ...current, ...changes }))}
            onOpenSong=${openSong} onAddSong=${startNewSong} />`;

      case 'diary':
        return html`
          <${DiaryView} key=${key} songs=${songs} month=${diaryMonth} onMonthChange=${setDiaryMonth}
            onOpenSong=${songId => openSong(songId, 'reflections')} />`;

      case 'songForm':
        return html`
          <${SongFormView} key=${key} song=${song}
            knownMoods=${songs.flatMap(existing => existing.moods)}
            isSpotifyConfigured=${Boolean(settings.clientId && settings.clientSecret)}
            onSave=${fields => saveSong(route.songId, fields)}
            onCancel=${() => (route.songId ? openSong(route.songId) : goToLibrary())}
            onImportAlbum=${importAlbum}
            onOpenSettings=${() => setIsSettingsOpen(true)}
            onNotify=${showToast} />`;

      case 'song':
        return song && html`
          <${SongDetailView} key=${key} song=${song} initialTab=${route.tab}
            onBack=${goToLibrary}
            onUpdate=${changes => library.updateSong(song.id, changes)}
            onEdit=${() => editSong(song.id)}
            onDelete=${() => deleteSong(song.id)}
            onWriteReflection=${() => openReflection(song.id)}
            onOpenReflection=${reflectionId => openReflection(song.id, reflectionId)}
            onNotify=${showToast} />`;

      case 'reflection':
        return song && html`
          <${ReflectionEditorView} key=${key} song=${song}
            reflection=${song.reflections.find(reflection => reflection.id === route.reflectionId)}
            onSave=${fields => saveReflection(song.id, route.reflectionId, fields)}
            onDelete=${() => deleteReflection(song.id, route.reflectionId)}
            onBack=${() => openSong(song.id, 'reflections')}
            onOpenReflection=${reflectionId => openReflection(song.id, reflectionId)} />`;

      default:
        return null;
    }
  }

  return html`
    <div class="app">
      <${Nav} route=${route} onLibrary=${goToLibrary} onDiary=${goToDiary} onAddSong=${startNewSong} onSettings=${() => setIsSettingsOpen(true)} />
      ${renderView()}
      ${isSettingsOpen && html`
        <${SettingsModal} settings=${settings} isDark=${isDark}
          onThemeChange=${theme => saveSettings({ theme })}
          onSaveCredentials=${saveCredentials}
          onClose=${() => setIsSettingsOpen(false)} />`}
      <${Toast} message=${toastMessage} />
    </div>`;
}
