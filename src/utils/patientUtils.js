import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Gerar ID único para paciente
export const generatePatientId = () => {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Criar novo paciente
export const createPatient = async (patientData) => {
  try {
    const patientsRef = collection(db, 'patients');
    const newPatient = {
      name: patientData.name,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      exams: {
        ar: {
          uploaded: false,
          url: null,
          uploadedAt: null,
          metadata: null
        },
        tonometry: {
          uploaded: false,
          url: null,
          uploadedAt: null,
          metadata: null
        }
      }
    };
    
    const docRef = await addDoc(patientsRef, newPatient);
    return { id: docRef.id, ...newPatient };
  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    throw error;
  }
};

// Buscar todos os pacientes ativos
export const getActivePatients = async () => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    return patients;
  } catch (error) {
    console.error('Erro ao buscar pacientes ativos:', error);
    throw error;
  }
};

// Buscar pacientes arquivados
export const getArchivedPatients = async () => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where('status', '==', 'archived'),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    return patients;
  } catch (error) {
    console.error('Erro ao buscar pacientes arquivados:', error);
    throw error;
  }
};

// Buscar paciente por ID
export const getPatientById = async (patientId) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);
    
    if (patientSnap.exists()) {
      return { id: patientSnap.id, ...patientSnap.data() };
    } else {
      throw new Error('Paciente não encontrado');
    }
  } catch (error) {
    console.error('Erro ao buscar paciente:', error);
    throw error;
  }
};

// Atualizar dados do paciente
export const updatePatient = async (patientId, updateData) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const dataToUpdate = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(patientRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    throw error;
  }
};

// Arquivar paciente
export const archivePatient = async (patientId) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    await updateDoc(patientRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Erro ao arquivar paciente:', error);
    throw error;
  }
};

// Reativar paciente
export const reactivatePatient = async (patientId) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    await updateDoc(patientRef, {
      status: 'active',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Erro ao reativar paciente:', error);
    throw error;
  }
};

// Deletar paciente permanentemente
export const deletePatient = async (patientId) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    await deleteDoc(patientRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar paciente:', error);
    throw error;
  }
};

// Listener em tempo real para pacientes ativos
export const subscribeToActivePatients = (callback) => {
  const patientsRef = collection(db, 'patients');
  const q = query(
    patientsRef, 
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    callback(patients);
  });
};

// Listener em tempo real para um paciente específico
export const subscribeToPatient = (patientId, callback) => {
  const patientRef = doc(db, 'patients', patientId);
  
  return onSnapshot(patientRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Atualizar status do exame
export const updateExamStatus = async (patientId, examType, examData) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const updatePath = `exams.${examType}`;
    
    await updateDoc(patientRef, {
      [updatePath]: {
        uploaded: true,
        url: examData.url,
        uploadedAt: serverTimestamp(),
        metadata: examData.metadata
      },
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do exame:', error);
    throw error;
  }
};

// Formatar tempo relativo (ex: "há 5 minutos")
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Agora mesmo';
  
  const now = new Date();
  const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `há ${diffInDays} dias`;
};

// Verificar se todos os exames foram enviados
export const hasAllExams = (patient) => {
  return patient.exams?.ar?.uploaded && patient.exams?.tonometry?.uploaded;
};

// Verificar se pelo menos um exame foi enviado
export const hasAnyExam = (patient) => {
  return patient.exams?.ar?.uploaded || patient.exams?.tonometry?.uploaded;
};

