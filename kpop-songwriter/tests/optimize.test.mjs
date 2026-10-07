// 가사 채점 점검: 좋은 코러스 > 나쁜 코러스, 고칠 점 문구, 반복 섹션 제외, 곡 단위 점검. 실행: npm run test:optimize
import assert from 'node:assert/strict';
import { scoreSection, scoreSong } from '../src/js/optimize/lyricscore.js';
import { exampleSong } from '../src/js/example.js';

const good = scoreSection({ type: 'Chorus', text: 'Midnight signal 너를 불러\n새벽 세 시 너를 불러\nMidnight signal 들리니 너\n꺼지지 않아 이 불빛 너' });
const bad = scoreSection({ type: 'Chorus', text: '안녕하세요 반갑습니다 오늘 날씨가 정말 좋네요 그렇죠\n음' });
assert.ok(good.score >= 85, `좋은 코러스 ${good.score}`);
assert.ok(bad.score <= 40, `나쁜 코러스 ${bad.score}`);
assert.ok(bad.tips.some((t) => t.includes('훅')));
assert.ok(bad.tips.some((t) => t.includes('음절')));
assert.equal(scoreSection({ type: 'Intro', text: '(oh)' }), null, '인트로는 채점하지 않음');
assert.equal(scoreSection({ type: 'Verse', text: '' }).score, 0);

const rapWeak = scoreSection({ type: 'Rap', text: '하나 둘 셋 넷 다섯 여섯 일곱 여덟\n바다 위로 날아가는 새를 봤어\n오늘은 기분이 좋은 날이야 진짜\n내일도 그럴 거라고 믿고 싶다' });
const rapStrong = scoreSection({ type: 'Rap', text: '삐삐 소리처럼 짧게 또 길게 비밀\n모스 부호로 적은 내 마음 속 비밀\n답이 없어도 난 안 멈춰 이제 비밀\nSignal on 내 방은 너의 위성 비밀' });
assert.ok(rapStrong.score > rapWeak.score, '라임 촘촘한 랩이 더 높다');

const song = exampleSong();
const r = scoreSong(song);
assert.ok(r.score > 60 && r.score <= 100);
assert.equal(r.sections.find((s) => s.label === 'Chorus 2').result, null, '비워 둔 반복 코러스는 채점 안 함');
song.concept.koRatio = 30;
assert.ok(scoreSong(song).tips.some((t) => t.includes('한국어 비율')));
console.log('optimize OK');
