// Demo library from the design, dated relative to today so the diary has something to show.

const pad = n => String(n).padStart(2, '0');

export function seedSongs(store, now = new Date()) {
  // "day" 30 is today; smaller days are further back.
  const at = (day, hour = 21) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (30 - day));
    d.setHours(hour, 10, 0, 0);
    return d;
  };
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const S = (title, artist, album, year, genre, rating, moods, day, lyrics = '', notes = {}, refls = []) => ({
    song: {
      title, artist, album, year, genre, rating, moods, lyrics, notes,
      firstHeard: isoDate(at(Math.max(1, day - 2)))
    },
    created: at(day, 20).toISOString(),
    refls: refls.map(([d, text]) => ({ date: at(d).toISOString(), text }))
  });

  const songs = [
    S('Low Tide Radio', 'Marlo Vance', 'Saltwater Tapes', '2024', 'Dream pop', 5, ['NOSTALGIC', 'DRIVING'], 12,
      "Porch light humming at a quarter to two\nSalt in the screen door, I'm thinking of you\nThe station keeps fading, the static's a tide\nI leave it playing, I leave it inside\n\nLow tide radio, singing me slow\nEvery song that you left me, I already know\nLow tide radio, don't let it go\nHold the frequency steady, just hold",
      { 1: "The screen door detail makes it feel like a real place. Maybe a grandparent's house?", 2: 'The static-as-tide image is the whole song in one line.', 5: 'Drums drop out here. The space makes the hook land harder.', 8: "Ends on 'hold' without resolving the chord. Unfinished on purpose." },
      [[12, 'First listen. Sleepy, warm, a little sad. Added to the library right away.'], [19, 'Heard it at the laundromat of all places. Stayed through the whole dryer cycle.'], [28, "Played this on the drive back from the coast. It sounds like the moment right after a conversation ends and you're still replaying it. I used to skip the bridge; tonight it was the only part I wanted."]]),
    S('Glasshouse', 'The Quiet Hours', 'Glasshouse', '2021', 'Indie folk', 4, ['CALM', 'HOPEFUL'], 26,
      'Morning comes in through the glass\nEverything I own is catching light\n\nStay a while, stay a while\nThe day can wait outside', {}, [[26, 'Quiet and bright. Good for the first coffee.']]),
    S('Northbound', 'Ines Harlow', 'Mile Markers', '2019', 'Americana', 4, ['DRIVING'], 22,
      'Mile marker ninety, the radio gone\nI count the fence posts to keep myself on', { 0: 'Harmonica comes in right after this line.' }, [[22, 'The harmonica sounds like it was recorded in another room. I like that distance.']]),
    S('Paper Moon Motel', 'Delta June', 'Motel Tapes', '2022', 'Soul', 3, ['LATE NIGHT'], 19),
    S('Softer Now', 'Kiro Aoki', 'Room Tone', '2023', 'Ambient', 5, ['CALM', 'MELANCHOLY'], 15,
      "Turn the lamp down, let the room go gray\nNothing out there needs me today\n\nSofter now, softer now\nI don't need to know how", { 0: 'Whispered, almost spoken.', 3: 'Permission to not have answers.' }, [[15, 'Keeps revealing something new. Best with headphones and the lights off.']]),
    S('Copper Wire', 'Field Static', 'Loops', '2020', 'Electronic', 4, ['ENERGETIC'], 11),
    S('Late Bloom', 'Anaïs Coté', 'Late Bloom', '2025', 'Chamber pop', 4, ['HOPEFUL', 'NOSTALGIC'], 8,
      'I was a slow thing, a late spring\nStill learning the words to everything', {}, [[8, 'Title track is better than the single.']]),
    S('Undertow', 'Harbor & Hum', 'Tidelines', '2018', 'Slowcore', 3, ['MELANCHOLY', 'LATE NIGHT'], 2)
  ];

  for (const { song, created, refls } of songs) {
    const [added] = store.importSongs([song], null);
    store.setCreated(added.id, created);
    for (const r of refls) store.addReflection(added.id, r);
  }
}
