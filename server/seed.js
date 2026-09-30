// Demo library from the design. Dates are relative to today so the diary has something to show:
// `day` 30 is today, smaller days are further back.

const DEMO_SONGS = [
  {
    title: 'Low Tide Radio', artist: 'Marlo Vance', album: 'Saltwater Tapes', year: '2024', genre: 'Dream pop',
    rating: 5, moods: ['NOSTALGIC', 'DRIVING'], day: 12,
    lyrics: "Porch light humming at a quarter to two\nSalt in the screen door, I'm thinking of you\nThe station keeps fading, the static's a tide\nI leave it playing, I leave it inside\n\nLow tide radio, singing me slow\nEvery song that you left me, I already know\nLow tide radio, don't let it go\nHold the frequency steady, just hold",
    notes: {
      1: "The screen door detail makes it feel like a real place. Maybe a grandparent's house?",
      2: 'The static-as-tide image is the whole song in one line.',
      5: 'Drums drop out here. The space makes the hook land harder.',
      8: "Ends on 'hold' without resolving the chord. Unfinished on purpose."
    },
    reflections: [
      { day: 12, text: 'First listen. Sleepy, warm, a little sad. Added to the library right away.' },
      { day: 19, text: 'Heard it at the laundromat of all places. Stayed through the whole dryer cycle.' },
      { day: 28, text: "Played this on the drive back from the coast. It sounds like the moment right after a conversation ends and you're still replaying it. I used to skip the bridge; tonight it was the only part I wanted." }
    ]
  },
  {
    title: 'Glasshouse', artist: 'The Quiet Hours', album: 'Glasshouse', year: '2021', genre: 'Indie folk',
    rating: 4, moods: ['CALM', 'HOPEFUL'], day: 26,
    lyrics: 'Morning comes in through the glass\nEverything I own is catching light\n\nStay a while, stay a while\nThe day can wait outside',
    reflections: [{ day: 26, text: 'Quiet and bright. Good for the first coffee.' }]
  },
  {
    title: 'Northbound', artist: 'Ines Harlow', album: 'Mile Markers', year: '2019', genre: 'Americana',
    rating: 4, moods: ['DRIVING'], day: 22,
    lyrics: 'Mile marker ninety, the radio gone\nI count the fence posts to keep myself on',
    notes: { 0: 'Harmonica comes in right after this line.' },
    reflections: [{ day: 22, text: 'The harmonica sounds like it was recorded in another room. I like that distance.' }]
  },
  {
    title: 'Paper Moon Motel', artist: 'Delta June', album: 'Motel Tapes', year: '2022', genre: 'Soul',
    rating: 3, moods: ['LATE NIGHT'], day: 19
  },
  {
    title: 'Softer Now', artist: 'Kiro Aoki', album: 'Room Tone', year: '2023', genre: 'Ambient',
    rating: 5, moods: ['CALM', 'MELANCHOLY'], day: 15,
    lyrics: "Turn the lamp down, let the room go gray\nNothing out there needs me today\n\nSofter now, softer now\nI don't need to know how",
    notes: { 0: 'Whispered, almost spoken.', 3: 'Permission to not have answers.' },
    reflections: [{ day: 15, text: 'Keeps revealing something new. Best with headphones and the lights off.' }]
  },
  {
    title: 'Copper Wire', artist: 'Field Static', album: 'Loops', year: '2020', genre: 'Electronic',
    rating: 4, moods: ['ENERGETIC'], day: 11
  },
  {
    title: 'Late Bloom', artist: 'Anaïs Coté', album: 'Late Bloom', year: '2025', genre: 'Chamber pop',
    rating: 4, moods: ['HOPEFUL', 'NOSTALGIC'], day: 8,
    lyrics: 'I was a slow thing, a late spring\nStill learning the words to everything',
    reflections: [{ day: 8, text: 'Title track is better than the single.' }]
  },
  {
    title: 'Undertow', artist: 'Harbor & Hum', album: 'Tidelines', year: '2018', genre: 'Slowcore',
    rating: 3, moods: ['MELANCHOLY', 'LATE NIGHT'], day: 2
  }
];

const padNumber = value => String(value).padStart(2, '0');

/** "YYYY-MM-DD" in local time. */
const toLocalDate = date => `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

export function seedDemoSongs(store, now = new Date()) {
  /** The date `30 - day` days before `now`, at the given hour. */
  function dateForDay(day, hour = 21) {
    const date = new Date(now);
    date.setDate(date.getDate() - (30 - day));
    date.setHours(hour, 10, 0, 0);
    return date;
  }

  for (const { day, reflections = [], ...fields } of DEMO_SONGS) {
    const song = store.songs.create(
      { ...fields, firstHeard: toLocalDate(dateForDay(Math.max(1, day - 2))) },
      { created: dateForDay(day, 20).toISOString() }
    );
    for (const reflection of reflections) {
      store.reflections.add(song.id, { date: dateForDay(reflection.day).toISOString(), text: reflection.text });
    }
  }
}
