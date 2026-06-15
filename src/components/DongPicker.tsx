import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';

import { Colors } from '@/constants/theme';

type Props = {
  value: string | null;          // 선택된 동 (null = 전체)
  options: string[];             // 정규화된 동 목록
  onChange: (d: string | null) => void;
  allLabel?: string;             // 전체 항목 라벨
  compact?: boolean;             // 작은 버튼 스타일
};

export function DongPicker({ value, options, onChange, allLabel = '춘천시 전체', compact }: Props) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const [open, setOpen] = useState(false);
  const label = value ?? allLabel;

  const pick = (d: string | null) => { onChange(d); setOpen(false); };
  const Item = ({ d, lbl }: { d: string | null; lbl: string }) => {
    const on = value === d || (d === null && value === null);
    return (
      <Pressable onPress={() => pick(d)} style={[styles.item, { borderColor: c.border }]}>
        <Text style={[styles.itemTxt, { color: on ? c.primary : c.text, fontWeight: on ? '800' : '600' }]}>📍 {lbl}</Text>
        {on ? <Text style={{ color: c.primary, fontWeight: '900' }}>✓</Text> : null}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.btn, compact && styles.btnCompact, { backgroundColor: value ? c.primary : c.card, borderColor: value ? c.primary : c.border }]}>
        <Text style={[styles.btnTxt, { color: value ? c.onPrimary : c.text }]} numberOfLines={1}>📍 {label}</Text>
        <Text style={[styles.caret, { color: value ? c.onPrimary : c.textSecondary }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>동네 선택</Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <Item d={null} lbl={allLabel} />
              {options.map((d) => <Item key={d} d={d} lbl={d} />)}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', maxWidth: 240 },
  btnCompact: { paddingVertical: 7, paddingHorizontal: 12 },
  btnTxt: { fontSize: 13.5, fontWeight: '800', flexShrink: 1 },
  caret: { fontSize: 12, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8888', marginVertical: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1 },
  itemTxt: { fontSize: 15 },
});
