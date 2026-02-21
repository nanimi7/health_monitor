'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Disease, SymptomRecord } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Calendar from '@/components/Calendar';
import { intensityLevels, getIntensityColor } from '@/lib/intensity';
import { AlertCircle, Plus, Trash2, Edit2, Pill, Clock } from 'lucide-react';

export default function DiseasePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<SymptomRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [tookMedication, setTookMedication] = useState(false);
  const [occurredTime, setOccurredTime] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load profile
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
        // No diseases registered, redirect to profile
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

  const recordedDates = useMemo(() => {
    return new Set(symptoms.map(s => s.date));
  }, [symptoms]);

  const selectedDateSymptoms = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return symptoms.filter(s => s.date === dateStr);
  }, [selectedDate, symptoms]);

  const resetForm = () => {
    setSelectedDiseaseId(diseases[0]?.id || '');
    setIntensity(5);
    setTookMedication(false);
    setOccurredTime('');
    setDescription('');
    setEditingSymptom(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddSymptom = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditSymptom = (symptom: SymptomRecord) => {
    setEditingSymptom(symptom);
    setSelectedDiseaseId(symptom.diseaseId);
    setIntensity(symptom.intensity);
    setTookMedication(symptom.tookMedication);
    setOccurredTime(symptom.occurredAt ? format(new Date(symptom.occurredAt), 'HH:mm') : '');
    setDescription(symptom.description || '');
    setShowModal(true);
  };

  const handleSaveSymptom = async () => {
    if (!user || !selectedDiseaseId) return;

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const disease = diseases.find(d => d.id === selectedDiseaseId);

    try {
      let occurredAt: Date | undefined;
      if (occurredTime) {
        const [hours, minutes] = occurredTime.split(':').map(Number);
        occurredAt = new Date(selectedDate);
        occurredAt.setHours(hours, minutes, 0, 0);
      }

      const symptomData: Omit<SymptomRecord, 'id'> = {
        date: dateStr,
        diseaseId: selectedDiseaseId,
        diseaseName: disease?.name || '',
        intensity,
        tookMedication,
        occurredAt: occurredAt || (editingSymptom?.occurredAt ? new Date(editingSymptom.occurredAt) : new Date()),
        description: description.trim(),
        createdAt: editingSymptom?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingSymptom) {
        const symptomRef = doc(db, 'users', user.uid, 'symptoms', editingSymptom.id);
        await updateDoc(symptomRef, symptomData);
        setSymptoms(prev =>
          prev.map(s => s.id === editingSymptom.id ? { ...symptomData, id: editingSymptom.id } : s)
        );
      } else {
        const symptomsRef = collection(db, 'users', user.uid, 'symptoms');
        const docRef = await addDoc(symptomsRef, symptomData);
        setSymptoms(prev => [...prev, { ...symptomData, id: docRef.id }]);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving symptom:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSymptom = async (symptomId: string) => {
    if (!user) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'symptoms', symptomId));
      setSymptoms(prev => prev.filter(s => s.id !== symptomId));
      if (editingSymptom?.id === symptomId) {
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting symptom:', error);
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
              질병 관리 기능을 사용하려면 기본 정보를 입력해야 합니다.
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
              질병 관리 기능을 사용하려면 먼저 보유 질병을 등록해야 합니다.
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
      <h2 className="text-2xl font-bold text-[#1F2937]">질병 관리</h2>

      {/* Disease Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {diseases.map((disease) => {
          const diseaseSymptoms = symptoms.filter(s => s.diseaseId === disease.id);
          const recentSymptoms = diseaseSymptoms.slice(-7);
          const avgIntensity = recentSymptoms.length > 0
            ? recentSymptoms.reduce((sum, s) => sum + s.intensity, 0) / recentSymptoms.length
            : 0;

          return (
            <div key={disease.id} className="card">
              <h3 className="font-semibold text-lg">{disease.name}</h3>
              {disease.medication && (
                <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-1">
                  <Pill className="w-4 h-4" />
                  {disease.medication}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">최근 7일 기록</span>
                  <span className="font-medium">{recentSymptoms.length}건</span>
                </div>
                {recentSymptoms.length > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#6B7280]">평균 강도</span>
                    <span
                      className="font-medium"
                      style={{ color: getIntensityColor(Math.round(avgIntensity)) }}
                    >
                      {avgIntensity.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar */}
      <Calendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        recordedDates={recordedDates}
        renderDayContent={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const daySymptoms = symptoms.filter(s => s.date === dateStr);
          if (daySymptoms.length > 0) {
            const maxIntensity = Math.max(...daySymptoms.map(s => s.intensity));
            return (
              <div
                className="w-2 h-2 rounded-full mx-auto"
                style={{ backgroundColor: getIntensityColor(maxIntensity) }}
              />
            );
          }
          return null;
        }}
      />

      {/* Selected Date Records */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'M월 d일', { locale: ko })} 증상 기록
          </h3>
          <button onClick={handleAddSymptom} className="btn-primary flex items-center gap-1 text-sm py-2">
            <Plus className="w-4 h-4" />
            증상 추가
          </button>
        </div>

        {selectedDateSymptoms.length === 0 ? (
          <p className="text-[#9CA3AF] text-center py-8">
            이 날짜에 기록된 증상이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDateSymptoms.map((symptom) => (
              <div
                key={symptom.id}
                className="p-4 bg-[#F9FAFB] rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{symptom.diseaseName}</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs text-white font-medium"
                        style={{ backgroundColor: getIntensityColor(symptom.intensity) }}
                      >
                        강도 {symptom.intensity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {symptom.occurredAt && format(new Date(symptom.occurredAt), 'HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5" />
                        {symptom.tookMedication ? '복용' : '미복용'}
                      </span>
                    </div>
                    {symptom.description && (
                      <p className="mt-2 text-sm text-[#4B5563]">{symptom.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditSymptom(symptom)}
                      className="p-2 text-[#6B7280] hover:text-[#7C3AED]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSymptom(symptom.id)}
                      className="p-2 text-[#6B7280] hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symptom Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              {editingSymptom ? '증상 수정' : '증상 추가'}
            </h3>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {/* 질병 선택 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  질병 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDiseaseId}
                  onChange={(e) => setSelectedDiseaseId(e.target.value)}
                  className="input-field"
                >
                  {diseases.map((disease) => (
                    <option key={disease.id} value={disease.id}>
                      {disease.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 발생 강도 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  발생 강도 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {intensityLevels.map((level) => (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => setIntensity(level.level)}
                      className={`w-full p-3 rounded-md text-left text-sm transition-colors flex items-center justify-between ${
                        intensity === level.level
                          ? 'ring-2 ring-[#7C3AED]'
                          : 'hover:bg-[#F9FAFB]'
                      }`}
                      style={{
                        backgroundColor: intensity === level.level ? `${level.color}20` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: level.color }}
                        >
                          {level.level}
                        </div>
                        <span className="font-medium">{level.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 약물 복용 여부 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  약물 복용 여부 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTookMedication(true)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      tookMedication
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    복용
                  </button>
                  <button
                    type="button"
                    onClick={() => setTookMedication(false)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      !tookMedication
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    미복용
                  </button>
                </div>
              </div>

              {/* 질병 발생 시각 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  질병 발생 시각 <span className="text-[#9CA3AF]">(선택)</span>
                </label>
                <input
                  type="time"
                  value={occurredTime}
                  onChange={(e) => setOccurredTime(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* 상세 설명 */}
              <div>
                <label className="block text-sm font-medium text-[#4B5563] mb-2">
                  상세 설명 <span className="text-[#9CA3AF]">(선택, 최대 500자)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="증상에 대해 자세히 설명해주세요..."
                  className="input-field min-h-[100px] resize-none"
                  rows={4}
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {description.length}/500자 · 작성하신 내용은 AI 분석 시 참고 자료로 활용됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[#E5E7EB]">
              {editingSymptom && (
                <button
                  onClick={() => handleDeleteSymptom(editingSymptom.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={handleSaveSymptom}
                disabled={!selectedDiseaseId || saving}
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
