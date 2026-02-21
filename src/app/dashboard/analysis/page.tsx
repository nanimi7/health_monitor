'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Disease, SymptomRecord } from '@/types';
import { format, subDays, parseISO, isBefore } from 'date-fns';
import { ko } from 'date-fns/locale';
import { calculateAge } from '@/lib/bmi';
import { AlertCircle, Brain, Loader2, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type PeriodOption = '7' | '14' | '30' | '60' | '90';

export default function AnalysisPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analysis options
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('');
  const [period, setPeriod] = useState<PeriodOption>('30');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists() || !profileSnap.data().height || !profileSnap.data().birthDate) {
        router.push('/dashboard');
        return;
      }

      setProfile(profileSnap.data() as UserProfile);

      // Load diseases
      const diseasesRef = collection(db, 'users', user.uid, 'diseases');
      const diseasesSnap = await getDocs(diseasesRef);
      const diseasesList: Disease[] = [];
      diseasesSnap.forEach((doc) => {
        diseasesList.push({ id: doc.id, ...doc.data() } as Disease);
      });

      if (diseasesList.length === 0) {
        setDiseases([]);
        setLoading(false);
        return;
      }

      setDiseases(diseasesList);
      setSelectedDiseaseId(diseasesList[0]?.id || '');

      // Load symptoms
      const symptomsRef = collection(db, 'users', user.uid, 'symptoms');
      const symptomsSnap = await getDocs(symptomsRef);
      const symptomsList: SymptomRecord[] = [];
      symptomsSnap.forEach((doc) => {
        symptomsList.push({ id: doc.id, ...doc.data() } as SymptomRecord);
      });
      setSymptoms(symptomsList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const selectedDisease = useMemo(() => {
    return diseases.find(d => d.id === selectedDiseaseId);
  }, [diseases, selectedDiseaseId]);

  const filteredSymptoms = useMemo(() => {
    if (!selectedDiseaseId) return [];

    const days = parseInt(period);
    const startDate = subDays(new Date(), days);

    return symptoms
      .filter(s => s.diseaseId === selectedDiseaseId)
      .filter(s => {
        const date = parseISO(s.date);
        return !isBefore(date, startDate);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [symptoms, selectedDiseaseId, period]);

  const symptomStats = useMemo(() => {
    if (filteredSymptoms.length === 0) return null;

    const intensities = filteredSymptoms.map(s => s.intensity);
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const max = Math.max(...intensities);
    const min = Math.min(...intensities);
    const medicationRate = filteredSymptoms.filter(s => s.tookMedication).length / filteredSymptoms.length * 100;

    return { avg, max, min, count: filteredSymptoms.length, medicationRate };
  }, [filteredSymptoms]);

  const handleAnalyze = async () => {
    if (!selectedDisease || !profile || filteredSymptoms.length === 0) return;

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diseaseName: selectedDisease.name,
          medication: selectedDisease.medication || '',
          symptoms: filteredSymptoms.map(s => ({
            date: s.date,
            intensity: s.intensity,
            tookMedication: s.tookMedication,
            occurredAt: s.occurredAt ? format(new Date(s.occurredAt), 'HH:mm') : undefined,
            description: s.description,
          })),
          userInfo: {
            gender: profile.gender,
            age: calculateAge(profile.birthDate),
          },
          periodDays: parseInt(period),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '분석 중 오류가 발생했습니다.');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F59E0B] mt-0.5" />
          <div>
            <p className="font-medium">사용자 정보를 먼저 입력해주세요.</p>
            <p className="text-sm text-[#6B7280] mt-1">
              질병 분석 기능을 사용하려면 기본 정보를 입력해야 합니다.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
              사용자 정보 입력하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (diseases.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F59E0B] mt-0.5" />
          <div>
            <p className="font-medium">등록된 질병이 없습니다.</p>
            <p className="text-sm text-[#6B7280] mt-1">
              질병 분석 기능을 사용하려면 먼저 보유 질병을 등록해야 합니다.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
              질병 등록하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-[#7C3AED]" />
        <h2 className="text-2xl font-bold text-[#1F2937]">AI 질병 분석</h2>
      </div>

      {/* Analysis Options */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">분석 조건 설정</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#4B5563] mb-2">
              질병 선택
            </label>
            <select
              value={selectedDiseaseId}
              onChange={(e) => {
                setSelectedDiseaseId(e.target.value);
                setAnalysis(null);
              }}
              className="input-field"
            >
              {diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>
                  {disease.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4B5563] mb-2">
              분석 기간
            </label>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as PeriodOption);
                setAnalysis(null);
              }}
              className="input-field"
            >
              <option value="7">최근 7일</option>
              <option value="14">최근 14일</option>
              <option value="30">최근 30일</option>
              <option value="60">최근 60일</option>
              <option value="90">최근 90일</option>
            </select>
          </div>
        </div>

        {/* Symptom Preview */}
        {symptomStats && (
          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            <h4 className="text-sm font-medium text-[#4B5563] mb-3">분석 대상 데이터 요약</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#F9FAFB] p-3 rounded-lg">
                <p className="text-xs text-[#6B7280]">기록 수</p>
                <p className="text-xl font-bold text-[#1F2937]">{symptomStats.count}건</p>
              </div>
              <div className="bg-[#F9FAFB] p-3 rounded-lg">
                <p className="text-xs text-[#6B7280]">평균 강도</p>
                <p className="text-xl font-bold text-[#7C3AED]">{symptomStats.avg.toFixed(1)}</p>
              </div>
              <div className="bg-[#F9FAFB] p-3 rounded-lg">
                <p className="text-xs text-[#6B7280]">최대/최소</p>
                <p className="text-xl font-bold text-[#1F2937]">{symptomStats.max}/{symptomStats.min}</p>
              </div>
              <div className="bg-[#F9FAFB] p-3 rounded-lg">
                <p className="text-xs text-[#6B7280]">약물 복용률</p>
                <p className="text-xl font-bold text-[#1F2937]">{symptomStats.medicationRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}

        {filteredSymptoms.length === 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              선택한 기간에 해당 질병의 증상 기록이 없습니다. 질병 관리 탭에서 증상을 기록해주세요.
            </p>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing || filteredSymptoms.length === 0}
          className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              AI 분석 시작
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">분석 오류</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#E5E7EB]">
            <Brain className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-lg font-semibold">분석 결과</h3>
            <span className="text-sm text-[#9CA3AF] ml-auto">
              {format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
            </span>
          </div>

          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-[#1F2937] mt-6 mb-3 flex items-center gap-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-[#1F2937] mt-5 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#7C3AED]" />
                    {children}
                  </h2>
                ),
                p: ({ children }) => (
                  <p className="text-[#4B5563] mb-3 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[#1F2937]">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-[#4B5563]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-[#4B5563]">{children}</ol>
                ),
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>주의:</strong> 이 분석 결과는 AI에 의해 생성된 참고 자료입니다.
              정확한 진단과 치료를 위해서는 반드시 의료 전문가와 상담하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
