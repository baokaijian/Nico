import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const run = promisify(execFile);
export async function inspectMedia(filename, type) {
  const probe = JSON.parse((await run(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filename], { timeout: 30000 })).stdout);
  const image = probe.streams.find(s => s.codec_type === 'video');
  if (!image || type === 'photo' && !['png', 'mjpeg', 'webp'].includes(image.codec_name)) throw new Error('文件内容与允许格式不符');
  const duration = Number(probe.format.duration);
  if (type === 'video' && (!Number.isFinite(duration) || duration <= 0 || !probe.format.format_name.split(',').some(name => ['mov', 'mp4', 'matroska', 'webm'].includes(name)))) throw new Error('文件内容不是有时长的允许视频格式');
  return { codec: image.codec_name, duration: type === 'video' ? duration : null };
}
export async function processMedia(record, uploadsDir) {
  const source = path.join(uploadsDir, path.basename(record.url));
  const prefix = path.basename(record.url, path.extname(record.url));
  try {
    const probe = JSON.parse((await run(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', source], { timeout: 30000 })).stdout);
    const video = probe.streams.find(s => s.codec_type === 'video');
    if (!video) throw new Error('文件没有可识别的影像轨道');
    if (record.type !== 'video') return { processingStatus: '已处理', codec: video.codec_name };
    const poster = `${prefix}-poster.jpg`, playback = `${prefix}-720p.mp4`;
    await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-i', source, '-frames:v', '1', '-vf', 'scale=640:-2', path.join(uploadsDir, poster)], { timeout: 120000 });
    await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-i', source, '-map', '0:v:0', '-map', '0:a?', '-vf', "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-r', '30', '-maxrate', '1500k', '-bufsize', '3000k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(uploadsDir, playback)], { timeout: 600000 });
    return { processingStatus: '已处理', duration: Number(probe.format.duration), originalCodec: video.codec_name, playbackCodec: 'h264', processingVersion: 'h264-720p30-v2', posterUrl: `/uploads/${poster}`, playbackUrl: `/uploads/${playback}` };
  } catch (error) { return { processingStatus: '处理失败', processingError: `原片保留；请检查格式和FFmpeg安装。${error.message.slice(0, 160)}` }; }
}
