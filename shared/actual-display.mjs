// Presentation evidence only. Do not add fields to existing frozen report facts.
export function hasKnownActualDistance(records){return records.some(r=>!['未完成','已取消'].includes(r.completionStatus)&&(r.entryMode==='训练组'?(r.sets||[]).some(s=>typeof s.completedRepeats==='number'&&Number.isFinite(s.completedRepeats)):typeof r.totalMeters==='number'&&Number.isFinite(r.totalMeters)));}
export function actualDistanceText(summary,known){return `${known||summary.metersCount||summary.knownMeters?`已知实际距离${summary.knownMeters}米`:'实际距离未记录'}；${summary.unknownSets}组实际次数未知。`;}
