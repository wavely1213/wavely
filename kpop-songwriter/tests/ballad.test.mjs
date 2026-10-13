// 정통 발라드·바리톤·직접 녹음 점검 (D-027): 프리셋, 장르 감지·기본 편곡, Suno 시드, AI 규칙, 음역에 맞는 키, 녹음용 가사표, 발매 점검표. 실행: npm run test:ballad
import assert from 'node:assert/strict';
import { PROGRESSIONS, chordName, isChord, canonicalChord, chordFeel, findProgression } from '../src/js/music/theory.js';
import { songGenre, tempoRange, fitBpm, GENRE_PROFILES, STYLE_SEEDS, seedStyle, templateStyleGenre } from '../src/js/music/genres.js';
import { applyGenreDefaults, normalizeMusic } from '../src/js/music/arrangement.js';
import { VOICE_RANGES } from '../src/js/music/range.js';
import { lyricRules, melodyRules } from '../src/js/ai-rules.js';
import { sunoStyle } from '../src/js/suno.js';
import { recordingOf, singerOf, melodySpan, fitKey, applyKey, recordingSheet, isCurrentKey, addSelfMember } from '../src/js/recording/model.js';
import { newAlbum, newTrack, releaseChecklist } from '../src/js/album/model.js';
import { songProgress } from '../src/js/workflow/progress.js';
import { exampleSong } from '../src/js/example.js';
import { newRemake } from '../src/js/remake/model.js';

const C = 0;
const preset = (id) => PROGRESSIONS.major.find((p) => p.id === id);

// ---------- 프리셋 6개 (ballad-classic 6-2) ----------
const names = (id) => preset(id).degrees.map((c) => chordName(C, 'major', c, !!preset(id).seventh)).join(' ');
assert.equal(names('plagal4m'), 'Fmaj7 Fm7 Cmaj7 Am7 Dm7 G7 Cmaj7 Cmaj7');
assert.equal(names('ripple'), 'Cmaj7 Bm7 E7 Am7 Gm7 C7 Fmaj7 G7');
assert.equal(names('relminor'), 'C F Bm E7 Am C F G', '희재형: seventh 끔');
assert.equal(names('stairs44m'), 'Cmaj7 Dm7 Em7 Fmaj7 Fm7 Em7 Am7 G7');
assert.equal(names('chain67'), 'Em7 A7 Dm7 G7');
assert.equal(names('mixbridge'), 'A♭ B♭ Fm B♭ E♭ A♭ Dm G', '빌린 화음 브릿지: seventh 끔');
['plagal4m', 'ripple', 'relminor', 'stairs44m', 'chain67', 'mixbridge'].forEach((id) => {
  assert.ok(preset(id).degrees.every(isChord), id);
  assert.equal(findProgression('major', preset(id).degrees).id, id, '도수가 다른 프리셋과 겹치지 않음');
  assert.deepEqual(preset(id).degrees.map((c) => canonicalChord('major', c)), preset(id).degrees, '장조에서 음계 안 화음과 같은 글자가 없음');
});
assert.equal(chordFeel('major', '7m'), '6으로 이어 주는 (VIIm)');
assert.equal(chordFeel('major', '5m'), '4로 이어 주는 (v)');
assert.equal(chordName(9, 'major', 'b6M'), 'F', 'A장조 ♭VI');

