/* 격납고 — 탑승자 · 기체 · 장비 · 치장 · 기록.
   해금·가격·장착 판정은 전부 코어(core/shop.js)가 한다. 여기는 그 결과만 그린다. */
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import {
  S, PILOTS, FRAMES, SKINS, TRAILS, fmt, stageName,
  statusOf, acquire, upgrade, equipRows, storyFor, STORY_REVERB,
  CODEX, resetSave, G,
} from "../../src/core/index";
import { mono, Badge, Btn, Row } from "./ui";
import Plate from "./Plate";

const TABS = [
  ["pilot", "탑승자"], ["frame", "기체"], ["eq", "장비"], ["cos", "치장"], ["log", "기록"],
];

const LABEL = { equipped: "장착중", owned: "장착", locked: "잠김", buyable: null, poor: null };

function PriceBtn({ c, item, slot, equippedId, onDone }) {
  const st = statusOf(item, equippedId);
  const text = LABEL[st] ?? fmt(item.cost);
  const dim = st === "locked" || st === "poor";
  return (
    <Pressable
      onPress={() => { const r = acquire(item, slot); onDone(r, item); }}
      disabled={dim || st === "equipped"}
      style={({ pressed }) => ({
        minWidth: 66, alignItems: "center", paddingVertical: 8, paddingHorizontal: 10,
        borderRadius: 8, borderWidth: 1,
        borderColor: st === "equipped" ? c.moss : c.line,
        backgroundColor: st === "equipped" ? c.moss + "22" : "transparent",
        opacity: dim ? .4 : pressed ? .7 : 1,
      })}
    >
      <Text style={[mono, { color: st === "equipped" ? c.mossT : c.fg, fontSize: 12 }]}>{text}</Text>
    </Pressable>
  );
}

/* 기록 한 줄 — 아직 못 본 것은 흐리게, 그래도 어느 구역인지는 읽히게 */
function LogRow({ c, title, body, seen }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Text style={[mono, { color: seen ? c.dim : c.line, fontSize: 10 }]}>{title}</Text>
      <Text style={{ color: c.dim, fontSize: 13, marginTop: 6, lineHeight: 20 }}>{body}</Text>
    </View>
  );
}

