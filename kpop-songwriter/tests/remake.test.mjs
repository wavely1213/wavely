// 리메이크·번안 점검: 원곡 가사 나누기, 동의 항목, 번안 음 수 비교, AI 번안 초안 반영, 점검표·크레딧·rights.csv. 실행: npm run test:remake
import assert from 'node:assert/strict';
import { newRemake, normalizeRemake, parseOriginalLyrics, applyOriginalLyrics, attachOriginalLyrics, requiredConsents, pendingConsents, titleChanged,
  compareAdapt, adaptSummary, remakeCredits, originalCreditLines, rightsRows, remakeOf, remakeKey, prefillTrack, originalLine } from '../src/js/remake/model.js';
import { remakeIssues } from '../src/js/remake/checks.js';
import { adaptTargets, parseAdapt, applyAdapt } from '../src/js/remake/adapt.js';
import { newAlbum, newTrack, releaseChecklist, fillCredits } from '../src/js/album/model.js';
import { exampleSong } from '../src/js/example.js';
import { normalizeMusic } from '../src/js/music/arrangement.js';

const today = new Date(2026, 9, 12); // 2026-10-12
const types = (b) => b.map((x) => x.type);

// ---------- 원곡 가사 붙여넣기 ----------
// 머리말이 있으면 머리말로 나눈다 (빈 줄은 섹션 안에서 무시). 모르는 머리말([間奏])은 섹션을 만들지 않는다
const JA = '[Aメロ]\n君の手を\nにぎりしめて\n\n[Bメロ]\nまだ言えない\n\n[サビ]\n雪の華\n\nふたりで\n\n[間奏]\n\n[Aメロ]\n二番の歌詞\n\n[サビ]\n雪の華\nふたりで';
let blocks = parseOriginalLyrics(JA);
assert.deepEqual(types(blocks), ['Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Chorus']);
assert.deepEqual(blocks[0].lines, ['君の手を', 'にぎりしめて']);
assert.deepEqual(blocks[2].lines, ['雪の華', 'ふたりで']);
// 머리말이 없으면 빈 줄로 나누고 A-B-サビ 순서로 붙인다. 같은 가사 덩어리는 앞의 종류 그대로
assert.deepEqual(types(parseOriginalLyrics('a1\na2\n\nb1\n\nc1\nc2\n\nd1\n\nc1\nc2')), ['Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Chorus']);
assert.deepEqual(types(parseOriginalLyrics('[Verse 1]\nx\n[Pre-Chorus]\ny\n[후렴]\nz\n【Cメロ】\nw\n[Intro]')), ['Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Intro']);
// 모르는 머리말([台詞]·[1番]) 아래 가사는 버리거나 앞 섹션에 붙이지 않고, 빈 줄로 나눠 종류를 짐작한다. 전각 머리말도 안다
assert.deepEqual(parseOriginalLyrics('[サビ]\nA\n[台詞]\nB').map((b) => [b.type, b.lines]), [['Chorus', ['A']], ['Verse', ['B']]]);
assert.deepEqual(types(parseOriginalLyrics('[1番]\na\n\nb\n\nc\n[2番]\nd')), ['Verse', 'Pre-Chorus', 'Chorus', 'Verse']);
assert.deepEqual(parseOriginalLyrics('[Ａメロ]\n君の手を\n\n［サビ］\n雪の華').map((b) => [b.type, b.lines]), [['Verse', ['君の手を']], ['Chorus', ['雪の華']]]);
assert.deepEqual(parseOriginalLyrics('  \n\n'), []);
assert.deepEqual(parseOriginalLyrics('(Oh oh)\nA\n\nB').map((b) => b.lines), [['(Oh oh)', 'A'], ['B']], '괄호 한 줄은 애드립');

// ---------- 번안 곡 만들기 ----------
const song = normalizeMusic(exampleSong());
song.example = false;
song.title = '눈의 꽃';
song.remake = newRemake('adapt');
Object.assign(song.remake.original, { title: '雪の華', artist: '中島美嘉', lyricists: 'Satomi', composers: '松本良喜', language: 'ja' });
blocks = parseOriginalLyrics(JA);
applyOriginalLyrics(song, blocks);
normalizeMusic(song);
assert.equal(song.sections.length, 5);
assert.ok(song.sections.every((s) => s.text === ''), '번안은 한국어 가사 칸을 비운다');
const ol = song.remake.originalLyrics.sections;
assert.deepEqual(ol[song.sections[0].id].map((l) => l.count), [null, 6], '읽기 없는 한자 줄은 셀 수 없다');
assert.equal(Object.keys(ol).length, 5);