// ---------- 장르 감지·빠르기 ----------
const g = (genre, subgenre = '', moods = []) => songGenre({ style: { genre, subgenre }, concept: { moods } }).id;
assert.equal(g('Korean ballad', 'mellow piano pop ballad'), 'ballad_classic');
assert.equal(g('감미로운 발라드'), 'ballad_classic');
assert.equal(g('soft piano ballad'), 'ballad_classic');
assert.equal(g('Korean ballad'), 'ballad', '부드러움 표지가 없으면 기존 발라드');
assert.equal(g('K-drama OST ballad'), 'ballad');
assert.equal(g('mellow R&B, city pop'), 'rnb', '발라드라는 말이 없으면 R&B');
assert.equal(g('mellow lofi'), 'bright');
assert.deepEqual(tempoRange({ id: 'ballad_classic' }), [60, 72, 68]);
assert.equal(fitBpm(76, { id: 'ballad_classic' }), 68);
assert.equal(fitBpm(64, { id: 'ballad_classic' }), 64);
assert.equal(templateStyleGenre('ballad', { style: { genre: 'Korean ballad', subgenre: 'mellow piano pop ballad' } }), null, '발라드 템플릿이 장르 칸을 덮지 않음');

// ---------- 기본 편곡 (6-1) ----------
const song = normalizeMusic(exampleSong());
song.example = false;
song.music.mode = 'major';
song.music.bpm = 120;
song.style = { ...song.style, ...seedStyle('ballad_classic', song) };
assert.equal(songGenre(song).id, 'ballad_classic');
applyGenreDefaults(song);
assert.equal(song.music.bpm, 68, '권장 범위 밖이면 68');
const sec = (type) => song.music.sections[song.sections.find((s) => s.type === type).id];
assert.deepEqual(sec('Verse').chords, [1, 2, 3, 4, '4m', 3, 6, 5]);
assert.equal(sec('Verse').seventh, true);
assert.deepEqual(sec('Pre-Chorus').chords, [3, '6d7', 2, 5]);
assert.deepEqual(sec('Chorus').chords, [4, '4m', 3, 6, 2, 5, 1, 1]);
assert.ok(!sec('Chorus').instruments.includes('pad'), '신스 패드는 안 씀 (3-1)');
assert.equal(sec('Chorus').drum, 'ballad');
assert.equal(sec('Verse').drum, 'none', '드럼은 후렴부터');
// 예시 곡은 브릿지 4마디·아웃트로 2마디: 진행이 길면 끝(돌아오는 2–5, 마침 화음)을 살려 줄인다
const bridge = sec('Bridge');
assert.deepEqual(bridge.chords, ['b6M', 'b7M', 2, 5], '4마디 브릿지도 2–5로 후렴에 돌아옴');
assert.deepEqual(sec('Outro').chords, [4, 1], '2마디 아웃트로가 으뜸화음으로 끝남');
assert.equal(bridge.seventh, false, '빌린 화음 브릿지는 3화음');
assert.equal(sec('Intro').seventh, false, '캐논 인트로는 프리셋대로 3화음 (seventh null)');
assert.ok(sec('Intro').instruments.includes('strings'));
assert.equal(GENRE_PROFILES.ballad_classic.mode, 'major');

// ---------- Suno 시드 ----------
assert.deepEqual(STYLE_SEEDS.map((x) => x.id), ['ballad_classic']);
const st = sunoStyle(song);
assert.ok(st.startsWith('Korean ballad, sung in Korean'), st);
assert.ok(!/sung in Korean.*sung in Korean/.test(st));
assert.ok(st.length < 400, `시드 스타일 ${st.length}자`);
assert.ok(!/성시경|김동률|Sung Si|Kim Dong/i.test(JSON.stringify(GENRE_PROFILES.ballad_classic.seed)), '실존 이름이 없음');
assert.equal(seedStyle('ballad_classic', { members: [] }).vocals, 'warm soft male vocal, low-mid register, restrained delivery');
const BARI = 'warm rich baritone male vocal, low-mid register, restrained delivery';
assert.equal(seedStyle('ballad_classic', { members: [{ voice: 'm-baritone' }] }).vocals, BARI, '바리톤이 부르면 바리톤 가이드');
// 직접 녹음: 멤버가 없어도 부를 사람 음역(기본 바리톤)을 보고, 다른 멤버가 부르면 그 멤버를 본다
assert.equal(seedStyle('ballad_classic', { members: [] }, 'm-baritone').vocals, BARI);
assert.equal(seedStyle('ballad_classic', { members: [{ voice: 'm-baritone' }] }, 'm-high').vocals, 'warm soft male vocal, low-mid register, restrained delivery');
// 빠르기: 곡 빠르기가 장르 범위 안이면 그대로, 밖이면 68
assert.equal(seedStyle('ballad_classic', { music: { bpm: 64 } }).bpm, 64);
assert.equal(seedStyle('ballad_classic', { music: { bpm: 120 } }).bpm, 68);
assert.equal(STYLE_SEEDS[0].koRatio, 90, '채우면 한국어 비율 90%');
assert.equal(seedStyle('nope', song), null);

