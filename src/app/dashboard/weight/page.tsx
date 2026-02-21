'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, WeightRecord } from '@/types';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import Calendar from '@/components/Calendar';
import WeightChart from '@/components/WeightChart';
import { calculateBMI, getBMICategory } from '@/lib/bmi';
import { AlertCircle, Trash2, HelpCircle, X } from 'lucide-react';

type PeriodOption = '7' | '30' | '60' | 'custom';

export default function WeightPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBmiInfo, setShowBmiInfo] = useState(false);

  // Chart period
  const [period, setPeriod] = useState<PeriodOption>('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load profile
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists() || !profileSnap.data().height || !profileSnap.data().birthDate) {
        // Redirect to profile page if profile is incomplete
        router.push('/dashboard');
        return;
      }

      setProfile(profileSnap.data() as UserProfile);

      // Load weight records
      const weightRef = collection(db, 'users', user.uid, 'weight');
      const weightSnap = await getDocs(weightRef);
      const records: WeightRecord[] = [];
      weightSnap.forEach((doc) => {
        records.push({ date: doc.id, ...doc.data() } as WeightRecord);
      });
      setWeightRecords(records);
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

  const recordedDates = useMemo(() => {
    return new Set(weightRecords.map(r => r.date));
  }, [weightRecords]);

  const selectedRecord = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return weightRecords.find(r => r.date === dateStr);
  }, [selectedDate, weightRecords]);

  const latestWeight = useMemo(() => {
    if (weightRecords.length === 0) return null;
    const sorted = [...weightRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0];
  }, [weightRecords]);

  const bmiInfo = useMemo(() => {
    if (!latestWeight || !profile) return null;
    const bmi = calculateBMI(latestWeight.weight, profile.height);
    return {
      value: bmi,
      ...getBMICategory(bmi),
    };
  }, [latestWeight, profile]);

  const chartData = useMemo(() => {
    let filteredRecords = weightRecords;

    if (period === 'custom' && customStartDate && customEndDate) {
      filteredRecords = weightRecords.filter(r => {
        const date = parseISO(r.date);
        return !isBefore(date, parseISO(customStartDate)) && !isAfter(date, parseISO(customEndDate));
      });
    } else {
      const days = parseInt(period);
      const startDate = subDays(new Date(), days);
      filteredRecords = weightRecords.filter(r => {
        return !isBefore(parseISO(r.date), startDate);
      });
    }

    return filteredRecords.map(r => ({
      date: r.date,
      weight: r.weight,
    }));
  }, [weightRecords, period, customStartDate, customEndDate]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = weightRecords.find(r => r.date === dateStr);
    setWeight(record?.weight?.toString() || '');
    setShowModal(true);
  };

  const handleSaveWeight = async () => {
    if (!user || !weight) return;

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      const weightRef = doc(db, 'users', user.uid, 'weight', dateStr);
      const weightData: Omit<WeightRecord, 'date'> = {
        weight: parseFloat(weight),
        createdAt: selectedRecord?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await setDoc(weightRef, weightData);

      // Update local state
      setWeightRecords(prev => {
        const existing = prev.find(r => r.date === dateStr);
        if (existing) {
          return prev.map(r => r.date === dateStr ? { ...r, ...weightData } : r);
        }
        return [...prev, { date: dateStr, ...weightData }];
      });

      setShowModal(false);
      setWeight('');
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeight = async () => {
    if (!user || !selectedRecord) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await deleteDoc(doc(db, 'users', user.uid, 'weight', dateStr));
      setWeightRecords(prev => prev.filter(r => r.date !== dateStr));
      setShowModal(false);
      setWeight('');
    } catch (error) {
      console.error('Error deleting weight:', error);
      alert('삭제 중 오류가 발생했습니다.');
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
              체중 관리 기능을 사용하려면 기본 정보(생년월일, 성별, 키)를 입력해야 합니다.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary mt-4"
            >
              사용자 정보 입력하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-[#1F2937]">체중 관리</h2>

      {/* BMI Card */}
      {bmiInfo && (
        <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
          {/* Header with icon */}
          <div className="flex items-center gap-2 mb-3">
            {/* Color bar icon */}
            <div className="flex items-end gap-0.5 h-5">
              <div className="w-1.5 h-3 bg-[#3B82F6] rounded-sm"></div>
              <div className="w-1.5 h-4 bg-[#22C55E] rounded-sm"></div>
              <div className="w-1.5 h-5 bg-[#EF4444] rounded-sm"></div>
            </div>
            <h3 className="text-base font-bold text-[#1F2937]">
              {format(new Date(), 'M')}월 체중 현황
            </h3>
            <button
              onClick={() => setShowBmiInfo(true)}
              className="text-[#9CA3AF] hover:text-[#7C3AED] transition-colors ml-auto"
              aria-label="BMI 정보 보기"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* BMI & Weight Display */}
          <div className="flex items-center gap-6 mb-3">
            <div>
              <p className="text-xs text-[#6B7280] mb-0.5">현재 BMI</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: bmiInfo.color }}>{bmiInfo.value.toFixed(1)}</span>
                <span className="text-sm font-medium" style={{ color: bmiInfo.color }}>{bmiInfo.category}</span>
              </div>
            </div>
            <div className="w-px h-10 bg-[#E5E7EB]"></div>
            <div>
              <p className="text-xs text-[#6B7280] mb-0.5">최근 체중</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1F2937]">{latestWeight?.weight}</span>
                <span className="text-sm text-[#6B7280]">kg</span>
                {latestWeight && <span className="text-xs text-[#9CA3AF] ml-1">({format(parseISO(latestWeight.date), 'M/d', { locale: ko })})</span>}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#6B7280]">
            {bmiInfo.description}
          </p>

          {/* Disclaimer */}
          <p className="text-xs text-[#9CA3AF] mt-3 pt-3 border-t border-[#F3F4F6]">
            * 대한비만학회 기준. 의료 진단이 아니며 건강 관련 결정 시 전문가 상담 권장.
          </p>
        </div>
      )}

      {/* Calendar */}
      <Calendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        recordedDates={recordedDates}
        renderDayContent={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const record = weightRecords.find(r => r.date === dateStr);
          if (record) {
            return (
              <span className="text-xs text-[#7C3AED] font-medium">
                {record.weight}kg
              </span>
            );
          }
          return null;
        }}
      />

      {/* Chart Period Selector */}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['7', '30', '60'] as PeriodOption[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              {p}일
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'custom'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
            }`}
          >
            기간 설정
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">시작일</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">종료일</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Weight Chart */}
      <WeightChart data={chartData} />

      {/* Weight Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              {format(selectedDate, 'M월 d일', { locale: ko })} 체중 기록
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-1">
                  체중 (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="65.5"
                  className="input-field"
                  step="0.1"
                  min="20"
                  max="300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedRecord && (
                <button
                  onClick={handleDeleteWeight}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleSaveWeight}
                disabled={!weight || saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BMI Info Bottom Sheet */}
      {showBmiInfo && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowBmiInfo(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-t-2xl p-4 pb-16 animate-slide-up max-h-[80vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 bg-[#D1D5DB] rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F2937]">BMI란?</h3>
              <button
                onClick={() => setShowBmiInfo(false)}
                className="p-1 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 text-sm text-[#4B5563]">
              <div>
                <h4 className="font-semibold text-[#1F2937] mb-1">BMI (체질량지수)</h4>
                <p>
                  BMI(Body Mass Index)는 체중(kg)을 키(m)의 제곱으로 나눈 값으로,
                  비만도를 판정하는 국제적인 기준입니다.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[#1F2937] mb-1">계산 방법</h4>
                <div className="bg-[#F9FAFB] rounded-lg p-3">
                  <p className="font-mono text-center">BMI = 체중(kg) ÷ 키(m)²</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#1F2937] mb-2">BMI 분류 기준 (대한비만학회)</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#DBEAFE] rounded">
                    <span>저체중</span>
                    <span className="font-medium">18.5 미만</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#D1FAE5] rounded">
                    <span>정상</span>
                    <span className="font-medium">18.5 ~ 22.9</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#FEF3C7] rounded">
                    <span>과체중</span>
                    <span className="font-medium">23 ~ 24.9</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#FED7AA] rounded">
                    <span>비만 (1단계)</span>
                    <span className="font-medium">25 ~ 29.9</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#FECACA] rounded">
                    <span>비만 (2단계)</span>
                    <span className="font-medium">30 ~ 34.9</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-[#FCA5A5] rounded">
                    <span>비만 (3단계)</span>
                    <span className="font-medium">35 이상</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#1F2937] mb-1">참고사항</h4>
                <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                  <li>BMI는 근육량, 체지방률 등을 반영하지 않습니다</li>
                  <li>운동선수나 근육량이 많은 분은 BMI가 높게 나올 수 있습니다</li>
                  <li>노인, 임산부, 성장기 청소년에게는 다른 기준이 적용될 수 있습니다</li>
                </ul>
              </div>

              {/* 면책문구 */}
              <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  ⚠️ 면책조항: 본 서비스에서 제공하는 BMI 정보는 일반적인 건강 정보 제공 목적으로만
                  사용되며, 의학적 진단이나 치료를 대체할 수 없습니다. 건강에 관한 결정을 내리기 전에
                  반드시 의료 전문가와 상담하시기 바랍니다. 본 서비스는 제공된 정보의 정확성, 완전성,
                  유용성에 대해 어떠한 보증도 하지 않으며, 이 정보의 사용으로 인해 발생하는 어떠한
                  손해에 대해서도 책임을 지지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