// 리메이크·커버는 원곡 가사가 곧 부를 가사
const cover = normalizeMusic(exampleSong());
cover.remake = newRemake('cover');
applyOriginalLyrics(cover, parseOriginalLyrics('[Verse]\n그대 내게\n\n[Chorus]\n사랑해'));
assert.deepEqual(cover.sections.map((s) => s.text), ['그대 내게', '사랑해']);
assert.deepEqual(cover.remake.originalLyrics.sections, {});

// ---------- 동의 항목 ----------
assert.equal(titleChanged(song), true, '雪の華 → 눈의 꽃');
assert.deepEqual(requiredConsents(song), ['adapt', 'arrange', 'retitle']);
song.remake.usesOriginalAudio = true;
assert.deepEqual(requiredConsents(song), ['adapt', 'arrange', 'retitle', 'audio']);
song.remake.usesOriginalAudio = false;
assert.deepEqual(requiredConsents({ title: '雪の華 (Inst.)', instOf: 'x' }, song.remake), ['arrange'], 'Inst.는 개사 빼고, 제목 표시는 무시');
assert.deepEqual(requiredConsents({ title: 'Yuki no Hana' }, { ...song.remake, kind: 'remake' }), ['arrange', 'retitle']);
assert.deepEqual(requiredConsents({ title: ' 雪の華! ' }, { ...song.remake, kind: 'cover' }), [], '띄어쓰기·문장부호 차이는 같은 제목');
song.remake.consents.adapt.status = 'approved';
assert.deepEqual(pendingConsents(song).map((c) => c.id), ['arrange', 'retitle']);

// ---------- 저장된 값 정리 ----------
const messy = { sections: song.sections, remake: { kind: 'zzz', original: { title: 'x', language: 'kr' }, consents: { adapt: { status: 'maybe' } }, originalLyrics: { sections: { [song.sections[0].id]: [{ text: ' 雪 ', kana: 'ゆき' }, { text: '' }], gone: [{ text: 'a' }] } } } };
normalizeRemake(messy);
assert.equal(messy.remake.kind, 'adapt');
assert.equal(messy.remake.original.language, 'ja');
assert.equal(messy.remake.consents.adapt.status, 'none');
assert.equal(messy.remake.consents.ai.status, 'none');
assert.deepEqual(Object.keys(messy.remake.originalLyrics.sections), [song.sections[0].id], '지운 섹션의 원곡 가사는 정리');
assert.deepEqual(messy.remake.originalLyrics.sections[song.sections[0].id], [{ text: '雪', kana: 'ゆき', count: 2 }]);
const plainSong = { sections: [], remake: null };
normalizeRemake(plainSong);
assert.equal('remake' in plainSong, false);
// 가져온 파일의 잘못된 값: 객체가 아닌 remake는 버리고, 칸은 글자로
['adapt', true, [], 3].forEach((bad) => { const x = { sections: [], remake: bad }; normalizeRemake(x); assert.equal('remake' in x, false, String(bad)); });
const nulls = { sections: [], remake: { original: { title: null, composers: 5, language: null }, publisher: { original: null }, consents: { adapt: { requestedAt: null, memo: [] } }, originalLyrics: [] } };
normalizeRemake(nulls);
assert.deepEqual([nulls.remake.original.title, nulls.remake.original.composers, nulls.remake.original.language, nulls.remake.publisher.original, nulls.remake.consents.adapt.requestedAt, nulls.remake.consents.adapt.memo], ['', '', 'ja', '', '', '']);
assert.deepEqual(nulls.remake.originalLyrics.sections, {});
// 언어를 바꿔도 읽기(kana)는 남는다
const langSwitch = { sections: [{ id: 'q', type: 'Verse', text: '' }], remake: { ...newRemake('adapt'), originalLyrics: { sections: { q: [originalLine('雪の華', 'ゆきのはな', 'ja')] } } } };
langSwitch.remake.original.language = 'en';
normalizeRemake(langSwitch);
langSwitch.remake.original.language = 'ja';
normalizeRemake(langSwitch);
assert.deepEqual(langSwitch.remake.originalLyrics.sections.q[0], { text: '雪の華', kana: 'ゆきのはな', count: 5 });