// ---------- AI 규칙 ----------
assert.ok(lyricRules(song).includes('장르(감미로운 정통 발라드) 규칙 (위 규칙과 겹치면 이 규칙을 따른다)') && lyricRules(song).includes('매달리지 않는다'));
assert.ok(lyricRules(song).includes("위의 '반말과 존댓말을 섞지 않는다'의 예외로"), '말높임 예외를 밝힘');
// 영어 '거의 안 씀'은 한국어 비율 90% 이상일 때만 (슬라이더를 낮추면 위 비율 규칙만)
const ko = (n) => lyricRules({ ...song, concept: { ...song.concept, koRatio: n } });
assert.ok(ko(90).includes('영어는 거의 쓰지 않는다') && ko(90).includes('영어는 전체의 약 10%'));
assert.ok(!ko(70).includes('영어는 거의 쓰지 않는다') && ko(70).includes('영어는 전체의 약 30%'));
assert.ok(sunoStyle({ ...song, concept: { ...song.concept, koRatio: 90 } }).startsWith('Korean ballad, sung in Korean, Korean lyrics,'), '90%면 English hook 표시 없음');
assert.ok(melodyRules(song).includes('마지막 후렴') && melodyRules(song).includes('멜로디 규칙'));
const dance = { ...song, style: { genre: 'K-pop dance pop' } };
assert.ok(!lyricRules(dance).includes('장르(') && !melodyRules(dance).includes('장르('), '다른 장르엔 안 붙음');

// AI 요청 글 잡기 (ai.js가 처음 받은 샘플을 기억하므로 같은 가짜를 함께 쓴다)
let prompt = '';
globalThis.window = { claude: { use: async () => ({ json: async (p) => { prompt = p; return { sections: [] }; } }) } };
const { writeMelody, arrangeSong } = await import('../src/js/ai-music.js');
// AI 멜로디 요청에 장르 규칙이 들어간다
{
  await writeMelody(song, { targetIds: [song.sections[1].id] }).catch(() => {});
  assert.ok(prompt.includes('이 곡의 장르(감미로운 정통 발라드) 멜로디 규칙'), '멜로디 프롬프트');
}
// AI 편곡 요청은 이 곡의 장르 묶음과 빠르기를 밝힌다
{
  prompt = '';
  await arrangeSong(song, {}).catch(() => {});
  delete globalThis.window;
  assert.ok(prompt.includes('이 곡의 장르 묶음: 감미로운 정통 발라드 (권장 빠르기 60~72 BPM)'), '편곡 프롬프트');
  assert.ok(prompt.includes('감미로운 정통 발라드(중저음 남성 보컬, 피아노·스트링): 장조, 빠르기 60~72'));
}

// ---------- 바리톤 음역 ----------
assert.deepEqual([VOICE_RANGES['m-baritone'].low, VOICE_RANGES['m-baritone'].high], [45, 69], 'A2~A4');

