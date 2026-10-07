// 머리말의 되돌리기·다시 하기 버튼 (곡·앨범 공통). id: 곡 또는 앨범 id
import { h } from '../dom.js';
import { undo, redo, canUndo, canRedo } from '../state.js';

export function undoButtons(id) {
  return [
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': '되돌리기 (Ctrl+Z)', title: '되돌리기 (Ctrl+Z)', disabled: !canUndo(id), onclick: () => undo(id) }, '↶'),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': '다시 하기 (Ctrl+Shift+Z)', title: '다시 하기 (Ctrl+Shift+Z)', disabled: !canRedo(id), onclick: () => redo(id) }, '↷'),
  ];
}