// ---------- 번안 음 수 비교 ----------
song.sections[0].text = '너의 손을\n꼭';
song.sections[2].text = '하얀 눈꽃\n둘이서';
let cmp = compareAdapt(song);
assert.equal(cmp.length, 5);
assert.deepEqual(cmp[0].rows.map((r) => [r.want, r.have, r.fit]), [[null, 4, null], [6, 1, false]], '셀 수 없는 줄은 판단하지 않음');
// 비운 섹션은 원곡이 똑같은 반복 후렴일 때만 앞 섹션 가사로 본다. 원곡이 다른 2절은 따로 써야 한다
assert.equal(cmp[4].fromPrev, true);
assert.equal(cmp[4].rows[0].ko, '하얀 눈꽃');
assert.equal(cmp[3].fromPrev, false);
assert.equal(cmp[3].rows[0].ko, '');
assert.deepEqual(adaptSummary(song), { lines: 8, missing: 2, off: 1, extra: 0, unread: 5 }, '한자 줄 5개(君の手を·まだ言えない·雪の華 둘·二番の歌詞)는 읽기 필요');
song.sections[1].text = '아직 말 못 해\n한 줄 더';
assert.equal(compareAdapt(song)[1].extra, 1);
// 기타 언어는 세지 않는다: 줄 수만 본다
const zh = normalizeMusic(exampleSong());
zh.remake = newRemake('adapt');
zh.remake.original.language = 'other';
applyOriginalLyrics(zh, parseOriginalLyrics('[Verse]\n你问我爱你有多深\n我爱你有几分'));
normalizeMusic(zh);
zh.sections[0].text = '그대가 물어보네요\n얼마나';
assert.deepEqual(adaptSummary(zh), { lines: 2, missing: 0, off: 0, extra: 0, unread: 0 });

// ---------- AI 번안 초안 ----------
song.sections.forEach((s) => { s.text = ''; });
const targets = adaptTargets(song);
assert.deepEqual(targets.map((t) => t.id), song.sections.slice(0, 4).map((s) => s.id), '똑같은 반복 후렴은 비워 둔다');
// サビA·サビB·大サビA: 바로 앞 후렴(B)과 원곡이 다르면 마지막 후렴도 따로 쓴다 (비우면 B의 한국어가 들어감)
{
  const x = normalizeMusic(exampleSong());
  x.remake = newRemake('adapt');
  applyOriginalLyrics(x, parseOriginalLyrics('[サビ]\nA\n\n[サビ]\nB\n\n[大サビ]\nA'));
  normalizeMusic(x);
  x.sections[0].text = '가';
  x.sections[1].text = '나';
  assert.deepEqual(adaptTargets(x).map((t) => t.id), [x.sections[2].id]);
  assert.equal(compareAdapt(x)[2].fromPrev, false, '나(B)로 채운 것으로 보지 않음');
  assert.equal(adaptSummary(x).missing, 1);
}
assert.throws(() => parseAdapt({ sections: [{ id: 'nope', lines: ['a'] }] }, targets, 'ja'));
// 중간에 빈 줄이 있으면 뒤 줄이 원곡과 어긋나므로 그 섹션은 버린다. 한자가 섞인 읽기는 받지 않는다
assert.throws(() => parseAdapt({ sections: [{ id: song.sections[0].id, lines: ['', '꼭'] }] }, targets, 'ja'));
assert.equal(parseAdapt({ sections: [{ id: song.sections[0].id, lines: [{ ko: '가', kana: '雪のはな' }] }] }, targets, 'ja')[song.sections[0].id][0].kana, '');
const parsed = parseAdapt({ sections: [
  { id: song.sections[0].id, lines: [{ ko: '너의 두 손을', kana: 'きみのてを' }, { ko: '꼭 잡아 줄게요', kana: 'x' }, { ko: '넘친 줄' }] },
  { id: song.sections[2].id, lines: ['하얀 눈꽃', '둘이서'] },
] }, targets, 'ja');
assert.equal(parsed[song.sections[0].id].length, 2, '원곡 줄 수로 자른다');
song.sections[2].text = '내가 쓴 후렴';
assert.equal(applyAdapt(song, parsed), 1, '그사이 쓴 섹션은 그대로');
assert.equal(song.sections[0].text, '너의 두 손을\n꼭 잡아 줄게요');
assert.equal(song.sections[2].text, '내가 쓴 후렴');
assert.equal(song.remake.aiUsed, true);
assert.deepEqual(song.remake.originalLyrics.sections[song.sections[0].id].map((l) => [l.kana, l.count]), [['きみのてを', 5], ['', 6]], '빈 읽기만 채운다');

