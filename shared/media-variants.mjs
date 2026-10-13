export const VIDEO_PROCESSING_VERSION = 'h264-720p30-browser-v1';
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const POSTER_MAX_BYTES = 2 * 1024 * 1024;
export async function digestBytes(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}

// Read only the bounded container metadata needed for our generated files.
// This is not a decoder; the browser also probes/decodes before submitting them.
export function inspectPlayback(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 32 || bytes.length > MEDIA_MAX_BYTES) throw new Error('播放副本大小无效');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = offset => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  let count = 0;
  const boxes = (start, end) => {
    const result = [];
    for (let offset = start; offset < end;) {
      if (++count > 10000 || offset + 8 > end) throw new Error('播放副本容器无效');
      let size = view.getUint32(offset), header = 8;
      if (size === 1) { if (offset + 16 > end) throw new Error('播放副本容器无效'); size = Number(view.getBigUint64(offset + 8)); header = 16; }
      if (!size) size = end - offset;
      if (!Number.isSafeInteger(size) || size < header || offset + size > end) throw new Error('播放副本容器无效');
      result.push({ type: text(offset + 4), start: offset, data: offset + header, end: offset + size }); offset += size;
    }
    return result;
  };
  const top = boxes(0, bytes.length), moov = top.find(b => b.type === 'moov'), mdat = top.find(b => b.type === 'mdat');
  if (top[0]?.type !== 'ftyp' || !moov || !mdat || mdat.end <= mdat.data || moov.start > mdat.start) throw new Error('播放副本须为已优化加载的MP4');
  const movie = boxes(moov.data, moov.end), header = movie.find(b => b.type === 'mvhd');
  if (!header) throw new Error('播放副本缺少时长');
  const version = bytes[header.data], minimum = version === 1 ? 32 : 20;
  if (![0, 1].includes(version) || header.end - header.data < minimum) throw new Error('播放副本时长无效');
  const scale = view.getUint32(header.data + (version ? 20 : 12));
  const ticks = version ? Number(view.getBigUint64(header.data + 24)) : view.getUint32(header.data + 16);
  const duration = ticks / scale;
  if (!scale || !Number.isSafeInteger(ticks) || !Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error('播放副本时长无效');
  const descriptions = [];
  for (const track of movie.filter(b => b.type === 'trak')) {
    let parent = track;
    for (const type of ['mdia', 'minf', 'stbl', 'stsd']) { parent = boxes(parent.data, parent.end).find(b => b.type === type); if (!parent) throw new Error('播放副本轨道无效'); }
    if (parent.end - parent.data < 8) throw new Error('播放副本编码无效');
    const entries = boxes(parent.data + 8, parent.end);
    if (entries.length !== view.getUint32(parent.data + 4)) throw new Error('播放副本编码无效');
    descriptions.push(...entries);
  }
  const video = descriptions.find(b => b.type === 'avc1');
  if (!video || descriptions.some(b => !['avc1', 'mp4a'].includes(b.type)) || video.end - video.data < 78 || !boxes(video.data + 78, video.end).some(b => b.type === 'avcC')) throw new Error('播放副本须为H.264与可选AAC轨道');
  const width = view.getUint16(video.data + 24), height = view.getUint16(video.data + 26);
  if (!width || !height || width > 1280 || height > 720) throw new Error('播放副本须在720p范围内');
  return { duration, width, height, playbackCodec: 'h264' };
}
export function inspectPoster(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 24 || bytes.length > POSTER_MAX_BYTES || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('封面须为有效JPEG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset++] !== 255) throw new Error('封面格式无效');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    if (offset + 2 > bytes.length) break;
    const size = view.getUint16(offset);
    if (size < 2 || offset + size > bytes.length) throw new Error('封面格式无效');
    if ([192, 193, 194].includes(marker)) {
      if (size < 8) throw new Error('封面尺寸无效');
      const height = view.getUint16(offset + 3), width = view.getUint16(offset + 5);
      if (!width || !height || width > 640 || height > 640) throw new Error('封面尺寸无效');
      return { width, height };
    }
    offset += size;
  }
  throw new Error('封面缺少可识别的图像尺寸');
}
export function validateVariantMetadata(value, playback) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['duration', 'originalCodec', 'processingVersion', 'sourceSha256'].includes(k)) || value.processingVersion !== VIDEO_PROCESSING_VERSION || typeof value.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sourceSha256) || typeof value.originalCodec !== 'string' || !/^[a-z0-9_]{1,32}$/.test(value.originalCodec) || typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0 || value.duration > 86400 || Math.abs(value.duration - playback.duration) > 1) throw new Error('素材处理信息与播放文件不一致');
  return { duration: value.duration, originalCodec: value.originalCodec, sourceSha256: value.sourceSha256, playbackCodec: 'h264', processingVersion: VIDEO_PROCESSING_VERSION, processingStatus: '已处理', processingError: '' };
}
