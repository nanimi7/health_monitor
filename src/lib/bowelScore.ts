import { BowelRecord } from '@/types';

// Bristol Stool Scale descriptions
export const bristolTypes = [
  { type: 1, name: '타입 1', description: '딱딱한 토끼똥 형태', emoji: '🔵', risk: 'high' },
  { type: 2, name: '타입 2', description: '소시지 모양이지만 울퉁불퉁', emoji: '🟤', risk: 'medium' },
  { type: 3, name: '타입 3', description: '소시지 모양에 금이 있음', emoji: '🟢', risk: 'low' },
  { type: 4, name: '타입 4', description: '매끄러운 소시지 또는 뱀 형태', emoji: '✅', risk: 'none' },
  { type: 5, name: '타입 5', description: '부드러운 덩어리들', emoji: '🟢', risk: 'low' },
  { type: 6, name: '타입 6', description: '가장자리가 들쭉날쭉한 묽은 변', emoji: '🟠', risk: 'medium' },
  { type: 7, name: '타입 7', description: '완전히 액체 상태', emoji: '🔴', risk: 'high' },
] as const;

export const colorOptions = [
  { value: 'yellow', label: '노란색', risk: 'low' },
  { value: 'brown', label: '갈색', risk: 'none' },
  { value: 'green', label: '녹색', risk: 'low' },
  { value: 'black', label: '검은색', risk: 'high' },
  { value: 'red', label: '붉은색', risk: 'high' },
  { value: 'white', label: '흰색/회색', risk: 'high' },
] as const;

export const amountOptions = [
  { value: 'small', label: '적음' },
  { value: 'littleMore', label: '조금 많음' },
  { value: 'normal', label: '보통' },
  { value: 'much', label: '많음' },
  { value: 'veryMuch', label: '매우 많음' },
] as const;

export const durationOptions = [
  { value: '1-3', label: '1~3분' },
  { value: '3-5', label: '3~5분' },
  { value: '5+', label: '5분 이상' },
] as const;

export const difficultyOptions = [
  { value: 'easy', label: '거의 안 힘줌' },
  { value: 'little', label: '조금 힘줌' },
  { value: 'hard', label: '많이 힘줌' },
  { value: 'veryHard', label: '5분 이상 오래 걸림' },
] as const;

export const residualFeelingOptions = [
  { value: 'none', label: '없음' },
  { value: 'little', label: '약간 있음' },
  { value: 'much', label: '많이 있음' },
] as const;

export const bloatingOptions = [
  { value: 'none', label: '없음' },
  { value: 'sometimes', label: '가끔 있음' },
  { value: 'yes', label: '있음' },
] as const;

/**
 * Constipation Risk Evaluation Rule v1.0
 * 배변 점수 계산 (10점 만점)
 */
export function calculateBowelScore(records: BowelRecord[]): number {
  if (records.length === 0) return 10;

  let totalScore = 0;
  let recordCount = 0;

  // 기간 내 배변 없는 날 수 계산
  const noBowelDays = records.filter(r => !r.hasBowelMovement).length;
  const hasBowelRecords = records.filter(r => r.hasBowelMovement);

  // 기본 점수 (배변 빈도 기반)
  const bowelRatio = hasBowelRecords.length / records.length;
  let frequencyScore = bowelRatio >= 0.7 ? 3 : bowelRatio >= 0.5 ? 2 : bowelRatio >= 0.3 ? 1 : 0;

  // 연속 배변 없는 날 패널티
  if (noBowelDays >= 3) frequencyScore -= 1;

  totalScore += Math.max(0, frequencyScore);

  // 각 배변 기록에 대한 점수 계산
  for (const record of hasBowelRecords) {
    let recordScore = 0;

    // Bristol Type 점수 (0-2점)
    if (record.bristolType) {
      if (record.bristolType === 3 || record.bristolType === 4) {
        recordScore += 2;
      } else if (record.bristolType === 2 || record.bristolType === 5) {
        recordScore += 1;
      }
    }

    // 배변 시간 점수 (0-1점)
    if (record.duration) {
      if (record.duration === '1-3') recordScore += 1;
      else if (record.duration === '3-5') recordScore += 0.5;
    }

    // 배변 난이도 점수 (0-1점)
    if (record.difficulty) {
      if (record.difficulty === 'easy') recordScore += 1;
      else if (record.difficulty === 'little') recordScore += 0.5;
    }

    // 잔변감 점수 (0-1점)
    if (record.residualFeeling) {
      if (record.residualFeeling === 'none') recordScore += 1;
      else if (record.residualFeeling === 'little') recordScore += 0.5;
    }

    // 색상 점수 (0-1점)
    if (record.color) {
      if (record.color === 'brown') recordScore += 1;
      else if (record.color === 'yellow' || record.color === 'green') recordScore += 0.5;
    }

    // 복부 팽만감 감점 (0 to -0.5점)
    if (record.bloating === 'yes') recordScore -= 0.5;
    else if (record.bloating === 'sometimes') recordScore -= 0.25;

    totalScore += recordScore;
    recordCount++;
  }

  // 평균 점수 계산 (빈도 점수 3점 + 개별 기록 평균 7점)
  if (recordCount > 0) {
    const avgRecordScore = (totalScore - frequencyScore) / recordCount;
    const normalizedRecordScore = (avgRecordScore / 6.5) * 7; // 최대 6.5점을 7점으로 정규화
    return Math.min(10, Math.max(0, Math.round((frequencyScore + normalizedRecordScore) * 10) / 10));
  }

  return Math.max(0, frequencyScore);
}

export function getScoreColor(score: number): string {
  if (score >= 8) return '#10B981';
  if (score >= 6) return '#F59E0B';
  if (score >= 4) return '#F97316';
  return '#EF4444';
}

export function getScoreDescription(score: number): string {
  if (score >= 8) return '양호한 배변 건강 상태입니다.';
  if (score >= 6) return '대체로 양호하지만 개선이 필요합니다.';
  if (score >= 4) return '배변 건강에 주의가 필요합니다.';
  return '변비 위험이 높습니다. 생활 습관 개선을 권장합니다.';
}
