// 리메이크·번안 트랙의 발매 전 점검 항목 (album/model.js releaseChecklist가 트랙마다 부른다). 결정: D-026.
// 관문은 '꼭 고칠 것'으로 띄우기만 하고 패키지 받기는 막지 않는다 (기존 점검표와 같은 방식, 소유자 확인 필요).
// 근거: docs/research/cover-remake-2026-10-12.md 3.2 ⑥ 점검표 표
import { names } from '../album/splits.js';
import { REMAKE_KINDS, CONSENTS, CONSENT_STATUS, RESEND_DAYS, remakeOf, pendingConsents } from './model.js';

const squash = (t) => String(t || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const has = (list, name) => names(list).some((x) => squash(x) === squash(name));

function daysSince(iso, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t - d) / 86400000);
}

// 반환: [{ level, text, go }] — text 앞에 트랙 이름은 부르는 쪽이 붙인다
export function remakeIssues(song, track, album, { songs = [], today = new Date() } = {}) {
  const r = remakeOf(song, songs);
  if (!r) return [];
  const out = [];
  const add = (level, text, go) => out.push({ level, text, go });
  const here = { song: song.instOf && songs.some((x) => x.id === song.instOf) ? song.instOf : song.id, tab: 'concept' }; // 권리 기록을 고칠 곡
  const o = r.original;
  const kind = REMAKE_KINDS[r.kind].name;

  const blank = [['원곡 제목', o.title], ['원곡 아티스트', o.artist], ['원 작사', song.instOf ? 'x' : o.lyricists], ['원 작곡', o.composers]].filter(([, v]) => !String(v || '').trim()).map(([k]) => k);
  if (blank.length) add('error', `${kind} 곡인데 ${blank.join('·')}이 비어 있어요. 크레딧과 이용 허락의 기준이에요.`, here);

  const wait = pendingConsents(song, r);
  const denied = wait.filter((c) => c.status === 'denied');
  if (denied.length) add('error', `${denied.map((c) => c.name).join('·')} 동의가 거절됐어요. 이대로는 발매할 수 없어요.`, here);
  const notYet = wait.filter((c) => c.status !== 'denied');
  if (notYet.length) add('error', `이용 허락 전이에요: ${notYet.map((c) => `${c.name}(${CONSENT_STATUS[c.status]})`).join('·')}. 서면 허락을 받기 전에는 본 녹음·발매일 확정·유통 제출·유튜브 공개를 멈추세요.`, here);
  if (!r.proofFile.trim()) add('error', '서면 동의서(증빙) 파일 이름을 적어 주세요. 국내 음원 사이트는 원곡자의 서면 동의서가 없으면 커버·번안곡을 받지 않아요.', here);

  if (o.composers.trim() && !names(o.composers).every((n) => has(track.composers, n))) add('error', `작곡 크레딧에 원곡 작곡가(${o.composers})가 빠졌어요.`, { tab: 'meta' });
  if (!song.instOf && o.lyricists.trim() && !names(o.lyricists).every((n) => has(track.lyricists, n))) add('warn', `작사 크레딧에 원 작사가(${o.lyricists})가 빠졌어요. 표기는 허락서에 적힌 대로 따라요.`, { tab: 'meta' });
  if (r.kind === 'adapt' && !song.instOf && !String(track.koreanLyricists || '').trim()) add('warn', '한국어 가사(번안) 작사가를 적어 주세요.', { tab: 'meta' });

  const japanese = o.language === 'ja' || ['JASRAC', 'NexTone'].includes(r.publisher.society);
  if (japanese && !r.publisher.original.trim() && !r.publisher.subPublisherKR.trim()) add('warn', '일본곡인데 원출판사(OP)·국내 서브퍼블리셔(SE)가 비어 있어요. 개사·편곡 허락은 보통 출판사에 받아요 (KOMCA 검색의 E·SE 칸).', here);

  const ai = r.aiUsed || album.ai.lyrics || album.ai.composition || album.ai.vocals;
  if (ai && r.consents.ai.status !== 'approved') add('warn', 'AI를 썼는데(앨범 AI 표기·AI 번안 초안) 허락서에 AI 사용이 승인으로 기록되지 않았어요. 요청서에 AI 사용을 밝히지 않으면 나중에 허락이 취소될 수 있어요.', here);
  if (album.ai.vocals || album.ai.composition) add('warn', 'Suno 약관은 남의 곡(커버·번안)으로 만든 결과의 수익화를 막아요. 허락받은 곡이어도 Suno 음원으로 상업 발매하기 어려워요 — 발매 전에 약관을 확인하고, 사람 녹음·편곡을 권해요.', { song: song.id, tab: 'export' });

  if (o.artist.trim() && squash(album.artist).includes(squash(o.artist))) add('warn', `아티스트 칸에 원곡 아티스트(${o.artist})가 들어 있어요. 원곡 아티스트는 아티스트 칸에 넣지 않아요 (유통사 규칙).`, { tab: 'meta' });
  if (/\(\s*cover\s*\)|\bcover\s*ver/i.test(song.title)) add('warn', '제목에 "(cover)"를 붙이지 않아요 (유통사 규칙).', { song: song.id, tab: 'concept' });

  CONSENTS.forEach((c) => {
    const x = r.consents[c.id];
    const n = x.status === 'requested' ? daysSince(x.requestedAt, today) : null;
    if (n != null && n > RESEND_DAYS) add('warn', `${c.name} 허락을 요청한 지 ${n}일이 지났어요. 답이 없으면 다시 보내 보세요 (2주가 기준).`, here);
  });

  add('info', '커버·번안곡은 보통 유튜브 Content ID에 등록할 수 없어요. 유통사 옵션에서 끄고, 유튜브 공개도 허락 범위 안인지 확인하세요.', null);
  if (r.kind === 'adapt' && !song.instOf) add('info', '번안 작사가가 KOMCA·KOSCAP 회원이면 공표 후 15일 안에 개작동의서(저작물등록용)와 함께 작품을 등록해요.', null);
  return out;
}
