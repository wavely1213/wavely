/* 격납고 카드 아트 — 탑승자 식별 표식 · 기체 도면.
   움직이지 않으므로 한 번만 그려 SkPicture 로 들고 있는다. */
import React, { useMemo } from "react";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";

import { Skia2D } from "../../src/native/skia2d";
import { drawPilotPlate, drawFramePlate, drawSwatch, setCtx } from "../../src/core/index";
import { fontFor } from "./fonts";

/* @param kind "pilot" | "frame" | "skin" | "trail"
   @param dep  다시 그려야 할 이유(도장 변경·기체 변경·테마 변경)를 문자열로 넘긴다 */
export default function Plate({ kind, item, size = 62, dep = "" }) {
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, size, size));
    const g = new Skia2D(Skia, canvas, fontFor);
    setCtx(g);
    if (kind === "pilot") drawPilotPlate(g, item, size);
    else if (kind === "frame") drawFramePlate(g, item, size);
    else drawSwatch(g, item, kind, size);
    return rec.finishRecordingAsPicture();
  }, [kind, item, size, dep]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
