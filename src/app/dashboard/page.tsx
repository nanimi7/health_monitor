'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteUser } from 'firebase/auth';
import { UserProfile, Disease } from '@/types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState('');

  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [diseaseName, setDiseaseName] = useState('');
  const [medication, setMedication] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        setProfile(data);
        setBirthDate(data.birthDate || '');
        setGender(data.gender || 'male');
        setHeight(data.height?.toString() || '');
      }

      const diseasesRef = collection(db, 'users', user.uid, 'diseases');
      const diseasesSnap = await getDocs(diseasesRef);
      const diseasesList: Disease[] = [];
      diseasesSnap.forEach((doc) => {
        diseasesList.push({ id: doc.id, ...doc.data() } as Disease);
      });
      setDiseases(diseasesList);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileData: UserProfile = {
        email: user.email || '',
        birthDate,
        gender,
        height: parseFloat(height) || 0,
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await setDoc(profileRef, profileData);
      setProfile(profileData);
      alert('저장되었습니다.');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisease = async () => {
    if (!user || !diseaseName.trim()) return;

    try {
      if (editingDisease) {
        const diseaseRef = doc(db, 'users', user.uid, 'diseases', editingDisease.id);
        await updateDoc(diseaseRef, { name: diseaseName, medication });
        setDiseases(diseases.map(d =>
          d.id === editingDisease.id ? { ...d, name: diseaseName, medication } : d
        ));
      } else {
        const diseasesRef = collection(db, 'users', user.uid, 'diseases');
        const newDisease = { name: diseaseName, medication, createdAt: new Date() };
        const docRef = await addDoc(diseasesRef, newDisease);
        setDiseases([...diseases, { id: docRef.id, ...newDisease }]);
      }

      setShowDiseaseModal(false);
      setEditingDisease(null);
      setDiseaseName('');
      setMedication('');
    } catch (error) {
      console.error('Error saving disease:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteDisease = async (diseaseId: string) => {
    if (!user) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'diseases', diseaseId));
      setDiseases(diseases.filter(d => d.id !== diseaseId));
    } catch (error) {
      console.error('Error deleting disease:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditDisease = (disease: Disease) => {
    setEditingDisease(disease);
    setDiseaseName(disease.name);
    setMedication(disease.medication);
    setShowDiseaseModal(true);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'profile', 'data'));
      const diseasesRef = collection(db, 'users', user.uid, 'diseases');
      const diseasesSnap = await getDocs(diseasesRef);
      for (const diseaseDoc of diseasesSnap.docs) {
        await deleteDoc(diseaseDoc.ref);
      }
      await deleteUser(user);
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('회원 탈퇴 중 오류가 발생했습니다. 다시 로그인 후 시도해주세요.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1F2937]">사용자 정보</h2>

      {/* 기본 정보 */}
      <div className="card !p-4">
        <h3 className="font-semibold mb-3">기본 정보</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[#6B7280] mb-1">이메일</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-field bg-[#F9FAFB] text-sm py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[#6B7280] mb-1">
              생년월일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input-field text-sm py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[#6B7280] mb-1">
              성별 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  className="w-4 h-4 text-[#7C3AED]"
                />
                <span className="text-sm">남성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  className="w-4 h-4 text-[#7C3AED]"
                />
                <span className="text-sm">여성</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#6B7280] mb-1">
              키 (cm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              className="input-field text-sm py-2"
              min="100"
              max="250"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving || !birthDate || !height}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 보유 질병 */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">보유 질병</h3>
          <button
            onClick={() => {
              setEditingDisease(null);
              setDiseaseName('');
              setMedication('');
              setShowDiseaseModal(true);
            }}
            className="btn-primary flex items-center gap-1 text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>

        {diseases.length === 0 ? (
          <p className="text-[#9CA3AF] text-center py-6 text-sm">
            등록된 질병이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {diseases.map((disease) => (
              <div
                key={disease.id}
                className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{disease.name}</p>
                  {disease.medication && (
                    <p className="text-xs text-[#6B7280]">복용: {disease.medication}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditDisease(disease)}
                    className="p-1.5 text-[#6B7280] hover:text-[#7C3AED]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDisease(disease.id)}
                    className="p-1.5 text-[#6B7280] hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 회원탈퇴 */}
      <div className="text-center pt-2">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-[#9CA3AF] hover:text-[#6B7280]"
        >
          회원탈퇴
        </button>
      </div>

      {/* Disease Modal */}
      {showDiseaseModal && (
        <div className="modal-overlay" onClick={() => setShowDiseaseModal(false)}>
          <div className="modal-content !p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">
              {editingDisease ? '질병 수정' : '질병 추가'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#6B7280] mb-1">
                  질병명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diseaseName}
                  onChange={(e) => setDiseaseName(e.target.value)}
                  placeholder="예: 편두통"
                  className="input-field text-sm py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-[#6B7280] mb-1">복용 약물명</label>
                <input
                  type="text"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  placeholder="예: 타이레놀"
                  className="input-field text-sm py-2"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowDiseaseModal(false)}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSaveDisease}
                disabled={!diseaseName.trim()}
                className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content !p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2 text-red-600">정말 탈퇴하시겠습니까?</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              모든 데이터가 영구적으로 삭제됩니다.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
