import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
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
export const createPatient = async (patientName, documentId, exams = null, customId = null) => {
  console.log('🔧 [DEBUG] createPatient chamada com:', { patientName, documentId, exams, customId });
  
  try {
    const patientsRef = collection(db, 'patients');
    const newPatient = {
      name: patientName,
      documentId, // Vincular ao documento
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      exams: exams || {
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

    console.log('🔧 [DEBUG] Dados do paciente a serem salvos:', newPatient);

    let docRef;
    if (customId) {
      // Usar ID customizado (para atendimento rápido)
      docRef = doc(patientsRef, customId);
      await setDoc(docRef, newPatient);
      console.log('🔧 [DEBUG] Paciente salvo com ID customizado:', customId);
    } else {
      // Gerar ID automaticamente
      docRef = await addDoc(patientsRef, newPatient);
      console.log('🔧 [DEBUG] Paciente salvo com ID gerado:', docRef.id);
    }
    
    const result = { id: docRef.id, ...newPatient };
    console.log('🔧 [DEBUG] Paciente criado com sucesso:', result);
    return result;
  } catch (error) {
    console.error('❌ [ERROR] Erro ao criar paciente:', error);
    throw error;
  }
};

// Obter todos os pacientes de um documento específico (SEM orderBy para evitar erro de índice)
export const getPatients = async (documentId, status = 'active') => {
  console.log('🔧 [DEBUG] getPatients chamada para documento:', documentId, 'status:', status);
  
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where('documentId', '==', documentId),
      where('status', '==', status)
      // REMOVIDO: orderBy('createdAt', 'desc') - causa erro de índice
    );
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('🔧 [DEBUG] Pacientes encontrados:', patients.length, patients);
    
    // Ordenar no cliente para evitar erro de índice
    patients.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA; // Mais recente primeiro
    });
    
    console.log('🔧 [DEBUG] Pacientes ordenados:', patients);
    return patients;
  } catch (error) {
    console.error('❌ [ERROR] Erro ao buscar pacientes do documento:', error);
    throw error;
  }
};

// Buscar todos os pacientes ativos (SEM orderBy)
export const getActivePatients = async () => {
  console.log('🔧 [DEBUG] getActivePatients chamada');
  
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where('status', '==', 'active')
      // REMOVIDO: orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('🔧 [DEBUG] Pacientes ativos encontrados:', patients.length);
    
    // Ordenar no cliente
    patients.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    
    return patients;
  } catch (error) {
    console.error('❌ [ERROR] Erro ao buscar pacientes ativos:', error);
    throw error;
  }
};

// Buscar pacientes arquivados (SEM orderBy)
export const getArchivedPatients = async () => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where('status', '==', 'archived')
      // REMOVIDO: orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar no cliente
    patients.sort((a, b) => {
      const timeA = a.updatedAt?.toDate?.() || new Date(0);
      const timeB = b.updatedAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    
    return patients;
  } catch (error) {
    console.error('❌ [ERROR] Erro ao buscar pacientes arquivados:', error);
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
    console.error('❌ [ERROR] Erro ao buscar paciente:', error);
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
    console.error('❌ [ERROR] Erro ao atualizar paciente:', error);
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
    console.error('❌ [ERROR] Erro ao arquivar paciente:', error);
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
    console.error('❌ [ERROR] Erro ao reativar paciente:', error);
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
    console.error('❌ [ERROR] Erro ao deletar paciente:', error);
    throw error;
  }
};

// Listener em tempo real para pacientes de um documento específico (SEM orderBy)
export const subscribeToDocumentPatients = (documentId, callback) => {
  console.log('🔧 [DEBUG] subscribeToDocumentPatients iniciado para documento:', documentId);
  
  const patientsRef = collection(db, 'patients');
  const q = query(
    patientsRef, 
    where('documentId', '==', documentId),
    where('status', '==', 'active')
    // REMOVIDO: orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    console.log('🔧 [DEBUG] onSnapshot disparado, documentos encontrados:', querySnapshot.size);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      const patientData = { id: doc.id, ...doc.data() };
      console.log('🔧 [DEBUG] Paciente encontrado:', patientData);
      patients.push(patientData);
    });
    
    // Ordenar no cliente
    patients.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    
    console.log('🔧 [DEBUG] Lista final de pacientes enviada para callback:', patients);
    callback(patients);
  }, (error) => {
    console.error('❌ [ERROR] Erro no listener de pacientes:', error);
  });
};

// Listener em tempo real para pacientes ativos (SEM orderBy)
export const subscribeToActivePatients = (callback) => {
  const patientsRef = collection(db, 'patients');
  const q = query(
    patientsRef, 
    where('status', '==', 'active')
    // REMOVIDO: orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar no cliente
    patients.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
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
    console.error('❌ [ERROR] Erro ao atualizar status do exame:', error);
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

