import type { MusicalMode } from '../types/synth';

export interface MidiNoteEvent {
  time: number;
  duration: number;
  note: number;
  velocity: number;
}

export type MidiStyle = 'ambient' | 'arpeggio' | 'house' | 'broken' | 'cinematic' | 'shuffle' | 'jungle' | 'minimal';

export const MIDI_STYLES: { id: MidiStyle; name: string; detail: string; bpm: number }[] = [
  { id: 'ambient', name: 'Ambient drift', detail: 'Slow, spacious chord tones', bpm: 76 },
  { id: 'arpeggio', name: 'Glass arpeggio', detail: 'Flowing, cascading notes', bpm: 104 },
  { id: 'house', name: 'Forest house', detail: 'Four-on-the-floor melodic pulse', bpm: 124 },
  { id: 'broken', name: 'Broken rhythm', detail: 'Syncopated, off-grid phrases', bpm: 112 },
  { id: 'cinematic', name: 'Cinematic', detail: 'Long notes and rising phrases', bpm: 82 },
  { id: 'shuffle', name: 'Organic shuffle', detail: 'Loose swung movement', bpm: 98 },
  { id: 'jungle', name: 'Canopy jungle', detail: 'Quick, playful melodic runs', bpm: 138 },
  { id: 'minimal', name: 'Minimal pulse', detail: 'Sparse notes with room to breathe', bpm: 90 },
];

const PROGRESSIONS: number[][] = [
  [0, 5, 3, 4], [0, 3, 5, 4], [5, 3, 0, 4], [0, 4, 5, 3],
  [1, 4, 0, 5], [0, 2, 5, 4], [3, 4, 0, 5], [0, 5, 1, 4],
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Generates a four-bar MIDI-like phrase from diatonic chords in the active mode. */
export function createChordMelody(mode: MusicalMode, style: MidiStyle, bpmOverride?: number): { events: MidiNoteEvent[]; bpm: number; duration: number } {
  const styleInfo = MIDI_STYLES.find((s) => s.id === style) || MIDI_STYLES[0];
  const bpm = clamp(bpmOverride ?? styleInfo.bpm, 55, 180);
  const beat = 60000 / bpm;
  const bar = beat * 4;
  const progression = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
  const scale = mode.notes;
  const events: MidiNoteEvent[] = [];
  const chordAt = (degree: number) => [0, 2, 4].map((step) => scale[(degree + step) % scale.length]);
  const midiFromFreq = (freq: number) => Math.round(69 + 12 * Math.log2(freq / 440));

  for (let measure = 0; measure < 4; measure++) {
    const chord = chordAt(progression[measure]);
    const rootMidi = midiFromFreq(chord[0]) + 12;
    const triad = chord.map((f) => midiFromFreq(f) + 12);
    const start = measure * bar;
    const add = (at: number, note: number, duration: number, velocity = 0.72) =>
      events.push({ time: Math.max(0, at), duration, note: clamp(note, 36, 96), velocity });

    if (style === 'ambient' || style === 'cinematic') {
      triad.forEach((n, i) => add(start + i * beat * (style === 'ambient' ? 0.5 : 0.15), n + 12, bar * 0.82, 0.42 + i * 0.08));
      add(start + bar * 0.52, rootMidi + 24, beat * 1.7, 0.55);
      if (style === 'cinematic') add(start + bar * 0.76, triad[2] + 24, beat * 1.1, 0.48);
    } else if (style === 'arpeggio') {
      const seq = [0, 1, 2, 1, 2, 1, 0, 1];
      seq.forEach((v, i) => add(start + i * beat * 0.5, triad[v] + 12, beat * 0.42, 0.6 + (i % 4) * 0.06));
    } else if (style === 'house') {
      [0, 1, 2, 3].forEach((b) => add(start + b * beat, triad[[0, 2, 1, 2][b]] + 12, beat * 0.72, b === 0 ? 0.82 : 0.62));
      add(start + beat * 2.5, triad[1] + 24, beat * 0.35, 0.5);
    } else if (style === 'broken') {
      [0, 1.5, 2.25, 3.5].forEach((b, i) => add(start + b * beat, triad[[0, 2, 1, 2][i]] + 12, beat * 0.42, 0.65));
      add(start + beat * 0.75, triad[1] + 24, beat * 0.3, 0.42);
    } else if (style === 'shuffle') {
      [0, 0.67, 1.5, 2.17, 3, 3.67].forEach((b, i) => add(start + b * beat, triad[i % 3] + 12, beat * 0.48, 0.58));
    } else if (style === 'jungle') {
      const chordDegrees = [progression[measure], progression[measure] + 2, progression[measure] + 4].map((d) => d % scale.length);
      for (let i = 0; i < 16; i++) {
        const chordDegree = chordDegrees[i % chordDegrees.length];
        const passingDegree = (chordDegree + 1) % scale.length;
        const degree = i % 4 === 3 ? passingDegree : chordDegree;
        add(start + i * beat * 0.25, midiFromFreq(scale[degree]) + 24, beat * 0.19, i % 4 === 0 ? 0.72 : 0.46);
      }
    } else {
      add(start, triad[0] + 12, beat * 0.7, 0.75);
      add(start + beat * 2, triad[2] + 12, beat * 0.55, 0.55);
    }
  }
  events.sort((a, b) => a.time - b.time);
  return { events, bpm, duration: bar * 4 };
}

function readVar(data: Uint8Array, state: { i: number }): number {
  let value = 0;
  for (let count = 0; count < 4 && state.i < data.length; count++) {
    const byte = data[state.i++];
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) break;
  }
  return value;
}

