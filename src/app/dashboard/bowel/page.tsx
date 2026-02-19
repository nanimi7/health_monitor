'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, BowelRecord } from '@/types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import Calendar from '@/components/Calendar';
import {
  calculateBowelScore,
  getScoreColor,
  getScoreDescription,
  bristolTypes,
  colorOptions,
  amountOptions,
  durationOptions,
  difficultyOptions,
  residualFeelingOptions,
  bloatingOptions,
} from '@/lib/bowelScore';
import { AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react';

export default function BowelPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bowelRecords, setBowelRecords] = useState<BowelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BowelRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [hasBowelMovement, setHasBowelMovement] = useState(true);
  const [bloating, setBloating] = useState<'none' | 'sometimes' | 'yes'>('none');
  const [duration, setDuration] = useState<'1-3' | '3-5' | '5+'>('1-3');
  const [difficulty, setDifficulty] = useState<'easy' | 'little' | 'hard' | 'veryHard'>('easy');
  const [bristolType, setBristolType] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(4);
  const [color, setColor] = useState<'yellow' | 'brown' | 'green' | 'black' | 'red' | 'white'>('brown');
  const [amount, setAmount] = useState<'small' | 'littleMore' | 'normal' | 'much' | 'veryMuch'>('normal');
  const [residualFeeling, setResidualFeeling] = useState<'none' | 'little' | 'much'>('none');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists() || !profileSnap.data().height || !profileSnap.data().birthDate) {
        router.push('/dashboard');
        return;
      }

      setProfile(profileSnap.data() as UserProfile);

      // Load all bowel records
      const bowelRef = collection(db, 'users', user.uid, 'bowel');
      const bowelSnap = await getDocs(bowelRef);
      const records: BowelRecord[] = [];
      bowelSnap.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as BowelRecord);
      });
      setBowelRecords(records);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordedDates = useMemo(() => {
    return new Set(bowelRecords.map(r => r.date));
  }, [bowelRecords]);

  const selectedDateRecords = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return bowelRecords.filter(r => r.date === dateStr);
  }, [selectedDate, bowelRecords]);

  const monthlyScore = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const monthRecords = bowelRecords.filter(r => {
      const date = parseISO(r.date);
      return date >= start && date <= end;
    });
    return calculateBowelScore(monthRecords);
  }, [selectedDate, bowelRecords]);

  const resetForm = () => {
    setHasBowelMovement(true);
    setBloating('none');
    setDuration('1-3');
    setDifficulty('easy');
    setBristolType(4);
    setColor('brown');
    setAmount('normal');
    setResidualFeeling('none');
    setEditingRecord(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddRecord = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditRecord = (record: BowelRecord) => {
    setEditingRecord(record);
    setHasBowelMovement(record.hasBowelMovement);
    setBloating(record.bloating);
    if (record.hasBowelMovement) {
      setDuration(record.duration || '1-3');
      setDifficulty(record.difficulty || 'easy');
      setBristolType(record.bristolType || 4);
      setColor(record.color || 'brown');
      setAmount(record.amount || 'normal');
      setResidualFeeling(record.residualFeeling || 'none');
    }
    setShowModal(true);
  };

  const handleSaveRecord = async () => {
    if (!user) return;

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      const recordData: Omit<BowelRecord, 'id'> = {
        date: dateStr,
        hasBowelMovement,
        bloating,
        ...(hasBowelMovement && {
          duration,
          difficulty,
          bristolType,
          color,
          amount,
          residualFeeling,
        }),
        recordedAt: editingRecord?.recordedAt || new Date(),
        createdAt: editingRecord?.createdAt || new Date(),
      };

      if (editingRecord) {
        const recordRef = doc(db, 'users', user.uid, 'bowel', editingRecord.id);
        await updateDoc(recordRef, recordData);
        setBowelRecords(prev =>
          prev.map(r => r.id === editingRecord.id ? { ...recordData, id: editingRecord.id } : r)
        );
      } else {
        const bowelRef = collection(db, 'users', user.uid, 'bowel');
        const docRef = await addDoc(bowelRef, recordData);
        setBowelRecords(prev => [...prev, { ...recordData, id: docRef.id }]);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bowel', recordId));
      setBowelRecords(prev => prev.filter(r => r.id !== recordId));
      if (editingRecord?.id === recordId) {
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
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
              배변 관리 기능을 사용하려면 기본 정보를 입력해야 합니다.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
              사용자 정보 입력하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#1F2937]">배변 관리</h2>

      {/* Monthly Score */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#6B7280]">
              {format(selectedDate, 'M월', { locale: ko })} 배변 점수
            </p>
            <p className="text-4xl font-bold" style={{ color: getScoreColor(monthlyScore) }}>
              {monthlyScore.toFixed(1)}
              <span className="text-lg text-[#9CA3AF] font-normal"> / 10</span>
            </p>
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: getScoreColor(monthlyScore) }}
          >
            {monthlyScore >= 8 ? '😊' : monthlyScore >= 6 ? '😐' : monthlyScore >= 4 ? '😕' : '😟'}
          </div>
        </div>
        <p className="text-sm text-[#6B7280] mt-4 pt-4 border-t border-[#E5E7EB]">
          {getScoreDescription(monthlyScore)}
        </p>
      </div>

      {/* Calendar */}
      <Calendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        recordedDates={recordedDates}
        renderDayContent={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayRecords = bowelRecords.filter(r => r.date === dateStr);
          if (dayRecords.length > 0) {
            const hasBowel = dayRecords.some(r => r.hasBowelMovement);
            return (
              <span className="text-xs">
                {hasBowel ? '✓' : '✗'}
              </span>
            );
          }
          return null;
        }}
      />

      {/* Selected Date Records */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'M월 d일', { locale: ko })} 기록
          </h3>
          <button onClick={handleAddRecord} className="btn-primary flex items-center gap-1 text-sm py-2">
            <Plus className="w-4 h-4" />
            기록 추가
          </button>
        </div>

        {selectedDateRecords.length === 0 ? (
          <p className="text-[#9CA3AF] text-center py-8">
            이 날짜에 기록된 데이터가 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDateRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={record.hasBowelMovement ? 'text-green-600' : 'text-red-500'}>
                      {record.hasBowelMovement ? '배변 있음' : '배변 없음'}
                    </span>
                    {record.hasBowelMovement && record.bristolType && (
                      <span className="text-sm text-[#6B7280]">
                        {bristolTypes.find(t => t.type === record.bristolType)?.emoji}
                        타입 {record.bristolType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    {format(new Date(record.recordedAt), 'HH:mm', { locale: ko })} 기록
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditRecord(record)}
                    className="p-2 text-[#6B7280] hover:text-[#7C3AED]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="p-2 text-[#6B7280] hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              {editingRecord ? '기록 수정' : '배변 기록'}
            </h3>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {/* 배변 여부 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  배변 여부 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setHasBowelMovement(true)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      hasBowelMovement
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    있음
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasBowelMovement(false)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      !hasBowelMovement
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    없음
                  </button>
                </div>
              </div>

              {/* 복부 팽만감 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  복부 팽만감 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {bloatingOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBloating(option.value)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        bloating === option.value
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasBowelMovement && (
                <>
                  {/* 배변 시간 */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      배변 시간 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {durationOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDuration(option.value)}
                          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                            duration === option.value
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 배변 난이도 */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      배변 난이도 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {difficultyOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDifficulty(option.value)}
                          className={`py-2 rounded-md text-sm font-medium transition-colors ${
                            difficulty === option.value
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bristol Stool Scale */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      배변 형태 (Bristol Scale) <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {bristolTypes.map((type) => (
                        <button
                          key={type.type}
                          type="button"
                          onClick={() => setBristolType(type.type as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                          className={`w-full p-3 rounded-md text-left text-sm transition-colors ${
                            bristolType === type.type
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          <span className="mr-2">{type.emoji}</span>
                          <span className="font-medium">{type.name}</span>
                          <span className="ml-2 opacity-80">{type.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 색상 */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      색상 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {colorOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setColor(option.value)}
                          className={`py-2 rounded-md text-sm font-medium transition-colors ${
                            color === option.value
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 양 */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      양 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {amountOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAmount(option.value)}
                          className={`py-2 rounded-md text-sm font-medium transition-colors ${
                            amount === option.value
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 잔변감 */}
                  <div>
                    <label className="block text-sm font-medium text-[#4B5563] mb-2">
                      잔변감 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {residualFeelingOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setResidualFeeling(option.value)}
                          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                            residualFeeling === option.value
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[#E5E7EB]">
              {editingRecord && (
                <button
                  onClick={() => handleDeleteRecord(editingRecord.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={handleSaveRecord}
                disabled={saving}
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