// ---------- 직접 녹음: 음역에 맞는 키 ----------
const solo = normalizeMusic(exampleSong());
solo.example = false;
solo.members = [{ id: 'me', name: '나', position: '메인보컬', voice: 'm-baritone', tone: '' }];
solo.sections.forEach((s) => { s.members = ['me']; });
assert.equal(recordingOf(solo), null);
solo.recording = { self: true, singerId: '', voice: 'm-baritone' };
assert.equal(singerOf(solo).member.id, 'me');
assert.equal(singerOf(solo).range.high, 69);
// 멜로디: 예시 곡(F# minor 근처)의 코러스 멜로디. 바리톤에 높으면 키나 옥타브를 옮긴다
const span = melodySpan(solo);
assert.ok(span && span.high > span.low);
const k = fitKey(solo);
assert.ok(k, 'fitKey');
if (!k.fits) {
  assert.ok(k.best.span.low >= 45 || !k.best.fits);
  assert.ok(k.best.fits ? k.best.span.high <= 69 : true);
}
// 일부러 높게: 모든 음을 한 옥타브 올리면 음역 밖 → 옥타브를 내리거나 키를 내려 맞춘다
const high = JSON.parse(JSON.stringify(solo));
Object.values(high.music.sections).forEach((sm) => { sm.melody = sm.melody.map((n) => ({ ...n, d: n.d + 7 })); });
const kh = fitKey(high);
assert.equal(kh.fits, false);
assert.equal(kh.best.fits, true);
assert.ok(kh.best.shift < 0, '내려서 맞춤');
// 키 옮기기: 으뜸음·멜로디 옥타브가 바뀌고, 스타일 키가 편곡 키와 같았으면 같이 바뀐다
const { keyName } = await import('../src/js/music/theory.js');
high.style.key = keyName(high.music.root, high.music.mode);
applyKey(high, kh.best);
assert.equal(high.music.root, kh.best.root);
assert.equal(fitKey(high).fits, true);
assert.equal(high.style.key, keyName(high.music.root, high.music.mode));
const inGrid = (x) => Object.values(x.music.sections).every((sm) => sm.melody.every((n) => n.d >= -3 && n.d <= 10));
assert.ok(inGrid(high), '옮긴 멜로디가 멜로디 칸(-3~10) 안');
// 스타일 키가 비어 있으면 옮긴 키로 채운다 (Suno가 같은 키로 MR을 만들게)
const blank = JSON.parse(JSON.stringify(solo));
Object.values(blank.music.sections).forEach((sm) => { sm.melody = sm.melody.map((n) => ({ ...n, d: n.d + 7 })); });
blank.style.key = '';
applyKey(blank, fitKey(blank).best);
assert.equal(blank.style.key, keyName(blank.music.root, blank.music.mode));
// 스타일 키를 따로 적어 두었으면 그대로
blank.style.key = 'E major';
applyKey(blank, { ...fitKey(blank).best, root: (blank.music.root + 2) % 12, octave: 0 });
assert.equal(blank.style.key, 'E major');
// 한 옥타브 폭 멜로디(도~도)는 옥타브를 내리면 칸 밖이라 키만 옮긴다 (멜로디 도수를 칸 밖으로 바꾸지 않음)
const oct = JSON.parse(JSON.stringify(solo));
oct.music.root = 0;
oct.music.mode = 'major';
Object.values(oct.music.sections).forEach((sm) => { sm.melody = []; });
oct.music.sections[oct.sections[1].id].melody = [0, 2, 4, 5, 7, 9, 7, 4].map((d, i) => ({ s: i * 4, l: 4, d }));
const ko2 = fitKey(oct);
assert.equal(ko2.best.octave, 0);
applyKey(oct, ko2.best);
assert.ok(inGrid(oct));
if (!ko2.best.fits) {
  assert.equal(ko2.why, 'grid', '음역보다 좁은 멜로디는 폭 탓이 아님');
  assert.ok(isCurrentKey(fitKey(oct).best), '가장 덜 넘치는 키를 고른 뒤엔 더 옮길 것이 없음 (버튼 없음)');
}
// 마디를 줄여 안 들리는 음표는 보지 않는다
const cut = JSON.parse(JSON.stringify(oct));
const csm = cut.music.sections[cut.sections[1].id];
csm.bars = 1;
csm.melody.push({ s: 40, l: 4, d: 10 });
assert.equal(melodySpan(cut).high, melodySpan({ ...cut, music: { ...cut.music, sections: { ...cut.music.sections, [cut.sections[1].id]: { ...csm, melody: csm.melody.filter((n) => n.s < 16) } } } }).high);
// 음역보다 넓은 멜로디: 가장 덜 넘치는 키
const wide = JSON.parse(JSON.stringify(solo));
const first = Object.values(wide.music.sections).find((sm) => sm.melody.length);
first.melody = [{ s: 0, l: 4, d: -7 }, { s: 4, l: 4, d: 14 }];
Object.values(wide.music.sections).forEach((sm) => { if (sm !== first) sm.melody = []; });
assert.equal(fitKey(wide).best.fits, false);
assert.equal(fitKey(wide).why, 'wide');
// 멜로디가 없으면 null
const empty = JSON.parse(JSON.stringify(solo));
Object.values(empty.music.sections).forEach((sm) => { sm.melody = []; });
assert.equal(fitKey(empty), null);
// 멤버가 없으면 고른 음역
const noMem = { ...JSON.parse(JSON.stringify(solo)), members: [] };
assert.equal(singerOf(noMem).voice, 'm-baritone');
assert.equal(singerOf({ ...noMem, recording: { self: true, voice: 'f-high' } }).voice, 'f-high');