// 다시 붙이기: 섹션·한국어 가사는 그대로 두고 원곡 가사만 (제작 패키지로 옮긴 곡). 같은 원곡 줄의 읽기는 이어 쓴다
{
  const before = song.sections.map((s) => [s.id, s.text]);
  const kept = song.remake.originalLyrics.sections[song.sections[0].id][0].kana;
  song.remake.originalLyrics = { lang: 'ja', sections: {} };
  // 실제로는 이전 읽기가 없지만, 같은 곡에서 다시 붙이면 읽기를 이어 쓰는지 보려고 한 줄 남긴다
  song.remake.originalLyrics.sections[song.sections[0].id] = [originalLine('君の手を', kept, 'ja')];
  const res = attachOriginalLyrics(song, parseOriginalLyrics(JA));
  assert.deepEqual(res, { attached: 5, blocks: 5, sections: 5 });
  assert.deepEqual(song.sections.map((s) => [s.id, s.text]), before, '섹션·가사 그대로');
  assert.equal(song.remake.originalLyrics.sections[song.sections[0].id][0].kana, 'きみのてを');
  assert.equal(adaptSummary(song).lines, 8);
}

// ---------- 크레딧 ----------
assert.deepEqual(remakeCredits(song.remake, '물결'), { lyricists: 'Satomi, 물결', koreanLyricists: '물결', composers: '松本良喜', arrangers: '물결' });
assert.deepEqual(remakeCredits({ ...song.remake, kind: 'cover' }, '물결'), { lyricists: 'Satomi', koreanLyricists: '', composers: '松本良喜', arrangers: '물결' });
assert.deepEqual(remakeCredits({ ...song.remake, kind: 'cover', original: { ...song.remake.original, arrangers: 'A' } }, '물결').arrangers, 'A');
assert.equal(remakeCredits(song.remake).lyricists, 'Satomi', '이름 없이 부르면 원곡 정보만');
assert.ok(originalCreditLines(song.remake, { koreanLyricists: '물결' }).some((l) => l === '한국어 가사: 물결'));
assert.ok(!originalCreditLines({ ...song.remake, kind: 'cover' }, { koreanLyricists: '물결' }).some((l) => l.includes('한국어 가사')), '번안이 아니면 남은 값을 쓰지 않음');
assert.equal('originalLyrics' in remakeKey(song.remake), false);

// ---------- 점검표 ----------
const album = newAlbum();
Object.assign(album, { title: '겨울 노래', artist: '물결', releaseDate: '2026-12-20', cLine: '2026 물결뮤직', pLine: '2026 물결뮤직' });
// 앱에서처럼: 곡을 넣을 때 원곡 정보로 미리 채우고 → 빈 크레딧 채우기. 작사 칸에 번안 작사가가 더해진다
album.tracks = [prefillTrack({ ...newTrack(song.id), isTitle: true }, song)];
assert.equal(album.tracks[0].lyricists, 'Satomi');
fillCredits(album, [song], '물결');
assert.deepEqual([album.tracks[0].lyricists, album.tracks[0].koreanLyricists, album.tracks[0].composers, album.tracks[0].arrangers], ['Satomi, 물결', '물결', '松本良喜', '물결']);
const masters = { [song.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, lufs: -9, peak: -1, duration: 200 } };
const opts = { masters, coverInfo: { width: 3000, height: 3000 }, today };
let items = releaseChecklist(album, [song], opts);
const texts = (level) => items.filter((i) => i.level === level).map((i) => i.text);
assert.ok(texts('error').some((t) => t.includes('이용 허락 전') && t.includes('편곡(요청 전)') && t.includes('제목 변경(요청 전)')));
assert.ok(texts('error').some((t) => t.includes('서면 동의서')));
assert.ok(texts('error').every((t) => t.startsWith('1번 「눈의 꽃」') || !t.includes('허락')), '트랙 이름을 앞에 붙인다');
assert.ok(texts('warn').some((t) => t.includes('AI 사용이 승인으로')), '앨범 AI 표기 기본값이 켜져 있다');
assert.ok(texts('warn').some((t) => t.includes('Suno 약관')));
assert.ok(texts('warn').some((t) => t.includes('일본곡인데 원출판사')));
assert.equal(items.filter((i) => i.text.includes('Content ID')).length, 1);
assert.equal(items.find((i) => i.text.includes('이용 허락 전')).go.tab, 'concept');

