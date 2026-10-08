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
function crcInit() {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
}
function crcUpdate(c, bytes) {
  let x = c;
  for (let i = 0; i < bytes.length; i++) x = crcTable[(x ^ bytes[i]) & 255] ^ (x >>> 8);
  return x;
}
function crc32(bytes) {
  crcInit();
  return (crcUpdate(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
}

// 큰 파일(Blob)은 8MB씩 읽으며 CRC를 계산하고 사이사이 화면에 양보한다
async function crc32Blob(blob, onChunk) {
  crcInit();
  let c = 0xffffffff;
  const CH = 8 * 1024 * 1024;
  for (let o = 0; o < blob.size; o += CH) {
    c = crcUpdate(c, new Uint8Array(await blob.slice(o, o + CH).arrayBuffer()));
    onChunk(Math.min(blob.size, o + CH));
    await new Promise((r) => setTimeout(r, 0));
  }
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

// 이 앱이 만든 zip(압축 없음) 읽기. 반환: [{ name, data: Uint8Array }]. 압축된 항목은 건너뛴다.
export function unzip(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const dec = new TextDecoder();
  const out = [];
  let o = 0;
  while (o + 30 <= u8.length && v.getUint32(o, true) === 0x04034b50) {
    const method = v.getUint16(o + 8, true);
    const size = v.getUint32(o + 18, true);
    const nameLen = v.getUint16(o + 26, true);
    const extraLen = v.getUint16(o + 28, true);
    const start = o + 30 + nameLen + extraLen;
    if (start + size > u8.length) break;
    if (method === 0) out.push({ name: dec.decode(u8.subarray(o + 30, o + 30 + nameLen)), data: u8.slice(start, start + size) });
    o = start + size;
  }
  return out;
}

// 큰 파일용 zip: data가 Blob이면 메모리로 복사하지 않고 그대로 이어 붙인다 (마스터 WAV 여러 개).
// files: [{name, data: Uint8Array | string | Blob}], onProgress(읽은 바이트, 전체 바이트)
export async function zipAsync(files, onProgress = () => {}) {
  const enc = new TextEncoder();
  const prepared = files.map((f) => ({ name: enc.encode(f.name), data: typeof f.data === 'string' ? enc.encode(f.data) : f.data }));
  const total = prepared.reduce((a, f) => a + (f.data.size ?? f.data.length), 0);
  let done = 0;
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of prepared) {
    const isBlob = typeof Blob !== 'undefined' && f.data instanceof Blob;
    const size = isBlob ? f.data.size : f.data.length;
    const crc = isBlob ? await crc32Blob(f.data, (n) => onProgress(done + n, total)) : crc32(f.data);
    done += size;
    onProgress(done, total);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true);
    local.setUint16(26, f.name.length, true);
    parts.push(new Uint8Array(local.buffer), f.name, f.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, size, true); cen.setUint32(24, size, true);
    cen.setUint16(28, f.name.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), f.name);
    offset += 30 + f.name.length + size;
  }
  const cenSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, prepared.length, true); end.setUint16(10, prepared.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)]);
}
