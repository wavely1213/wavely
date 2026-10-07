// WAV 인코딩(16·24비트) + 압축 없는 zip 묶기. (.mid·.wav는 바로 내려받을 수 없어서 zip 하나로 전달)

// buffer: AudioBuffer 또는 {channels: Float32Array[], sampleRate}
// opts.bits: 16 | 24, opts.normalize: 피크 0.98로 맞춤(데모용), 16비트는 TPDF 디더
export function encodeWav(buffer, { bits = 16, normalize = true } = {}) {
  const chans = buffer.channels || Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const ch = chans.length;
  const len = chans[0].length;
  const rate = buffer.sampleRate;
  const bytes = bits / 8;
  const out = new DataView(new ArrayBuffer(44 + len * ch * bytes));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * bytes, true); w(8, 'WAVE');
  w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * ch * bytes, true); out.setUint16(32, ch * bytes, true); out.setUint16(34, bits, true);
  w(36, 'data'); out.setUint32(40, len * ch * bytes, true);
  let gain = 1;
  if (normalize) {
    let peak = 0;
    chans.forEach((d) => { for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i])); });
    if (peak > 0.98) gain = 0.98 / peak; // 클리핑 방지
  }
  const max = bits === 24 ? 0x7fffff : 0x7fff;
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      let v = chans[c][i] * gain * max;
      if (bits === 16) v += Math.random() - Math.random(); // TPDF 디더
      const s = Math.max(-max - 1, Math.min(max, Math.round(v)));
      if (bits === 24) {
        out.setUint8(o, s & 255); out.setUint8(o + 1, (s >> 8) & 255); out.setUint8(o + 2, (s >> 16) & 255);
      } else {
        out.setInt16(o, s, true);
      }
      o += bytes;
    }
  }
  return new Uint8Array(out.buffer);
}

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// files: [{name, data: Uint8Array|string}]
export function zip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  files.forEach((f) => {
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cenSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)]);
}
