/* 플레이필드 — 코어의 그리기 코드를 Skia 로 그린다.

   한 프레임은 이렇게 흐른다.
     update(dt) → 코어가 세계를 갱신 (웹과 똑같은 코드)
     draw()     → 코어가 Skia2D 어댑터에 그린다 → SkPicture 한 장
     picture.value = 그 장  → Skia 가 UI 스레드에서 합성한다

   그림을 매 프레임 React 상태로 올리면 초당 60번 재렌더가 된다.
   SharedValue 로 넘기면 JS 스레드는 값만 바꾸고 렌더 트리는 그대로다.
*/
import React, { useEffect } from "react";
import { View } from "react-native";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";

import { Skia2D, makePath2D } from "../../src/native/skia2d";
import { fontFor } from "./fonts";
import { W, H, G, P, setHost, update, movePlayer, stats, draw, setCtx } from "../../src/core/index";

export default function GameField({ width, height, running, ground }) {
  const picture = useSharedValue(null);

  /* 필드는 480×720 고정 비율이다. 화면에 맞춰 통째로 축소하고, 남는 곳은 바닥색. */
  const scale = Math.min(width / W, height / H);
  const offX = (width - W * scale) / 2;
  const offY = (height - H * scale) / 2;

  useEffect(() => {
    setHost({ Path2D: makePath2D(Skia) });
    let raf = 0, last = 0, alive = true;

    const frame = now => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
      last = now;
      G.dt = dt;

      if (running) {
        /* 히트스톱 — 세계만 멈추고 기체는 계속 움직인다 (웹과 같은 규칙) */
        if (G.stop > 0) { G.stop -= dt; movePlayer(dt, stats()); }
        else update(dt);
      } else if (G.player) {
        G.t += dt;
        for (const q of G.parts) q.life -= dt * .2;
      }

      const rec = Skia.PictureRecorder();
      /* 컬링 범위를 준다 — 안 주면 Skia 가 무한 영역으로 잡아 잘라낼 기회를 잃는다 */
      const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, width, height));
      canvas.save();
      canvas.translate(offX, offY);
      canvas.scale(scale, scale);
      const g = new Skia2D(Skia, canvas, fontFor);
      setCtx(g);
      draw();
      canvas.restore();
      picture.value = rec.finishRecordingAsPicture();
    };

    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [running, scale, offX, offY, width, height, picture]);

  /* 터치 — locationX/Y 는 이 View 기준이라 화면 어디에 놓이든 맞는다.
     손가락 위쪽으로 52px 띄워 기체가 손에 가리지 않게 한다 (웹의 터치 오프셋과 같은 값). */
  const toField = e => {
    P.tx = (e.nativeEvent.locationX - offX) / scale;
    P.ty = (e.nativeEvent.locationY - offY) / scale - 52;
  };

  return (
    <View
      style={{ width, height, backgroundColor: ground }}
      onStartShouldSetResponder={() => running}
      onMoveShouldSetResponder={() => running}
      onResponderGrant={e => { P.active = true; toField(e); }}
      onResponderMove={toField}
      onResponderRelease={() => { P.active = false; }}
      onResponderTerminate={() => { P.active = false; }}
    >
      <Canvas style={{ flex: 1 }}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
