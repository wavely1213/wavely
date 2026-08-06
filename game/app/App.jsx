/* 파장 WAVELENGTH — 앱.

   게임 로직·그리기는 game/src/core 에 있고 웹과 공유한다.
   이 파일이 하는 일은 화면 전환과 계기판 UI 뿐이다.
*/
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, useColorScheme, AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";

import {
  G, S, W, H, host, fmt, clamp, stats, loadout, maxStage, stageName, stageEn,
  WAVES_PER_STAGE, GUARD_CD, storyFor, storyEnd, persist,
  beginRun, armStage, finishStage, finishRun, useBomb, markTip,
} from "../src/core/index";
import { bootCore, flushStorage, applyTheme, setSound } from "./src/host.native";
import { themeFor } from "./src/theme";
import { Snd } from "./src/sound";
import GameField from "./src/GameField";
import ShipPreview from "./src/ShipPreview";
import Hangar from "./src/Hangar";
import { mono, Hazard, Badge, Btn, Stat, KV, Toast } from "./src/ui";

/* 첫 안내 — 문구는 조작이 있는 쪽이 갖는다. 웹은 「Space 또는 우하단 버튼」,
   앱은 버튼밖에 없으니 그렇게 쓴다. 한 번만 뜨는 규칙은 코어(markTip)가 안다. */
const TIPS = {
  combo:  "연속 처치가 점수 배율을 올린다 — 맞으면 0으로",
  bomb:   "우하단 BOMB 버튼 — 화면의 탄을 쓸어낸다",
  supply: "보급품은 탑승자마다 다르다 (격납고에서 확인)",
  guard:  "육각 차폐가 피탄을 막았다 — 6초마다 재충전",
  evade:  "회피 성공 — 내구도 콤보도 잃지 않는다",
};

