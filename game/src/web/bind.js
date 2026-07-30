/* ═══════════════════════════════════════════════
   14. 바인딩
   ═══════════════════════════════════════════════ */
$("stage-prev").addEventListener("click", () => { G.pickStage--; Snd.ui(); paintTitle(); });
$("stage-next").addEventListener("click", () => { G.pickStage++; Snd.ui(); paintTitle(); });
$("btn-start").addEventListener("click", () => { Snd.init(); Snd.ui(); beginRun(G.pickStage); });
$("btn-hangar").addEventListener("click", () => { Snd.ui(); openHangar(); });
$("btn-hangar-back").addEventListener("click", () => {
  Snd.ui();
  /* 결과 화면에서 들어왔으면 결과로 돌아간다.
     이전에는 `!G.player.dead` 조건이 붙어 있어, 정작 대부분의 경로인 '사망 → 격납고'에서
     플래그가 무력화되고 타이틀로 튀었다. */
  if (G._fromResult) { G._fromResult = false; setScreen("result"); }
  else { paintTitle(); setScreen("title"); }
});

/* 출력이 남아 있으면 먼저 마치고, 다 나온 뒤에 눌러야 진입한다 */
$("btn-story-go").addEventListener("click", () => {
  Snd.ui();
  if (storyPending()) { finishStory($("story-lines")); return; }
  const f = storyThen; storyThen = null; f && f();
});
$("btn-story-skip").addEventListener("click", () => {
  Snd.ui();
  finishStory($("story-lines"));
  const f = storyThen; storyThen = null; f && f();
});

$("btn-pause").addEventListener("click", pause);
$("btn-resume").addEventListener("click", resume);
$("btn-abort").addEventListener("click", () => { Snd.ui(); endRun(); });
$("btn-bomb").addEventListener("click", useBomb);

$("btn-again").addEventListener("click", () => { Snd.ui(); beginRun(clamp(G.pickStage, 1, maxStage())); });
$("btn-to-hangar").addEventListener("click", () => { Snd.ui(); G._fromResult = true; openHangar(); });
$("btn-to-title").addEventListener("click", () => { Snd.ui(); paintTitle(); setScreen("title"); });

const TABS = ["pilot", "frame", "eq", "cos", "log"];
function selectTab(name) {
  for (const t of TABS) {
    $("tab-" + t).setAttribute("aria-selected", String(t === name));
    $("pn-" + t).hidden = (t !== name);
  }
}
for (const t of TABS) $("tab-" + t).addEventListener("click", () => { selectTab(t); Snd.ui(); });

function paintSound() { $("btn-sound").textContent = "소리 " + (Snd.on ? "ON" : "OFF"); }
$("btn-sound").addEventListener("click", () => {
  Snd.on = !Snd.on;
  S.sound = Snd.on; persist();
  paintSound();
  if (Snd.on) { Snd.init(); Snd.ui(); }
});

document.addEventListener("visibilitychange", () => { if (document.hidden && G.screen === "play") pause(); });

/* 시작 */
Snd.on = S.sound !== false;
paintSound();
G.pickStage = maxStage();
G.player = newPlayer();
paintTitle();
setScreen("title");