// ---------- 녹음용 가사·마디표 ----------
const sheet = recordingSheet(solo);
assert.ok(sheet.includes('녹음용 가사·마디표'));
assert.ok(sheet.includes('부를 사람: 나 (남성 바리톤'));
assert.match(sheet, /\[Chorus 1\] \d+~\d+마디 · [A-G]#?\d~[A-G]#?\d/);
assert.match(sheet, /\[Intro\] 1~4마디/);
assert.ok(sheet.includes('Suno로 만든 MR은 빠르기·마디가 앱과 조금 다를 수 있어요'));
assert.ok(recordingSheet({ ...solo, remake: newRemake('cover') }).includes('MR을 앱 편곡(song.mid)과 다르게 만들었다면'), '커버·번안 곡은 Suno MR 안내 없음');

// 제작 패키지 안내서: 커버·번안 곡을 직접 녹음하면 Suno MR 안내 대신 사람·DAW MR 안내
{
  const { guide } = await import('../src/js/package.js');
  const own = guide(solo);
  assert.ok(own.includes('[직접 녹음해서 발매하기]') && own.includes('Suno로 가이드 보컬이 든 곡을 만들고'));
  const cov = guide({ ...solo, remake: newRemake('cover') });
  assert.ok(cov.includes('[직접 녹음해서 발매하기 — 커버·번안 곡]') && !cov.includes('Suno로 가이드 보컬이 든 곡을 만들고'));
}

// ---------- 나를 솔로 멤버로 추가 ----------
{
  const fresh = JSON.parse(JSON.stringify(noMem));
  fresh.concept.group = 'girl';
  fresh.sections.forEach((s) => { s.members = []; });
  assert.equal(addSelfMember(fresh), true);
  assert.equal(fresh.concept.group, 'solo_m', '멤버가 없던 곡은 남성 솔로로');
  assert.equal(fresh.members[0].voice, 'm-baritone');
  assert.equal(fresh.recording.singerId, fresh.members[0].id);
  assert.ok(fresh.sections.filter((s) => s.type === 'Chorus').every((s) => s.members[0] === fresh.members[0].id));
  // 래퍼만 있던 곡: 나눈 파트는 두고 비어 있는 섹션만
  const rap = JSON.parse(JSON.stringify(noMem));
  rap.concept.group = 'boy';
  rap.members = [{ id: 'r', name: '래퍼', position: '래퍼', voice: 'rap', tone: '' }];
  rap.sections.forEach((s) => { s.members = s.type === 'Rap' || s.type === 'Verse' ? ['r'] : []; });
  assert.equal(addSelfMember(rap), false);
  assert.equal(rap.concept.group, 'boy', '그룹은 그대로');
  assert.deepEqual(rap.sections.find((s) => s.type === 'Verse').members, ['r'], '이미 나눈 파트는 그대로');
  assert.equal(rap.sections.find((s) => s.type === 'Chorus').members.includes(rap.members[1].id), true);
}

// ---------- 발매 점검표: AI 표기 ----------
const album = newAlbum();
Object.assign(album, { title: '나의 노래', artist: '물결', releaseDate: '2026-12-20', cLine: '2026 물결', pLine: '2026 물결' });
album.tracks = [{ ...newTrack(solo.id), isTitle: true, lyricists: '물결', composers: '물결', arrangers: '물결' }];
const today = new Date(2026, 9, 13);
const VOC = '수록곡을 모두 직접 녹음해서 발매하는데';
let items = releaseChecklist(album, [solo], { today });
assert.ok(items.some((i) => i.level === 'warn' && i.text.includes(VOC)), '보컬 AI 표기 경고');
album.ai = { lyrics: true, composition: false, vocals: false, note: '' };
items = releaseChecklist(album, [solo], { today });
assert.ok(!items.some((i) => i.text.includes(VOC)));
assert.ok(items.some((i) => i.level === 'info' && i.text.includes('MR을 Suno로 만들었다면')));
const inst = { ...JSON.parse(JSON.stringify(solo)), id: 'inst', instOf: solo.id };
album.ai.vocals = true;
album.tracks.push({ ...newTrack('inst') });
items = releaseChecklist(album, [solo, inst], { today });
assert.equal(items.filter((i) => i.text.includes(VOC)).length, 1, 'Inst. 트랙은 빼고 봄');
// 다른 곡은 Suno가 부른 앨범: AI 표기는 앨범 하나라 끄라고 하지 않고, 메모에 적게 한다
const suno = { ...JSON.parse(JSON.stringify(solo)), id: 'suno', recording: null };
album.tracks.push({ ...newTrack('suno'), lyricists: '물결', composers: '물결', arrangers: '물결' });
items = releaseChecklist(album, [solo, inst, suno], { today });
assert.ok(!items.some((i) => i.text.includes(VOC)), '섞인 앨범은 보컬 끄기 경고 없음');
assert.ok(items.some((i) => i.level === 'info' && i.text.includes('1번 곡은 직접 녹음했어요')));
album.ai.note = '1번은 아티스트가 직접 노래';
items = releaseChecklist(album, [solo, inst, suno], { today });
assert.ok(!items.some((i) => i.text.includes('곡은 직접 녹음했어요')), '메모를 적으면 안내 없음');
// 커버·번안 곡을 직접 녹음: MR은 사람·DAW로 만드니 Suno 작곡·편곡 안내 없음
const cover = { ...JSON.parse(JSON.stringify(solo)), id: 'cover', remake: newRemake('cover') };
const al2 = { ...album, ai: { lyrics: false, composition: false, vocals: false, note: '' }, tracks: [{ ...newTrack('cover'), isTitle: true, lyricists: '원작', composers: '원작', arrangers: '물결' }] };
items = releaseChecklist(al2, [cover], { today });
assert.ok(!items.some((i) => i.text.includes('MR을 Suno로 만들었다면')));

// ---------- 진행 단계 안내 ----------
const pr = songProgress(solo, { albums: [], songs: [solo] });
assert.ok(pr.steps.find((s) => s.id === 'suno').hint.includes('MR(스템)'));
assert.ok(pr.steps.find((s) => s.id === 'master').hint.includes('직접 녹음해 믹스한 WAV'));

console.log('ballad ok');
