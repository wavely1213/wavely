// 엔진 테스트용 번들 진입점 (브라우저에서 window.T로 노출)
import { exampleSong } from '../src/js/example.js';
import { normalizeMusic } from '../src/js/music/arrangement.js';
import { buildTimeline } from '../src/js/music/timeline.js';
import { buildMidi } from '../src/js/music/midi.js';
import { renderSong } from '../src/js/music/player.js';
import { encodeWav, zip } from '../src/js/music/pack.js';
import { analyzeAudio, toneOf } from '../src/js/music/analyze.js';
import { matchEq } from '../src/js/music/tonematch.js';
import { buildPackage } from '../src/js/package.js';
import { loadBank } from '../src/js/music/samples.js';
import { master } from '../src/js/music/master.js';
import { integratedLoudness, truePeakEnvelope, maxOf } from '../src/js/music/loudness.js';
window.T = { toneOf, matchEq, exampleSong, normalizeMusic, buildTimeline, buildMidi, renderSong, encodeWav, zip, analyzeAudio, buildPackage, loadBank, master, integratedLoudness, truePeakEnvelope, maxOf };
