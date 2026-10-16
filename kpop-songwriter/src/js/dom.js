// 공통 DOM 도우미: 요소 생성, 토스트, 복사.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  children.flat(Infinity).forEach((c) => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : String(c));
  });
  return el;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

// 클릭 핸들러 안에서 호출. 실패하면 대상 텍스트를 선택해 둔다.
export async function copyText(text, selectEl) {
  try {
    await navigator.clipboard.writeText(text);
    toast('복사했어요');
  } catch {
    if (selectEl && selectEl.select) {
      selectEl.focus();
      selectEl.select();
      toast('복사가 막혀 있어요. 선택된 텍스트를 Ctrl/⌘+C로 복사하세요');
    } else {
      toast('복사하지 못했어요');
    }
  }
}

export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function formatTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 칸을 벗어날 때(change) 화면을 다시 그리면, 그 순간 클릭한 다음 칸이 갈아 끼워져 포커스를 잃는다.
// 포커스 이동이 끝난 뒤에 다시 그리도록 미룬다.
export function afterBlur(fn) {
  return () => setTimeout(fn, 0);
}
