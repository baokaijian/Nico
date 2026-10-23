export function comparisonRate(value) { const rate=Number(value);if(![0.5,0.75,1].includes(rate))throw Error('播放速度仅支持0.5x、0.75x、1x');return rate; }
export function comparisonPosition(current, origin, otherOrigin, otherDuration) {
  if([current,origin,otherOrigin,otherDuration].some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0)||otherDuration===0)throw Error('视频时长或对比时间点尚未确认');
  const target=Math.max(0,otherOrigin+current-origin);return {time:Math.min(target,otherDuration),ended:target>=otherDuration};
}