/** Small Standard MIDI File parser: note-on/off, running status, tempo meta events. */
export function parseMidiFile(buffer: ArrayBuffer): MidiNoteEvent[] {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const ascii = (i: number) => String.fromCharCode(data[i], data[i + 1], data[i + 2], data[i + 3]);
  if (data.length < 14 || ascii(0) !== 'MThd') throw new Error('This does not look like a Standard MIDI file.');
  const headerLength = view.getUint32(4);
  const tracks = view.getUint16(10);
  const division = view.getUint16(12);
  if (division & 0x8000) throw new Error('SMPTE time division is not supported yet.');
  const ppq = division || 480;
  let offset = 8 + headerLength;
  let tempo = 500000;
  const raw: { tick: number; note: number; velocity: number; on: boolean; track: number }[] = [];
  for (let track = 0; track < tracks && offset + 8 <= data.length; track++) {
    if (ascii(offset) !== 'MTrk') break;
    const length = view.getUint32(offset + 4);
    const end = Math.min(data.length, offset + 8 + length);
    const state = { i: offset + 8 };
    let tick = 0;
    let running = 0;
    while (state.i < end) {
      tick += readVar(data, state);
      let status = data[state.i];
      if (status & 0x80) { state.i++; running = status; } else status = running;
      if (status === 0xff) {
        const type = data[state.i++];
        const size = readVar(data, state);
        if (type === 0x51 && size === 3) tempo = (data[state.i] << 16) | (data[state.i + 1] << 8) | data[state.i + 2];
        state.i += size;
      } else if (status === 0xf0 || status === 0xf7) {
        state.i += readVar(data, state);
      } else {
        const command = status & 0xf0;
        const note = data[state.i++];
        const velocity = command === 0xc0 || command === 0xd0 ? 0 : data[state.i++];
        if (command === 0x90 || command === 0x80) {
          raw.push({ tick, note, velocity, on: command === 0x90 && velocity > 0, track });
        }
      }
    }
    offset = end;
  }
  const opened = new Map<string, { tick: number; velocity: number }[]>();
  const result: MidiNoteEvent[] = [];
  for (const event of raw.sort((a, b) => a.tick - b.tick)) {
    const key = `${event.track}:${event.note}`;
    if (event.on) {
      const queue = opened.get(key) || [];
      queue.push({ tick: event.tick, velocity: event.velocity });
      opened.set(key, queue);
    } else {
      const queue = opened.get(key);
      const start = queue?.shift();
      if (start) {
        const msPerTick = (tempo / 1000) / ppq;
        result.push({ time: start.tick * msPerTick, duration: Math.max(70, (event.tick - start.tick) * msPerTick), note: event.note, velocity: start.velocity / 127 });
      }
    }
  }
  for (const [key, queue] of opened) {
    const note = Number(key.split(':')[1]);
    for (const start of queue) result.push({ time: start.tick * (tempo / 1000) / ppq, duration: 350, note, velocity: start.velocity / 127 });
  }
  if (!result.length) throw new Error('No playable notes were found in this MIDI file.');
  return result.sort((a, b) => a.time - b.time);
}