export default function Hangar({ c, onClose, notify, refresh }) {
  const [tab, setTab] = useState("pilot");
  const [armed, setArmed] = useState(false);   /* 기록 초기화 2단계 */
  /* 다시 그려야 할 이유 — 도장을 바꾸면 도면 색이, 기체를 바꾸면 스와치 실루엣이 따라간다 */
  const dep = S.skin + "/" + S.frame + "/" + c.field;
  const done = (r, item) => {
    if (r === "poor") notify("코어가 모자란다");
    else if (r === "locked") notify("아직 기밀이다");
    else notify(item.nm + (r === "bought" ? " 인수 · 장착" : " 장착"));
    refresh();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
        <Text style={[mono, { color: c.dim, fontSize: 11 }]}>격납고</Text>
        <Text style={[mono, { color: c.mossT, fontSize: 26, fontWeight: "700" }]}>
          {fmt(S.coins)} <Text style={{ fontSize: 11, color: c.dim }}>코어</Text>
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginTop: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
        {TABS.map(([id, nm]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={{ flex: 1, alignItems: "center", paddingVertical: 11 }}>
            <Text style={{ color: tab === id ? c.fg : c.dim, fontSize: 13, fontWeight: tab === id ? "700" : "400" }}>{nm}</Text>
            {tab === id && <View style={{ height: 2, backgroundColor: c.signal, width: 34, marginTop: 8 }} />}
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {tab === "pilot" && PILOTS.map(p => (
          <Row key={p.id} c={c} art={<Plate kind="pilot" item={p} dep={dep} />}
            title={`${p.call} · ${p.nm}`}
            sub={`회피 ${Math.round(p.evade * 100)}% · 연사 ${Math.round(100 / p.rate)}% · ${p.dropNm} — ${p.dropTx}`}
            right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Badge c={c}>{p.desig}</Badge>
              <PriceBtn c={c} item={p} slot="pilot" equippedId={S.pilot} onDone={done} />
            </View>} />
        ))}

        {tab === "frame" && FRAMES.map(f => (
          <Row key={f.id} c={c} art={<Plate kind="frame" item={f} dep={dep} />}
            title={f.nm}
            sub={`공격 ${Math.round(f.atk * 100)}% · 기동 ${Math.round(f.spd * 100)}% · ${f.perkNm} — ${f.perkTx}`}
            right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Badge c={c}>{f.desig}</Badge>
              <PriceBtn c={c} item={f} slot="frame" equippedId={S.frame} onDone={done} />
            </View>} />
        ))}

        {tab === "eq" && equipRows().map(it => (
          <Row key={it.id} c={c}
            title={`${it.nm}  LV ${it.lv}${it.max ? " · MAX" : ""}`}
            sub={it.line(it.lv)}
            right={
              <Pressable
                onPress={() => {
                  const r = upgrade(it.id);
                  if (r === "poor") notify("코어가 모자란다");
                  else if (r === "ok") notify(`${it.nm} LV ${S.eq[it.id]}`);
                  refresh();
                }}
                disabled={it.max || S.coins < it.cost}
                style={({ pressed }) => ({
                  minWidth: 66, alignItems: "center", paddingVertical: 8,
                  borderRadius: 8, borderWidth: 1, borderColor: c.line,
                  opacity: it.max || S.coins < it.cost ? .4 : pressed ? .7 : 1,
                })}>
                <Text style={[mono, { color: c.fg, fontSize: 12 }]}>{it.max ? "MAX" : fmt(it.cost)}</Text>
              </Pressable>
            } />
        ))}

        {tab === "cos" && (
          <>
            <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 14, marginBottom: 4 }]}>기체 도장</Text>
            {SKINS.map(k => (
              <Row key={k.id} c={c} art={<Plate kind="skin" item={k} size={54} dep={dep} />}
                title={k.nm} sub={k.sub}
                right={<PriceBtn c={c} item={k} slot="skin" equippedId={S.skin} onDone={done} />} />
            ))}
            <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 22, marginBottom: 4 }]}>배기 궤적</Text>
            {TRAILS.map(t => (
              <Row key={t.id} c={c} art={<Plate kind="trail" item={t} size={54} dep={dep} />}
                title={t.nm} sub={t.sub}
                right={<PriceBtn c={c} item={t} slot="trail" equippedId={S.trail} onDone={done} />} />
            ))}
          </>
        )}

        {tab === "log" && (
          <>
            <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 14, marginBottom: 2 }]}>항행 기록</Text>
            {[1, 2, 3, 4, 5, ...Object.keys(STORY_REVERB).map(Number)].map(n => {
              const seen = S.seenStory.includes(n);
              const lines = seen ? storyFor(n) : null;
              return (
                <LogRow key={n} c={c} seen={seen}
                  title={`STAGE ${n} · ${stageName(n)}`}
                  body={lines
                    ? lines.map(([who, say]) => (who ? `${who}: ` : "") + say).join("  /  ")
                    : "미확인 구역"} />
              );
            })}

            <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 22, marginBottom: 2 }]}>조우 기록</Text>
            {CODEX.map(x => {
              const seen = S.codex.includes(x.id);
              return <LogRow key={x.id} c={c} seen={seen}
                title={seen ? x.nm : "??? · 미조우"}
                body={seen ? x.tx : "아직 만나지 않았다."} />;
            })}

            <Text style={[mono, { color: c.dim, fontSize: 11, marginTop: 22 }]}>
              최고 {fmt(S.best)} · 돌파 {S.cleared}구역
            </Text>

            {/* 되돌릴 수 없으므로 2단계로 받는다 — 확인 창을 띄우지 않고 버튼 자체가 상태를 바꾼다 */}
            <Pressable
              onPress={() => {
                if (!armed) {
                  setArmed(true);
                  setTimeout(() => setArmed(false), 4000);
                  return;
                }
                resetSave();
                G.pickStage = 1;
                setArmed(false);
                notify("기록을 초기화했습니다");
                refresh();
              }}
              style={({ pressed }) => ({
                marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                borderWidth: 1, borderColor: armed ? c.bad : c.line, opacity: pressed ? .7 : 1,
              })}>
              <Text style={{ color: armed ? c.bad : c.dim, fontSize: 13, letterSpacing: 1 }}>
                {armed ? "정말 지웁니다 — 한 번 더" : "기록 초기화"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={{ padding: 18, paddingTop: 8 }}>
        <Btn c={c} onPress={onClose}>닫기</Btn>
      </View>
    </View>
  );
}
