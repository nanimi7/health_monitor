'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { AlertCircle, Trash2 } from 'lucide-react';

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

  // Chart period
  const [period, setPeriod] = useState<PeriodOption>('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
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
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#1F2937]">체중 관리</h2>

      {/* BMI Card */}
      {bmiInfo && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B7280]">현재 BMI</p>
              <p className="text-3xl font-bold" style={{ color: bmiInfo.color }}>
                {bmiInfo.value.toFixed(1)}
              </p>
              <p className="text-lg font-medium" style={{ color: bmiInfo.color }}>
                {bmiInfo.category}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#6B7280]">최근 체중</p>
              <p className="text-2xl font-bold text-[#1F2937]">
                {latestWeight?.weight}kg
              </p>
              <p className="text-sm text-[#9CA3AF]">
                {latestWeight && format(parseISO(latestWeight.date), 'M월 d일', { locale: ko })}
              </p>
            </div>
          </div>
          <p className="text-sm text-[#6B7280] mt-4 pt-4 border-t border-[#E5E7EB]">
            {bmiInfo.description}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-2">
            * 본 서비스는 의학적 진단이나 치료를 대체하지 않습니다.
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
    </div>
  );
}
