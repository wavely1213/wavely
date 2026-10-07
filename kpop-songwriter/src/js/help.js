// 초보자용 용어 도움말: 라벨 옆 "?"를 누르면 짧은 설명이 펼쳐진다 (<details>라 키보드로도 열림).
import { h } from './dom.js';

export const TERMS = {
  bpm: ['빠르기 (BPM)', '1분에 박자가 몇 번인지. 숫자가 클수록 빨라요. 발라드 70~90, 팝 100~120, 댄스 120~130.'],
  key: ['키', '노래의 기준음. 장조는 밝고, 단조는 어둡게 들려요. 부르기 편한 높이가 될 때까지 바꿔 보세요.'],
  chords: ['코드 진행', '마디마다 깔리는 화음 순서. 같은 진행이 반복되며 곡의 분위기를 만들어요. 모르면 "느낌" 목록에서 고르면 돼요.'],
  seventh: ['7th (세련되게)', '화음에 음 하나를 더 얹어 R&B·시티팝처럼 부드럽고 세련된 느낌을 줘요.'],
  energy: ['에너지', '그 부분의 꽉 찬 정도. 벌스는 낮게, 코러스는 높게 두면 터지는 느낌이 나요.'],
  bars: ['마디', '박자 4개가 한 마디예요. 보통 벌스 8마디, 코러스 8마디, 프리코러스 4마디.'],
  range: ['음역', '그 가수가 편하게 낼 수 있는 가장 낮은 음~높은 음. 멜로디가 음역 밖이면 부르기 힘들어요.'],
  lufs: ['LUFS (음량)', '사람 귀에 들리는 평균 음량. 스트리밍은 -14 LUFS 기준으로 맞춰 틀어서, 그보다 크게 만들면 오히려 줄여서 재생돼요.'],
  dbtp: ['트루 피크 (dBTP)', '소리의 가장 높은 순간. 0에 가까우면 MP3로 바뀔 때 찢어질 수 있어 -1 dBTP 아래로 맞춰요.'],
  limiter: ['리미터', '너무 큰 순간만 눌러서 피크를 넘지 않게 하는 장치. 많이 누르면 소리가 답답해져요.'],
  isrc: ['ISRC', '곡마다 붙는 국제 표준 번호(12자리). 보통 유통사가 발급해 줘요. 정산·차트에 쓰여요.'],
  upc: ['UPC', '앨범(상품)에 붙는 바코드 번호(12~13자리). 보통 유통사가 발급해 줘요.'],
  cline: ['© 표기', '작품(가사·멜로디)의 저작권자. 예: "2026 물결뮤직".'],
  pline: ['℗ 표기', '녹음된 음원의 제작자(권리자). 직접 만들었다면 본인 이름이나 레이블명.'],
};

export function help(key) {
  const t = TERMS[key];
  if (!t) return null;
  // 열릴 때 화면 오른쪽 밖으로 나가면 왼쪽으로 당긴다
  const keepOnScreen = (e) => {
    const el = e.currentTarget;
    const pop = el.querySelector('p');
    if (!el.open || !pop) return;
    pop.style.left = '0px';
    const over = pop.getBoundingClientRect().right - (document.documentElement.clientWidth - 12);
    if (over > 0) pop.style.left = `${-over}px`;
  };
  return h('details', { class: 'help', ontoggle: keepOnScreen },
    h('summary', { 'aria-label': `${t[0]} 설명` }, '?'),
    h('p', null, h('strong', null, t[0]), ' — ', t[1]));
}
