// 웹사이트에서만: "앱으로 설치" (홈 화면·바탕화면에 아이콘, 오프라인으로 열림).
// 크롬·엣지·안드로이드는 브라우저가 주는 설치 창을, 아이폰·아이패드(사파리)는 "공유 → 홈 화면에 추가" 안내를 보여 준다.
import { h, toast } from '../dom.js';
import { refresh } from '../state.js';

const ui = { prompt: null, installed: false };

const standalone = () => {
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return false; }
};
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 띠 대신 목록의 버튼으로
    ui.prompt = e;
    refresh();
  });
  window.addEventListener('appinstalled', () => { ui.installed = true; ui.prompt = null; refresh(); });
}

async function install() {
  const p = ui.prompt;
  if (!p) return;
  ui.prompt = null; // 설치 창은 한 번만 띄울 수 있다
  try {
    await p.prompt();
    const choice = await p.userChoice;
    if (choice?.outcome === 'accepted') { ui.installed = true; toast('설치했어요. 홈 화면·바탕화면의 아이콘으로 열 수 있어요'); }
  } catch { /* 창이 안 뜸 */ }
  refresh();
}

export function installSection() {
  if (ui.installed || standalone()) return null;
  if (ui.prompt) {
    return [
      h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '앱으로 쓰기')),
      h('button', { type: 'button', class: 'btn small', id: 'install-app', onclick: install }, '앱으로 설치'),
      h('p', { class: 'muted small' }, '홈 화면·바탕화면에 아이콘이 생기고 인터넷 없이도 열려요. 작업은 이 브라우저에 그대로 있어요.'),
    ];
  }
  if (isIos()) {
    return [
      h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '앱으로 쓰기')),
      h('p', { class: 'muted small', id: 'install-ios' }, '사파리 아래쪽 공유 버튼(□↑) → "홈 화면에 추가"를 누르면 앱처럼 열려요.'),
    ];
  }
  return null;
}
