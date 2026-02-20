export const intensityLevels = [
  { level: 1, label: '1단계', description: '거의 느끼지 못함', color: '#10B981' },
  { level: 2, label: '2단계', description: '아주 약간 느낌', color: '#34D399' },
  { level: 3, label: '3단계', description: '약간 불편함', color: '#6EE7B7' },
  { level: 4, label: '4단계', description: '불편하지만 참을 만함', color: '#FCD34D' },
  { level: 5, label: '5단계', description: '중간 정도의 불편함', color: '#FBBF24' },
  { level: 6, label: '6단계', description: '상당히 불편함', color: '#F59E0B' },
  { level: 7, label: '7단계', description: '심하게 불편함', color: '#F97316' },
  { level: 8, label: '8단계', description: '매우 심한 불편함', color: '#EF4444' },
  { level: 9, label: '9단계', description: '극심한 고통', color: '#DC2626' },
  { level: 10, label: '10단계', description: '참을 수 없는 고통', color: '#B91C1C' },
] as const;

export function getIntensityInfo(level: number) {
  return intensityLevels.find(i => i.level === level) || intensityLevels[4];
}

export function getIntensityColor(level: number): string {
  return getIntensityInfo(level).color;
}
