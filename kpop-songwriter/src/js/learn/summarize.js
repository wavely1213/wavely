// 쌓인 반응 기록을 Claude가 읽고 취향 프로필 문장으로 정리한다.
import { getSample } from '../ai.js';
import { tasteStats } from './taste.js';

export async function summarizeTaste(taste, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const recent = taste.log.slice(-80).map((e) => ({
    종류: e.kind, 평가: e.rating === 1 ? '좋아요' : e.rating === -1 ? '별로' : '고침', 내용: e.text || undefined, 고치기전: e.before || undefined, 고친후: e.after || undefined, 이유: e.reasons.length ? e.reasons : undefined, 정보: e.context?.bpm ? { bpm: e.context.bpm, 키: e.context.key, 악기: e.context.instruments } : undefined,
  }));
  const prompt = [
    '너는 K-pop 프로듀서의 어시스턴트다. 아래는 작곡가가 AI 결과에 남긴 반응 기록이다.',
    '여기서 작곡가의 취향을 뽑아 앞으로의 AI 요청에 넣을 짧은 지침으로 정리한다. 기록에 근거한 것만, 추측은 빼고.',
    `기존 프로필(유지·보완할 것): ${JSON.stringify(taste.profile)}`,
    `통계: ${JSON.stringify(tasteStats(taste))}`,
    `기록: ${JSON.stringify(recent)}`,
    '출력은 JSON 하나만: {"lyrics":"작사 스타일 2~4문장","sound":"좋아하는 사운드·편곡 1~3문장","avoid":"피할 것 1~3문장","basis":"어떤 기록에서 이렇게 판단했는지 한두 문장"}',
  ].join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  return { lyrics: String(res?.lyrics || ''), sound: String(res?.sound || ''), avoid: String(res?.avoid || ''), basis: String(res?.basis || '') };
}
