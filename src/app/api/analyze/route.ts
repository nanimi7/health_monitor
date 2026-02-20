import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SymptomData {
  date: string;
  intensity: number;
  tookMedication: boolean;
  occurredAt?: string;
  description?: string;
}

interface AnalysisRequest {
  diseaseName: string;
  medication: string;
  symptoms: SymptomData[];
  userInfo: {
    gender: string;
    age: number;
  };
  periodDays: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { diseaseName, medication, symptoms, userInfo, periodDays } = body;

    if (!symptoms || symptoms.length === 0) {
      return NextResponse.json(
        { error: '분석할 증상 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const symptomSummary = symptoms.map(s =>
      `- ${s.date} ${s.occurredAt ? s.occurredAt : ''}: 강도 ${s.intensity}/10, 약물 ${s.tookMedication ? '복용' : '미복용'}${s.description ? `, 상세: ${s.description}` : ''}`
    ).join('\n');

    const prompt = `당신은 건강 데이터를 분석하는 전문 의료 AI 어시스턴트입니다. 다음 환자 정보와 증상 기록을 바탕으로 분석해주세요.

## 환자 정보
- 성별: ${userInfo.gender === 'male' ? '남성' : '여성'}
- 나이: ${userInfo.age}세
- 질환: ${diseaseName}
- 복용 약물: ${medication || '없음'}

## 증상 기록 (최근 ${periodDays}일)
${symptomSummary}

## 분석 요청
다음 5가지 항목에 대해 분석해주세요. 각 항목은 명확한 제목과 함께 작성하되, 환자가 이해하기 쉬운 언어로 작성해주세요.

1. **중증도 분석**: 기록된 강도 데이터를 바탕으로 전반적인 중증도를 평가해주세요. 강도의 변화 추이와 평균값을 고려하세요.

2. **발생 기전 분석**: 증상의 발생 패턴과 가능한 원인을 추정해주세요. 특정 시간대나 상황에서 더 자주 발생하는지 분석하세요.

3. **패턴 분석**: 시간대별, 빈도별, 강도 변화의 패턴을 분석해주세요. 주기성이나 특이한 패턴이 있는지 확인하세요.

4. **병원 방문 권고**: 현재 상태에서 병원 방문이 필요한지 판단하고, 필요하다면 어떤 진료과를 방문해야 하는지 권고해주세요.

5. **의사 전달 사항**: 병원 방문 시 의사에게 전달해야 할 핵심 내용을 5줄 이내로 요약해주세요.

주의: 이 분석은 참고용이며, 정확한 진단을 위해서는 반드시 의료 전문가와 상담해야 합니다.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({ analysis: content.text });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
