export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

export function getBMICategory(bmi: number): {
  category: string;
  color: string;
  description: string;
} {
  if (bmi < 18.5) {
    return {
      category: '저체중',
      color: '#3B82F6',
      description: '체중이 정상 범위보다 낮습니다. 건강한 식단과 운동을 통해 체중을 늘리는 것이 좋습니다.',
    };
  } else if (bmi < 23) {
    return {
      category: '정상',
      color: '#10B981',
      description: '건강한 체중을 유지하고 있습니다. 현재의 생활 습관을 유지하세요.',
    };
  } else if (bmi < 25) {
    return {
      category: '과체중',
      color: '#F59E0B',
      description: '체중이 정상 범위보다 약간 높습니다. 식단 조절과 규칙적인 운동을 권장합니다.',
    };
  } else if (bmi < 30) {
    return {
      category: '비만',
      color: '#F97316',
      description: '비만 상태입니다. 건강을 위해 체중 감량이 필요합니다. 전문가와 상담을 권장합니다.',
    };
  } else {
    return {
      category: '고도비만',
      color: '#EF4444',
      description: '고도 비만 상태입니다. 건강 위험이 높으므로 의료 전문가와 상담하시기 바랍니다.',
    };
  }
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
