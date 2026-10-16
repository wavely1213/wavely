// 마스터링 계산 워커. build.mjs가 따로 묶어 문자열로 넣고, master.js가 blob URL로 띄운다.
import { processMaster, measure } from './dsp.js';

self.onmessage = (e) => {
  const { id, kind, payload } = e.data;
  try {
    if (kind === 'master') {
      const res = processMaster(payload, (step) => self.postMessage({ id, step }));
      self.postMessage({ id, result: res }, res.channels.map((c) => c.buffer));
    } else if (kind === 'measure') {
      self.postMessage({ id, result: measure(payload.channels, payload.rate) });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
