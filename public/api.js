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

export const api = {
  bootstrap: () => request('GET', '/api/bootstrap'),
  saveSettings: changes => request('PUT', '/api/settings', changes),

  createSong: song => request('POST', '/api/songs', song),
  updateSong: (songId, changes) => request('PATCH', `/api/songs/${songId}`, changes),
  deleteSong: songId => request('DELETE', `/api/songs/${songId}`),

  addReflection: (songId, reflection) => request('POST', `/api/songs/${songId}/reflections`, reflection),
  updateReflection: (songId, reflectionId, changes) => request('PATCH', `/api/songs/${songId}/reflections/${reflectionId}`, changes),
  deleteReflection: (songId, reflectionId) => request('DELETE', `/api/songs/${songId}/reflections/${reflectionId}`),

  testSpotify: credentials => request('POST', '/api/spotify/test', credentials),
  spotifySearch: (type, query) => request('GET', `/api/spotify/search?type=${type}&q=${encodeURIComponent(query)}`),
  importAlbum: body => request('POST', '/api/spotify/import-album', body)
};
