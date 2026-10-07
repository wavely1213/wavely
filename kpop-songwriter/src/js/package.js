// 제작 패키지(zip): 가사·스타일 텍스트, MIDI, WAV 데모, 프로젝트 파일, 작업 안내서.
import { buildLyrics, buildStyle } from './suno.js';
import { buildMidi } from './music/midi.js';
import { renderSong } from './music/player.js';
import { encodeWav, zip } from './music/pack.js';
import { keyName } from './music/theory.js';
import { songSeconds } from './music/arrangement.js';

function safeName(title) {
  return (title || 'song').replace(/^예시:\s*/, '').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'song';
}

function guide(song) {
  const sec = Math.round(songSeconds(song));
  return [
    `${song.title}`,
    `${keyName(song.music.root, song.music.mode)} · ${song.music.bpm} BPM · 약 ${Math.floor(sec / 60)}분 ${sec % 60}초`,
    '',
    '[파일]',
    '- lyrics_suno.txt : Suno Custom 모드 Lyrics 칸에 붙여넣기',
    '- style_suno.txt  : Suno Styles 칸 (첫 줄), Exclude styles (둘째 줄)',
    '- demo.wav        : 앱에서 만든 코드·리듬·가이드 멜로디 데모',
    '- song.mid        : 악기별 트랙이 나뉜 MIDI. DAW(FL Studio, Logic, Ableton, GarageBand 등)로 가져가기',
    '- project.json    : 이 앱의 곡 데이터 백업 (앱 왼쪽 "가져오기"로 되살릴 수 있음)',
    '',
    '[Suno로 완성하기]',
    '1. Suno에서 Create → Upload Audio로 demo.wav를 올린다.',
    '2. 올린 오디오에서 Cover(커버)를 고르고, Lyrics에 lyrics_suno.txt, Styles에 style_suno.txt를 넣는다.',
    '   → 데모의 코드 진행·멜로디 흐름을 살린 채 Suno가 보컬과 사운드를 입힌다.',
    '3. 여러 번 생성해 보고 좋은 결과는 앱의 버전 탭에 메모해 둔다.',
    '   (Suno 메뉴 이름과 기능은 바뀔 수 있으니 현재 화면 기준으로 찾으세요.)',
    '',
    '[DAW로 다듬기]',
    '1. song.mid를 DAW로 가져오면 드럼·베이스·코드·멜로디가 트랙별로 들어온다.',
    '2. 원하는 가상 악기로 바꾸고, 가이드 멜로디 트랙을 보고 보컬을 녹음하거나 보컬 신스를 쓴다.',
    '3. Suno 결과물의 스템(보컬 분리 등)을 함께 쓰면 믹싱 자유도가 높아진다.',
    '',
    '[발매 전 확인]',
    '- Suno로 만든 음원의 상업적 이용 조건은 생성 당시 요금제와 Suno 약관을 따른다. 발매 전에 최신 약관을 확인하세요.',
    '- 레퍼런스 곡의 멜로디·가사를 그대로 쓰지 않았는지 확인하세요.',
    '- 유통사(음원 유통 대행)마다 AI 생성 음원 정책이 다르니 미리 확인하세요.',
    '- 완성곡은 앱의 마스터링 탭에서 음량(-14 LUFS 권장)·트루 피크(-1 dBTP)를 맞춰 WAV로 받으세요.',
    '',
    '[사운드 출처 — demo.wav]',
    '- Salamander Grand Piano (Alexander Holm), FluidR3 GM (Frank Wen): CC BY 3.0 — 데모를 그대로 공개할 땐 출처를 적어 주세요.',
    '- smpldsnds drum-machines: 퍼블릭 도메인',
  ].join('\n');
}

// onStep: 진행 상황 문구
export async function buildPackage(song, { includeWav, lyricOpts, onStep }) {
  const files = [];
  const name = safeName(song.title);
  files.push({ name: `${name}/lyrics_suno.txt`, data: buildLyrics(song, lyricOpts) });
  files.push({ name: `${name}/style_suno.txt`, data: `${buildStyle(song.style)}\n${song.style.exclude || ''}\n` });
  onStep('MIDI 만드는 중');
  files.push({ name: `${name}/song.mid`, data: buildMidi(song) });
  if (includeWav) {
    onStep('데모 WAV 녹음 중 (곡 길이에 따라 수십 초)');
    await new Promise((r) => setTimeout(r, 30));
    const buf = await renderSong(song);
    onStep('WAV 저장 중');
    files.push({ name: `${name}/demo.wav`, data: encodeWav(buf) });
  }
  const { versions, ...project } = song;
  files.push({ name: `${name}/project.json`, data: JSON.stringify(project, null, 1) });
  files.push({ name: `${name}/README.txt`, data: guide(song) });
  return { blob: zip(files), filename: `${name}.zip` };
}
