import { FFmpeg } from '@ffmpeg/ffmpeg';
import workerURL from '@ffmpeg/ffmpeg/worker?worker&url';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { VIDEO_PROCESSING_VERSION, MEDIA_MAX_BYTES, inspectPlayback, inspectPoster, digestBytes } from '../../shared/media-variants.mjs';

export async function processVideo(file, { signal, onProgress = () => {} } = {}) {
  if (!(file instanceof Blob) || !file.size || file.size > MEDIA_MAX_BYTES) throw new Error('请选择50MB以内的真实视频');
  if (signal?.aborted) throw new DOMException('已取消处理，原片保留', 'AbortError');
  const ffmpeg = new FFmpeg();
  const logs = [];
  ffmpeg.on('log', ({ message }) => { logs.push(message); if (logs.length > 30) logs.shift(); });
  const abort = () => ffmpeg.terminate();
  signal?.addEventListener('abort', abort, { once: true });
  // Bound loading/probing too, rather than only setting an encoder timeout.
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; abort(); }, 12 * 60 * 1000);
  try {
    onProgress('正在加载视频处理工具…');
    await ffmpeg.load({ coreURL: new URL(coreURL, location.href).href, wasmURL: new URL(wasmURL, location.href).href, classWorkerURL: new URL(workerURL, location.href).href });
    const input = new Uint8Array(await file.arrayBuffer()), sourceSha256 = await digestBytes(input);
    await ffmpeg.writeFile('original', input);
    const probe = async (filename, output) => {
      const code = await ffmpeg.ffprobe(['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filename, '-o', output], 30000);
      // core 0.12.10 leaves ret=-1 when ffprobe returns normally, while exec
      // uses its exit callback. Require a fresh, complete JSON probe either way.
      if (![0, -1].includes(code)) throw new Error('视频格式无法识别');
      const value = JSON.parse(await ffmpeg.readFile(output, 'utf8'));
      if (!Array.isArray(value.streams) || !value.format) throw new Error('视频格式无法识别');
      return value;
    };
    const original = await probe('original', 'original.json'), stream = original.streams.find(s => s.codec_type === 'video'), duration = Number(original.format?.duration);
    if (!stream || !Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error('原片没有可识别的视频轨道或时长');
    const reportProgress = ({ progress }) => onProgress(Number.isFinite(progress) ? `正在生成播放副本 ${Math.min(99, Math.max(0, Math.round(progress * 100)))}%…` : '正在生成播放副本…');
    ffmpeg.on('progress', reportProgress);
    onProgress('正在生成播放副本…');
    const code = await ffmpeg.exec(['-i', 'original', '-map', '0:v:0', '-map', '0:a?', '-vf', "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-r', '30', '-maxrate', '1500k', '-bufsize', '3000k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', 'playback.mp4'], 600000);
    if (code !== 0) throw new Error('播放副本处理失败或超时');
    ffmpeg.off('progress', reportProgress);
    const output = await probe('playback.mp4', 'playback.json');
    if (output.streams.find(s => s.codec_type === 'video')?.codec_name !== 'h264' || output.streams.some(s => s.codec_type === 'audio' && s.codec_name !== 'aac')) throw new Error('播放副本编码不符合要求');
    onProgress('正在生成封面…');
    if (await ffmpeg.exec(['-i', 'playback.mp4', '-frames:v', '1', '-vf', "scale=w='min(640,iw)':h='min(640,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", 'poster.jpg'], 30000) !== 0) throw new Error('封面生成失败');
    const playback = await ffmpeg.readFile('playback.mp4'), poster = await ffmpeg.readFile('poster.jpg');
    inspectPlayback(playback); inspectPoster(poster);
    return { playback: new Blob([playback], { type: 'video/mp4' }), poster: new Blob([poster], { type: 'image/jpeg' }), metadata: { duration, originalCodec: stream.codec_name, sourceSha256, processingVersion: VIDEO_PROCESSING_VERSION } };
  } catch (error) {
    if (import.meta.env.DEV) console.error('视频处理诊断', logs.join('\n'));
    if (signal?.aborted) throw new DOMException('已取消处理，原片保留', 'AbortError');
    const message = timedOut ? '此设备处理超时' : /[\u4e00-\u9fff]/.test(error.message || '') ? error.message : '此设备未能完成处理，可在电脑重试';
    throw new Error(message);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); ffmpeg.terminate(); }
}
