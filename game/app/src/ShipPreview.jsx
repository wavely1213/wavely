/* 타이틀 기체 프리뷰 — 장착한 기체 · 도장 · 궤적이 실제로 어떻게 보이는지.
   그리는 것은 코어(core/draw.js 의 drawShipPreview)라 웹과 같은 그림이 나온다. */
import React, { useEffect, useMemo } from "react";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";

import { Skia2D } from "../../src/native/skia2d";
import { drawShipPreview, resetShipPreview, setCtx } from "../../src/core/index";

export default function ShipPreview({ size = 200, active = true, revision = 0 }) {
  const picture = useSharedValue(null);
  const box = useMemo(() => Skia.XYWHRect(0, 0, size, size), [size]);

  useEffect(() => {
    if (!active) { resetShipPreview(); return; }
    let raf = 0, last = 0, alive = true;
    const frame = now => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
      last = now;

      const rec = Skia.PictureRecorder();
      const canvas = rec.beginRecording(box);
      const g = new Skia2D(Skia, canvas, () => null);
      /* 프리뷰와 플레이필드가 같은 ctx 슬롯을 쓴다 — 한 번에 하나만 도니 괜찮다.
         타이틀에서는 필드 루프가 멈춰 있고, 전투 중에는 프리뷰가 꺼진다. */
      setCtx(g);
      drawShipPreview(g, size, size, dt);
      picture.value = rec.finishRecordingAsPicture();
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [active, size, box, picture, revision]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
