// In the browser the API is the local server. In the Tauri desktop app
// it's the Rust commands in src-tauri/src/commands.rs, called through window.__TAURI__.
const tauriInvoke = window.__TAURI__?.core.invoke;

/** Sends a JSON request to the local server and returns the parsed response (null for 204). */
async function request(method, url, body) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("CAN'T REACH THE LINER NOTES SERVER");
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'REQUEST FAILED ' + response.status);
  return payload;
}

/** Runs a Rust command. Commands fail with their error message as a string. */
async function invoke(command, args) {
  try {
    return (await tauriInvoke(command, args)) ?? null;
  } catch (error) {
    throw new Error(typeof error === 'string' ? error : 'SOMETHING WENT WRONG');
  }
}

/** Each call as a Tauri command and as a server request: `[command, args]` and `[method, url, body]`. */
const call = (tauriCall, serverRequest) => (tauriInvoke ? invoke(...tauriCall) : request(...serverRequest));

export const api = {
  bootstrap: () => call(['bootstrap'], ['GET', '/api/bootstrap']),
  saveSettings: changes => call(['save_settings', { changes }], ['PUT', '/api/settings', changes]),

  createSong: song => call(['create_song', { song }], ['POST', '/api/songs', song]),
  updateSong: (songId, changes) => call(['update_song', { songId, changes }], ['PATCH', `/api/songs/${songId}`, changes]),
  deleteSong: songId => call(['delete_song', { songId }], ['DELETE', `/api/songs/${songId}`]),

  addReflection: (songId, reflection) =>
    call(['add_reflection', { songId, reflection }], ['POST', `/api/songs/${songId}/reflections`, reflection]),
  updateReflection: (songId, reflectionId, changes) =>
    call(['update_reflection', { songId, reflectionId, changes }], ['PATCH', `/api/songs/${songId}/reflections/${reflectionId}`, changes]),
  deleteReflection: (songId, reflectionId) =>
    call(['delete_reflection', { songId, reflectionId }], ['DELETE', `/api/songs/${songId}/reflections/${reflectionId}`]),

  testSpotify: credentials => call(['test_spotify', { credentials }], ['POST', '/api/spotify/test', credentials]),
  spotifySearch: (type, query) =>
    call(['spotify_search', { kind: type, query }], ['GET', `/api/spotify/search?type=${type}&q=${encodeURIComponent(query)}`]),
  importAlbum: body => call(['import_album', { request: body }], ['POST', '/api/spotify/import-album', body])
};