// 다 채우면 리메이크 오류 없음
['arrange', 'retitle', 'ai'].forEach((k) => { song.remake.consents[k].status = 'approved'; });
song.remake.proofFile = '동의서.pdf';
song.remake.publisher.subPublisherKR = '어느 퍼블리싱';
album.ai = { lyrics: false, composition: false, vocals: false, note: '' };
song.sections.forEach((s, i) => { if (!s.text.trim() && i !== 4) s.text = '가사 한 줄'; });
items = releaseChecklist(album, [song], opts);
assert.deepEqual(texts('error'), []);
assert.deepEqual(texts('warn').filter((t) => /허락|원곡|Suno|번안/.test(t)), []);

// 크레딧·아티스트·제목 규칙
album.tracks[0].composers = '물결';
album.artist = '물결 & 中島美嘉';
items = releaseChecklist(album, [song], opts);
assert.ok(texts('error').some((t) => t.includes('원곡 작곡가(松本良喜)')));
assert.ok(texts('warn').some((t) => t.includes('아티스트 칸에 원곡 아티스트')));
album.artist = 'Shadow';
song.remake.original.artist = 'Ado';
items = releaseChecklist(album, [song], opts);
assert.ok(!texts('warn').some((t) => t.includes('아티스트 칸')), '이름 일부가 겹치는 건 아님');
song.remake.original.artist = '中島美嘉';
album.tracks[0].composers = '松本良喜';
album.artist = '물결';
album.tracks[0].koreanLyricists = '';
song.remake.consents.adapt = { status: 'requested', requestedAt: '2026-09-20', answeredAt: '', memo: '' };
items = releaseChecklist(album, [song], opts);
assert.ok(texts('warn').some((t) => t.includes('한국어 가사(번안) 작사가')));
assert.ok(texts('warn').some((t) => t.includes('개사·번역 허락을 요청한 지 22일')));
song.remake.consents.adapt.status = 'denied';
items = releaseChecklist(album, [song], opts);
assert.ok(texts('error').some((t) => t.includes('개사·번역 동의가 거절')));
song.remake.consents.adapt = { status: 'approved', requestedAt: '2026-09-20', answeredAt: '2026-10-01', memo: 'OP 서면' };
album.tracks[0].koreanLyricists = '물결';

// ---------- Inst. 사본은 원곡 곡의 권리 기록을 따른다 ----------
const inst = { ...JSON.parse(JSON.stringify(song)), id: 'inst1', title: '눈의 꽃 (Inst.)', instOf: song.id };
inst.remake.consents.arrange.status = 'none'; // 사본 쪽 기록은 낡아도
assert.equal(remakeOf(inst, [song, inst]), song.remake);
const instIssues = remakeIssues(inst, { ...newTrack(inst.id), composers: '松本良喜', lyricists: '' }, album, { songs: [song, inst], today });
assert.deepEqual(instIssues.filter((i) => i.level === 'error'), []);
assert.equal(remakeOf(inst, [inst]), inst.remake, '원곡 곡이 없으면 사본의 기록');

// ---------- rights.csv ----------
const rows = rightsRows(album, [song]);
assert.equal(rows[0][10], 'Consent');
assert.deepEqual(rows.slice(1).map((r) => [r[10], r[11], r[12]]), [['서면 동의서(증빙)', 'Y', '파일 있음'], ['개사·번역', 'Y', '승인'], ['편곡', 'Y', '승인'], ['제목 변경', 'Y', '승인'], ['AI 사용', 'N', '승인']]);
assert.equal(rows[1][3], '雪の華');
assert.equal(rows[1][16], '동의서.pdf');
assert.deepEqual(rightsRows({ tracks: [newTrack('x')] }, [{ id: 'x', title: 'a', sections: [] }]), [rows[0]], '리메이크가 아닌 곡은 행 없음');
// 필수 동의가 없는 커버도 증빙 줄은 들어간다
const plainCover = { id: 'c', title: '雪の華', sections: [], remake: { ...newRemake('cover'), original: { ...song.remake.original }, proofFile: '' } };
assert.deepEqual(rightsRows({ tracks: [newTrack('c')] }, [plainCover]).slice(1).map((r) => [r[10], r[12]]), [['서면 동의서(증빙)', '없음']]);

console.log('remake ok');
