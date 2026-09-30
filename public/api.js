async function req(method, url, body) {
  let r;
  try {
    r = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("CAN'T REACH THE LINER NOTES SERVER");
  }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'REQUEST FAILED ' + r.status);
  return j;
}

export const api = {
  bootstrap: () => req('GET', '/api/bootstrap'),
  saveSettings: patch => req('PUT', '/api/settings', patch),

  createSong: song => req('POST', '/api/songs', song),
  updateSong: (id, patch) => req('PATCH', `/api/songs/${id}`, patch),
  deleteSong: id => req('DELETE', `/api/songs/${id}`),

  addReflection: (songId, r) => req('POST', `/api/songs/${songId}/reflections`, r),
  updateReflection: (songId, id, r) => req('PATCH', `/api/songs/${songId}/reflections/${id}`, r),
  deleteReflection: (songId, id) => req('DELETE', `/api/songs/${songId}/reflections/${id}`),

  testSpotify: creds => req('POST', '/api/spotify/test', creds),
  spotifySearch: (type, q) => req('GET', `/api/spotify/search?type=${type}&q=${encodeURIComponent(q)}`),
  importAlbum: body => req('POST', '/api/spotify/import-album', body)
};