const AWAKE = "wavelength-play";

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const scheme = useColorScheme() === "light" ? "light" : "dark";
  const c = themeFor(scheme);

  const [booted, setBooted] = useState(false);
  const [screen, setScreen] = useState("title");
  const [toast, setToast] = useState(null);
  const [, bump] = useState(0);                 /* HUD·격납고 숫자 갱신용 */
  const [story, setStory] = useState(null);     /* { lines, then } */
  const [shown, setShown] = useState(0);        /* 스토리 대사가 몇 줄까지 나왔나 */
  const [result, setResult] = useState(null);
  const [box, setBox] = useState({ w: 360, h: 480 });   /* 필드가 실제로 받은 공간 */

  const refresh = useCallback(() => bump(n => n + 1), []);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  /* 코어도 화면 상태를 본다 — useBomb() 이 "지금 전투 중인가"를 여기서 확인한다.
     오버레이가 입력을 막는 것과 불변식은 다른 문제라, 상태 자체를 맞춰 준다. */
  G.screen = screen;
  const toastT = useRef(null);


  const notify = useCallback(msg => {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => { toastT.current = null; setToast(null); }, 1600);
  }, []);

  /* 다른 알림이 떠 있으면 덮어쓰지 말고 뒤로 물러난다
     — 보급품 안내가 아이템 토스트에 즉시 지워지던 문제와 같은 이유 */
  const tip = useCallback(id => {
    if (!TIPS[id] || !markTip(id)) return;
    const showing = toastT.current !== null;
    setTimeout(() => notify(TIPS[id]), showing ? 1500 : 0);
  }, [notify]);

  /* 전투 중에만 화면을 깨워 둔다 — 사격이 자동이라 손을 떼는 구간이 있다.
     타이틀·격납고에서까지 붙잡고 있으면 배터리만 먹는다. */
  useEffect(() => {
    if (screen !== "play") return;
    activateKeepAwakeAsync(AWAKE).catch(() => {});
    return () => { deactivateKeepAwake(AWAKE).catch(() => {}); };
  }, [screen]);

  /* ── 부팅 ── */
  useEffect(() => {
    let alive = true;
    bootCore({
      scheme, notify, tip,
      hudChanged: refresh,
      runEnded: () => endRun(),
      stageCleared: () => nextStage(),
    }).then(() => {
      if (!alive) return;
      setBooted(true);
      /* 소리는 첫 WAV 를 굽는 데 잠깐 걸린다. 출격 버튼에서 하면 그 순간 화면이 끊기므로
         타이틀이 뜨자마자 뒤에서 미리 굽는다. */
      Snd.init();
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (booted) { applyTheme(scheme); refresh(); } }, [scheme, booted, refresh]);

  /* 앱이 내려가면 오디오 플레이어를 놓아 준다 */
  useEffect(() => () => Snd.release(), []);

  /* 앱이 뒤로 가면 멈추고 저장을 밀어 넣는다 */
  useEffect(() => {
    const sub = AppState.addEventListener("change", st => {
      if (st !== "active") {
        if (screenRef.current === "play") setScreen("pause");
        flushStorage();
      }
    });
    return () => sub.remove();
  }, []);

  /* 대사를 한 줄씩 세운다 — 한꺼번에 뿌리면 읽기 전에 지나간다.
     웹과 같은 간격(520ms, 동작 줄이기면 60ms)이고, 줄마다 음이 반 음씩 올라간다. */
  useEffect(() => {
    if (screen !== "story" || !story) return;
    if (shown >= story.lines.length) return;
    const t = setTimeout(() => {
      Snd.blip(420 + shown * 60, .05, "triangle", .02);
      setShown(n => n + 1);
    }, shown === 0 ? 0 : (host.reduced ? 60 : 520));
    return () => clearTimeout(t);
  }, [screen, story, shown]);

  /* ── 흐름 ── */
  const goPlay = () => {
    armStage();
    setScreen("play");
    if (G.player.bomb > 0) setTimeout(() => { if (screenRef.current === "play") tip("bomb"); }, 2500);
  };

  const enterStage = stage => {
    const lines = storyFor(stage);
    /* 처음 보는 구역에서만 대사를 세운다 — 재도전 흐름을 끊지 않기 위해 */
    if (lines && !S.seenStory.includes(stage)) {
      setShown(0);
      setStory({ stage, lines, then: () => { S.seenStory.push(stage); persist(); setStory(null); goPlay(); } });
      setScreen("story");
    } else goPlay();
  };

  const startRun = stage => { Snd.init(); beginRun(stage); enterStage(stage); };

  const nextStage = () => {
    const { bonus, ending } = finishStage();
    notify("구역 정리 보너스 +" + bonus);
    const end = ending ? storyEnd() : null;
    if (end) {
      setShown(0);
      setStory({ stage: G.stage - 1, lines: end, then: () => { setStory(null); enterStage(G.stage); } });
      setScreen("story");
    } else enterStage(G.stage);
  };

  const endRun = () => {
    const r = finishRun();
    if (!r) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    /* 700ms — 마지막 폭발을 보여 주고 결과로 넘어간다 (웹과 같은 간격) */
    setTimeout(() => { setResult({ ...r, score: G.score, coins: G.coins, kills: G.kills, combo: G.maxCombo, stage: G.stage }); setScreen("result"); }, 700);
  };

  if (!booted) {
    return <View style={{ flex: 1, backgroundColor: c.ground }}><StatusBar style={scheme === "light" ? "dark" : "light"} /></View>;
  }

  const lo = loadout();
  const running = screen === "play";
  /* 저장이 손상돼 있으면 돌파하지 않은 구역을 가리킬 수 있다 — 웹 타이틀과 같은 보정 */
  G.pickStage = clamp(G.pickStage, 1, maxStage());
  /* 필드 크기는 계산하지 않고 **재서** 쓴다. 머리말·안전영역·하단 UI 높이를 빼는 식으로
     잡으면 기기마다 어긋난다(태블릿에서 하단이 눌렸다). 남은 공간을 그대로 받는다. */
  const fieldH = Math.max(200, box.h);
  const fieldW = Math.min(box.w, fieldH * (W / H));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />

      {/* 머리말 — 위험 표지 띠와 소리 토글 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: c.fg, fontSize: 16, fontWeight: "700", letterSpacing: 2 }}>파장</Text>
        <Text style={[mono, { color: c.dim, fontSize: 10 }]}>WAVELENGTH</Text>
        <Hazard c={c} />
        <Pressable onPress={() => { setSound(!Snd.on); refresh(); }}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={[mono, { color: Snd.on ? c.fg : c.dim, fontSize: 10 }]}>소리 {Snd.on ? "ON" : "OFF"}</Text>
        </Pressable>
      </View>

      {screen === "hangar" ? (
        <Hangar c={c} notify={notify} refresh={refresh} onClose={() => { Snd.ui(); setScreen("title"); }} />
      ) : screen === "story" && story ? (
        <View style={{ flex: 1, padding: 18 }}>
          <Text style={[mono, { color: c.dim, fontSize: 11 }]}>
            STAGE {story.stage} · {stageName(story.stage)} · {stageEn(story.stage)}
          </Text>
          <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
            {story.lines.slice(0, shown).map(([who, say], i) => (
              <View key={i}>
                {who !== null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <Badge c={c}>{who === "관제" ? "OPS" : lo.pilot.desig}</Badge>
                    <Text style={[mono, { color: c.dim, fontSize: 10 }]}>{who}</Text>
                  </View>
                )}
                <Text style={{
                  color: who === null ? c.dim : c.fg, fontSize: 15, lineHeight: 24,
                  fontStyle: who === null ? "italic" : "normal",
                }}>{say}</Text>
              </View>
            ))}
          </View>
          {/* 출력이 남아 있으면 먼저 마치고, 다 나온 뒤에 눌러야 진입한다 (웹과 같은 규칙) */}
          <Btn c={c} primary onPress={() => {
            Snd.ui();
            if (shown < story.lines.length) { setShown(story.lines.length); return; }
            story.then();
          }}>{shown < story.lines.length ? "건너뛰기" : "출격"}</Btn>
        </View>
      ) : screen === "result" && result ? (
        <View style={{ flex: 1, padding: 18 }}>
          <Text style={[mono, { color: c.dim, fontSize: 11 }]}>기체 상실 · 회수 보고</Text>
          <Text style={{ color: c.fg, fontSize: 19, fontWeight: "700", marginTop: 6 }}>
            STAGE {result.stage} · {stageName(result.stage)} 에서 신호 소실
          </Text>
          <Text style={{ color: c.dim, fontSize: 12, marginTop: 4 }}>
            {lo.pilot.desig} 「{lo.pilot.call}」 · {lo.frame.desig} {lo.frame.nm}
          </Text>
          {result.record && (
            <Text style={[mono, { color: c.signalT, fontSize: 12, marginTop: 12 }]}>최고 기록 경신</Text>
          )}
          <View style={{ flexDirection: "row", marginTop: 26 }}>
            <Stat c={c} k="점수" v={fmt(result.score)} />
            <Stat c={c} k="회수" v={"+" + fmt(result.coins)} tone={c.mossT} />
          </View>
          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <Stat c={c} k="처치" v={fmt(result.kills)} />
            <Stat c={c} k="최대 콤보" v={"×" + result.combo} />
          </View>
          <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 20 }]}>
            BEST {result.prevBest ? fmt(result.prevBest) : "—"}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={{ gap: 10 }}>
            <Btn c={c} primary onPress={() => { Snd.ui(); setResult(null); startRun(clamp(G.pickStage, 1, maxStage())); }}>재출격</Btn>
            <Btn c={c} onPress={() => { Snd.ui(); setResult(null); setScreen("title"); }}>격납고로</Btn>
          </View>
        </View>
      ) : (
        <>
          {screen === "title" ? (
            /* 타이틀에서는 필드 대신 기체를 세워 둔다 — 장착한 도장·궤적이 그대로 보인다 */
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              onLayout={e => { const { width: w, height: h } = e.nativeEvent.layout; setBox(b => (b.w === w && b.h === h ? b : { w, h })); }}>
              <Text style={{ color: c.dim, fontSize: 13, lineHeight: 22, paddingHorizontal: 28, textAlign: "center", marginBottom: 8 }}>
                기계화 3세기. 대역을 따라 내려온 군체가 도시를 덮었다.{"\n"}
                기체를 입고 대역을 거슬러 올라가, 그들을 움직이는 송신을 끊어라.
              </Text>
              <ShipPreview size={Math.min(220, fieldH - 120)} active revision={S.frame + S.skin + S.trail} />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center" }}
              onLayout={e => { const { width: w, height: h } = e.nativeEvent.layout; setBox(b => (b.w === w && b.h === h ? b : { w, h })); }}>
              <GameField width={fieldW} height={fieldH} running={running} ground={c.field} />
            </View>
          )}

          {screen === "title" && (
            <View style={{ padding: 18, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable onPress={() => { G.pickStage = Math.max(1, G.pickStage - 1); refresh(); }}
                  disabled={G.pickStage <= 1} hitSlop={12}>
                  <Text style={{ color: G.pickStage <= 1 ? c.line : c.fg, fontSize: 20 }}>◀</Text>
                </Pressable>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: c.fg, fontSize: 18, fontWeight: "700" }}>{stageName(G.pickStage)}</Text>
                  <Text style={[mono, { color: c.dim, fontSize: 10, marginTop: 2 }]}>
                    STAGE {G.pickStage} · {stageEn(G.pickStage)}
                  </Text>
                </View>
                <Pressable onPress={() => { G.pickStage = Math.min(maxStage(), G.pickStage + 1); refresh(); }}
                  disabled={G.pickStage >= maxStage()} hitSlop={12}>
                  <Text style={{ color: G.pickStage >= maxStage() ? c.line : c.fg, fontSize: 20 }}>▶</Text>
                </Pressable>
              </View>

              <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 4 }]}>
                {lo.pilot.desig} 「{lo.pilot.call}」 · {lo.frame.desig} {lo.frame.nm} · 코어 {fmt(S.coins)}
              </Text>

              <Btn c={c} primary onPress={() => { Snd.init(); Snd.ui(); startRun(G.pickStage); }}>출격</Btn>
              <Btn c={c} onPress={() => { Snd.ui(); setScreen("hangar"); }}>격납고</Btn>
            </View>
          )}

          {(screen === "play" || screen === "pause") && (
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[mono, { color: c.dim, fontSize: 10 }]}>
                    STAGE {G.stage} · {G.phase === "boss" ? "코어전" : "WAVE " + Math.min(G.wave + 1, WAVES_PER_STAGE)}
                  </Text>
                  <Text style={[mono, { color: c.fg, fontSize: 22, fontWeight: "700" }]}>{fmt(G.score)}</Text>
                  <Text style={{ color: c.signal, fontSize: 13, marginTop: 2 }}>
                    {"♥".repeat(Math.max(0, G.player?.hp ?? 0))}
                    <Text style={{ color: c.line }}>{"♥".repeat(Math.max(0, (G.player?.maxHp ?? 0) - (G.player?.hp ?? 0)))}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={[mono, { color: c.dim, fontSize: 10 }]}>CORE</Text>
                  <Text style={[mono, { color: c.mossT, fontSize: 18, fontWeight: "700" }]}>{fmt(G.coins)}</Text>
                  <Pressable onPress={() => { Snd.ui(); setScreen(screen === "play" ? "pause" : "play"); }}
                    style={{ borderWidth: 1, borderColor: c.line, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={[mono, { color: c.fg, fontSize: 12 }]}>{screen === "play" ? "II" : "▶"}</Text>
                  </Pressable>
                </View>
              </View>

              {screen === "play" ? (
                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[mono, { color: c.dim, fontSize: 10 }]}>
                      {G.combo >= 4 ? `콤보 ×${(1 + Math.floor(G.combo / 4) * .5).toFixed(1)}` : " "}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { if (G.player?.bomb > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); useBomb(); refresh(); } }}
                    disabled={!(G.player?.bomb > 0)}
                    style={({ pressed }) => ({
                      width: 74, height: 74, borderRadius: 37, borderWidth: 1,
                      borderColor: G.player?.bomb > 0 ? c.moss : c.line,
                      alignItems: "center", justifyContent: "center",
                      opacity: G.player?.bomb > 0 ? (pressed ? .7 : 1) : .35,
                    })}>
                    <Text style={[mono, { color: c.mossT, fontSize: 11 }]}>BOMB</Text>
                    <Text style={[mono, { color: c.mossT, fontSize: 15, fontWeight: "700" }]}>{G.player?.bomb ?? 0}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <KV c={c} k="구역" v={`STAGE ${G.stage} · ${stageName(G.stage)}`} />
                  <KV c={c} k="점수" v={`${fmt(G.score)}  (처치 ${fmt(G.kills)} · 최대 콤보 ${G.maxCombo})`} />
                  <KV c={c} k="편성" v={`${lo.pilot.desig} 「${lo.pilot.call}」 · ${lo.frame.desig} ${lo.frame.nm}`} />
                  <KV c={c} k="상태" v={
                    `내구 ${G.player?.hp}/${G.player?.maxHp} · 폭탄 ${G.player?.bomb}` +
                    (stats().guard ? ` · 차폐 ${G.player?.guard >= GUARD_CD ? "준비" : "충전중"}` : "")
                  } />
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <Btn c={c} primary style={{ flex: 1 }} onPress={() => { Snd.ui(); setScreen("play"); }}>계속</Btn>
                    <Btn c={c} style={{ flex: 1 }} onPress={() => { Snd.ui(); endRun(); }}>출격 중단</Btn>
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}

      <Toast c={c} msg={toast} />
    </SafeAreaView>
  );
}
