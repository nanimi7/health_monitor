export interface UserProfile {
  email: string;
  birthDate: string;
  gender: 'male' | 'female';
  height: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Disease {
  id: string;
  name: string;
  medication: string;
  createdAt: Date;
}

export interface WeightRecord {
  date: string;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BowelRecord {
  id: string;
  date: string;
  hasBowelMovement: boolean;
  bloating: 'none' | 'sometimes' | 'yes';
  duration?: '1-3' | '3-5' | '5+';
  difficulty?: 'easy' | 'little' | 'hard' | 'veryHard';
  bristolType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  color?: 'yellow' | 'brown' | 'green' | 'black' | 'red' | 'white';
  amount?: 'small' | 'littleMore' | 'normal' | 'much' | 'veryMuch';
  residualFeeling?: 'none' | 'little' | 'much';
  recordedAt: Date;
  createdAt: Date;
}

export interface SymptomRecord {
  id: string;
  date: string;
  diseaseId: string;
  diseaseName: string;
  intensity: number;
  tookMedication: boolean;
  occurredAt?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
