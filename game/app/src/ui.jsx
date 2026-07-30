/* 공용 부품 — 웹의 계기판 룩을 RN 으로 옮긴 것.
   위험 표지 띠 · 형식번호 배지 · 계기 모서리 · 리스트=클린 / 카드=소프트 블렌드. */
import React from "react";
import { View, Text, Pressable } from "react-native";

export const mono = { fontVariant: ["tabular-nums"], letterSpacing: 1 };

export function Hazard({ c, h = 6 }) {
  /* 사선 줄무늬 — 관제국 지급품이라는 표시. RN 에는 repeating-linear-gradient 가 없어
     기울인 막대를 늘어놓아 같은 그림을 만든다. */
  return (
    <View style={{ height: h, flex: 1, overflow: "hidden", flexDirection: "row" }}>
      {Array.from({ length: 40 }, (_, i) => (
        <View key={i} style={{
          width: 6, height: h * 3, marginRight: 7, backgroundColor: c.signal,
          transform: [{ rotate: "24deg" }, { translateY: -h }],
        }} />
      ))}
    </View>
  );
}

export function Badge({ c, children }) {
  return (
    <View style={{ borderWidth: 1, borderColor: c.dim, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 }}>
      <Text style={[mono, { color: c.dim, fontSize: 10 }]}>{children}</Text>
    </View>
  );
}

export function Btn({ c, onPress, primary, disabled, children, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [{
        paddingVertical: 13, paddingHorizontal: 18, borderRadius: 10,
        borderWidth: 1,
        borderColor: primary ? c.signal : c.line,
        backgroundColor: primary ? c.signal : "transparent",
        opacity: disabled ? .4 : pressed ? .75 : 1,
        alignItems: "center",
      }, style]}
    >
      <Text style={{
        color: primary ? "#141413" : c.fg,
        fontSize: 15, fontWeight: "600", letterSpacing: 1,
      }}>{children}</Text>
    </Pressable>
  );
}

/* 리스트 행 — 구분선만, 그림자 없음 */
export function Row({ c, title, sub, right, onPress, dim }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line,
        opacity: dim ? .45 : pressed && onPress ? .7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.fg, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        {!!sub && <Text style={{ color: c.dim, fontSize: 12, marginTop: 3 }}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/* 값 하나 — 결과·정지 화면의 계기 */
export function Stat({ c, k, v, tone }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[mono, { color: c.dim, fontSize: 10 }]}>{k}</Text>
      <Text style={[mono, { color: tone || c.fg, fontSize: 22, fontWeight: "700", marginTop: 2 }]}>{v}</Text>
    </View>
  );
}

/* 키-값 한 줄 — 정지 화면의 상황 요약 */
export function KV({ c, k, v }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 6 }}>
      <Text style={[mono, { color: c.dim, fontSize: 11, width: 40 }]}>{k}</Text>
      <Text style={{ color: c.fg, fontSize: 13, flex: 1 }}>{v}</Text>
    </View>
  );
}

export function Toast({ c, msg }) {
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{
      position: "absolute", left: 0, right: 0, top: 14, alignItems: "center",
    }}>
      <View style={{
        backgroundColor: c.ground, borderWidth: 1, borderColor: c.line,
        borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
      }}>
        <Text style={{ color: c.fg, fontSize: 13 }}>{msg}</Text>
      </View>
    </View>
  );
}
