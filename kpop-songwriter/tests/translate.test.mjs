// 번안 가사 점검: 모라 세기, AI 답 검사, 원문과 비교, Suno 가사 만들기. 실행: npm run test:translate
import assert from 'node:assert/strict';
import { countMora, singCount } from '../src/js/translate/mora.js';
import { parseTranslation, translationStatus, compareLines, translatedSong, sourceSections } from '../src/js/translate/translate.js';
import { buildLyrics } from '../src/js/suno.js';

assert.equal(countMora('きょうは いっしょに がっこうへ いこう'), 15, '작은 ゃゅょ는 앞 글자와 한 음, っ는 한 음');
assert.equal(countMora('ラーメン'), 4, 'ー·ン도 한 음');
assert.equal(countMora('きみを よぶ (おお) Midnight signal'), 9, '괄호 애드립 제외, 영어는 음절');
assert.equal(singCount('I keep on calling', 'en'), 5);
assert.equal(singCount('君を呼ぶ', 'ja', 'きみをよぶ'), 5, '일본어는 읽기(kana)로 셈');

const song = {
  title: '새벽 신호', concept: { theme: '', moods: [] }, members: [],
  sections: [
    { id: 'v1', type: 'Verse', text: '불 꺼진 거리 위\n혼자 깨어 있어' },
    { id: 'c1', type: 'Chorus', text: 'Midnight signal 들리니' },
    { id: 'c2', type: 'Chorus', text: '' },
  ],
};
assert.deepEqual(sourceSections(song).map((s) => s.id), ['v1', 'c1'], '비운 반복 섹션은 번안하지 않음');
assert.equal(translationStatus(song, 'ja'), 'none');
assert.throws(() => parseTranslation({ sections: [{ id: 'nope', lines: ['a'] }] }, song, 'ja'), (e) => e.code === 'invalid_json');
const t = parseTranslation({ sections: [
  { id: 'v1', lines: [{ text: '消えた街の上', kana: 'きえたまちのうえ' }, { text: 'ひとり起きてる', kana: 'ひとりおきてる' }, { text: '넘친 줄', kana: 'x' }] },
  { id: 'c1', lines: [{ text: 'Midnight signal 聞こえる？', kana: 'Midnight signal きこえる' }] },
  { id: 'zz', lines: ['버림'] },
] }, song, 'ja');
assert.equal(t.sections.v1.length, 2, '원문 줄 수보다 많으면 자름');
assert.equal(t.sections.v1[0].count, 8);
assert.equal(t.sections.c1[0].count, 8, 'Midnight(2)+signal(2)+きこえる(4)');
assert.equal(t.sections.zz, undefined);
song.translations = { ja: t };
assert.equal(translationStatus(song, 'ja'), 'ok');
const cmp = compareLines(song, 'ja');
assert.deepEqual(cmp[0].rows.map((r) => [r.want, r.tr.count, r.fit]), [[6, 8, true], [6, 7, true]]);
assert.deepEqual(cmp[1].rows.map((r) => [r.want, r.tr.count, r.fit]), [[7, 8, true]]);
const lyr = buildLyrics(translatedSong(song, 'ja'), {});
assert.ok(lyr.includes('[Verse]\n消えた街の上\nひとり起きてる'));
assert.equal(lyr.split('Midnight signal 聞こえる？').length - 1, 2, '비운 반복 코러스는 앞 코러스 번안으로 채움');
song.sections[0].text = '불 꺼진 거리 위\n혼자 깨어 있어 난';
assert.equal(translationStatus(song, 'ja'), 'stale', '원문을 고치면 다시 번안');
const en = parseTranslation({ sections: [{ id: 'v1', lines: ['On the darkened street', 'I am wide awake'] }] }, song, 'en');
assert.equal(en.sections.v1[0].kana, '');
assert.equal(en.sections.v1[1].count, 5);
console.log('translate OK');
