'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, collection, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProfileSelector from '@/components/common/ProfileSelector';
import PatientSelector from '@/components/doctor/PatientSelector';
import PatientCreationForm from '@/components/assistant/PatientCreationForm';
import ExamViewer from '@/components/doctor/ExamViewer';
import { getPatients, subscribeToDocumentPatients, archivePatient, createPatient } from '@/utils/patientUtils';
import PatientCard from '@/components/patient/PatientCard';
import ArchivedPatients from '@/components/common/ArchivedPatients';
import { generatePrescriptionPDF } from '@/utils/pdfGenerator';
import AlertModal from '@/components/common/AlertModal';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 10)];
  }
  return color;
};

const initialEyeData = {
  esf: '0.00',
  cil: '0.00',
  eixo: '0',
};

const initialDocumentData = {
  rightEye: { ...initialEyeData },
  leftEye: { ...initialEyeData },
  addition: {
    active: false,
    value: '+0.75',
  },
  annotations: '', 
};

const generateOptions = (start, end, step, formatFixed = 2) => {
  const options = [];
  if (step === 0) return options;
  const scale = Math.pow(10, formatFixed);
  const scaledStart = Math.round(start * scale);
  const scaledEnd = Math.round(end * scale);
  const scaledStep = Math.round(step * scale);
  if (scaledStep > 0) {
    for (let i = scaledStart; i <= scaledEnd; i += scaledStep) {
      const currentValue = i / scale;
      const value = formatFixed > 0 ? currentValue.toFixed(formatFixed) : currentValue.toString();
      const displayValue = (currentValue > 0 && formatFixed > 0 && value !== '0.00') ? `+${value}` : value;
      options.push({ value: value, label: displayValue });
    }
  }
  return options;
};

const esfOptions = generateOptions(-30, 30, 0.25, 2);
const cilOptions = generateOptions(-10, 0, 0.25, 2);
const eixoOptions = generateOptions(0, 180, 5, 0);
const additionOptions = generateOptions(0.75, 4, 0.25, 2);

const EyeForm = ({ eyeLabel, eyeData, eyeKey, onFieldChange, colorClass }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg border-t-4 ${colorClass}`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">{eyeLabel}</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={`${eyeKey}-esf`} className="block text-sm font-medium text-gray-700 mb-1">Esférico (ESF)</label>
          <select
            id={`${eyeKey}-esf`}
            name="esf"
            value={eyeData.esf}
            onChange={(e) => onFieldChange(`${eyeKey}.esf`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-3 text-base rounded-md shadow-sm text-black focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {esfOptions.map(option => (
              <option key={`${eyeKey}-esf-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${eyeKey}-cil`} className="block text-sm font-medium text-gray-700 mb-1">Cilindro (CIL)</label>
          <select
            id={`${eyeKey}-cil`}
            name="cil"
            value={eyeData.cil}
            onChange={(e) => onFieldChange(`${eyeKey}.cil`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-3 text-base rounded-md shadow-sm text-black focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {cilOptions.map(option => (
              <option key={`${eyeKey}-cil-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${eyeKey}-eixo`} className="block text-sm font-medium text-gray-700 mb-1">Eixo</label>
          <select
            id={`${eyeKey}-eixo`}
            name="eixo"
            value={eyeData.eixo}
            onChange={(e) => onFieldChange(`${eyeKey}.eixo`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-3 text-base rounded-md shadow-sm text-black focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {eixoOptions.map(option => (
              <option key={`${eyeKey}-eixo-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default function DocumentPage() {
  const { docId } = useParams();
  const router = useRouter();
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [userId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('');
  const [userProfile, setUserProfile] = useState(null); // 'doctor' ou 'assistant'
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showArchivedPatients, setShowArchivedPatients] = useState(false);
  
  const presenceRef = useRef(null);

  // Listener do subdocumento do paciente selecionado
  const patientUnsubRef = useRef(null);

  const presenceIntervalRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // --- Avisos (broadcasts/legacy) ---
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastPatientId, setBroadcastPatientId] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Carregar pacientes do documento com listener em tempo real
  useEffect(() => {
    if (!docId) return;
    const unsubscribe = subscribeToDocumentPatients(docId, (patientsList) => {
      setPatients(patientsList);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [docId]);

  useEffect(() => {
    let localUserName = localStorage.getItem('collab_user_name');
    let localUserColor = localStorage.getItem('collab_user_color');
    if (!localUserName) {
      localUserName = `Usuário ${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('collab_user_name', localUserName);
    }
    setUserName(localUserName);
    if (!localUserColor) {
      localUserColor = getRandomColor();
      localStorage.setItem('collab_user_color', localUserColor);
    }
    setUserColor(localUserColor);
  }, []);

  useEffect(() => {
    if (!docId || !userId || !userName || !userColor) return;
    const docRef = doc(db, 'documents', docId);
    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentData = {
          rightEye: data.rightEye || { ...initialDocumentData.rightEye },
          leftEye: data.leftEye || { ...initialDocumentData.leftEye },
          addition: data.addition
            ? { active: typeof data.addition.active === 'boolean' ? data.addition.active : initialDocumentData.addition.active, value: data.addition.value || initialDocumentData.addition.value }
            : { ...initialDocumentData.addition },
          annotations: typeof data.annotations === 'string' ? data.annotations : initialDocumentData.annotations, 
        };
        if (!selectedPatient) {
          setDocumentData(currentData);
        }

        // Sincronizar seleção de paciente entre usuários
        if (data.selectedPatientId && data.selectedBy !== userName) {
          if (data.selectedPatientId !== selectedPatient?.id) {
            const syncPatient = {
              id: data.selectedPatientId,
              name: data.selectedPatientName || 'Paciente Selecionado',
            };
            setSelectedPatient(syncPatient);
          }
        } else if (!data.selectedPatientId && selectedPatient) {
          setSelectedPatient(null);
        }
      } else {
        setDoc(docRef, initialDocumentData).then(() => {
          setDocumentData(initialDocumentData);
        }).catch(error => console.error("Erro ao criar novo documento: ", error));
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar documento:", error);
      setLoading(false);
    });

    presenceRef.current = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = async () => {
      if (presenceRef.current) {
        try {
          await setDoc(presenceRef.current, { name: userName, color: userColor, lastSeen: serverTimestamp() }, { merge: true });
        } catch (e) { console.error("Erro ao atualizar presença: ", e); }
      }
    };
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 15000);

    const usersCollectionRef = collection(db, 'documents', docId, 'activeUsers');
    const cleanupInactiveUsers = async () => {
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      const q = query(usersCollectionRef, where('lastSeen', '<', sixtySecondsAgo));
      const inactiveSnapshot = await getDocs(q);
      inactiveSnapshot.forEach(async (userDoc) => {
        await deleteDoc(userDoc.ref);
      });
    };
    const cleanupInterval = setInterval(cleanupInactiveUsers, 30000);

    const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveUsers(users);
    });

    return () => {
      unsubscribeDoc();
      unsubscribeUsers();
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      clearInterval(cleanupInterval);
      if (presenceRef.current) {
        deleteDoc(presenceRef.current).catch(e => console.error("Erro ao limpar presença: ", e));
      }
    };
  }, [docId, userId, userName, userColor, selectedPatient]);

  // Listener do alerta (broadcast) deste documento (lido pelo Legacy)
  useEffect(() => {
    if (!docId) return;
    const ref = doc(db, 'broadcasts', docId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const active = !!(data && data.active);
      setBroadcastActive(active);
      setBroadcastPatientId(data?.patientId || null);
      setBroadcastMessage(data?.message || '');
    }, (err) => {
      console.error('Erro no listener de broadcast:', err);
    });
    return () => unsub && unsub();
  }, [docId]);

  const updateDocInFirestore = async (updates) => {
    if (!docId) return;
    const keys = Object.keys(updates || {});
    const touchesPatient = !!selectedPatient && keys.some((k) => (
      k === 'rightEye' || k.startsWith('rightEye.') ||
      k === 'leftEye'  || k.startsWith('leftEye.')  ||
      k === 'addition' || k.startsWith('addition.') ||
      k === 'annotations'
    ));

    if (touchesPatient) {
      const patientDocRef = doc(db, 'documents', docId, 'patients', selectedPatient.id);
      try {
        await updateDoc(patientDocRef, updates);
      } catch (error) {
        try {
          await setDoc(
            patientDocRef,
            {
              patientId: selectedPatient.id,
              patientName: selectedPatient.name || '',
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          await updateDoc(patientDocRef, updates);
        } catch (createError) {
          console.error('Erro ao inicializar/atualizar subdocumento do paciente:', createError);
        }
      }
    } else {
      const docRef = doc(db, 'documents', docId);
      try {
        await updateDoc(docRef, updates);
      } catch (error) {
        console.error('Erro ao atualizar documento raiz:', error);
      }
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setDocumentData(prevData => {
      const newData = { ...prevData };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    if (path === 'annotations') { 
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        updateDocInFirestore({ [path]: value });
      }, 500); 
    } else {
      updateDocInFirestore({ [path]: value });
    }
  };

  const handleAdditionToggle = () => {
    if (!documentData || typeof documentData.addition === 'undefined') return;
    const newActiveState = !documentData.addition.active;
    updateField('addition.active', newActiveState);
  };

  const handleReset = async () => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);
    try { await setDoc(docRef, initialDocumentData); setDocumentData(initialDocumentData); }
    catch (error) { console.error("Erro ao resetar documento:", error); }
  };

  const formatEsfericoForCopy = (esfValue) => {
    const num = parseFloat(esfValue);
    if (isNaN(num)) return esfValue; 
    if (num > 0) return `+${esfValue}`;
    return esfValue;
  };

  const handleCopy = async () => {
    if (!documentData) return;
    const { rightEye, leftEye, addition } = documentData;

    let additionValueText = '';
    if (addition.active && addition.value) {
      const val = addition.value.toString();
      additionValueText = val.startsWith('+') ? val : `+${val}`;
    }

    const rightEsfFormatted = formatEsfericoForCopy(rightEye.esf);
    const leftEsfFormatted = formatEsfericoForCopy(leftEye.esf);

    const tableRows = [
      ['', 'ESF', 'CIL', 'Eixo'],
      ['Olho Direito', rightEsfFormatted, rightEye.cil, rightEye.eixo],
      ['Olho Esquerdo', leftEsfFormatted, leftEye.cil, leftEye.eixo],
      [addition.active ? 'Para perto' : '', addition.active ? `Adição ${additionValueText} (AO)` : '', '', '']
    ];

    let htmlTable = '<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt;"><tbody>';
    tableRows.forEach((row, rowIndex) => {
      htmlTable += '<tr>';
      row.forEach((cell, cellIndex) => {
        const isHeader = rowIndex === 0;
        const cellWidth = cellIndex === 0 ? '120px' : '80px';
        const cellAlign = cellIndex === 0 ? 'left' : 'center';
        const cellStyle = `border: 1px solid black; padding: 4px; width: ${cellWidth}; text-align: ${cellAlign}; ${isHeader ? 'font-weight: bold; background-color: #f0f0f0;' : ''}`;
        const tag = isHeader ? 'th' : 'td';
        htmlTable += `<${tag} style="${cellStyle}">${cell}</${tag}>`;
      });
      htmlTable += '</tr>';
    });
    htmlTable += '</tbody></table>';

    const tsvData = tableRows.map(row => row.join('\t')).join('\n');

    try {
      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
      const blobText = new Blob([tsvData], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText });
      await navigator.clipboard.write([clipboardItem]);
      setCopyStatus('Copiado!');
    } catch (err) {
      console.error('Falha ao copiar: ', err);
      try {
        await navigator.clipboard.writeText(tsvData);
        setCopyStatus('Copiado como texto simples!');
      } catch (fallbackErr) {
        console.error('Falha ao copiar como texto simples: ', fallbackErr);
        setCopyStatus('Falha ao copiar.');
      }
    }
    setTimeout(() => setCopyStatus(''), 3000);
  };

  const handleProfileSelect = (profile) => {
    setUserProfile(profile);
  };

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);

    if (patientUnsubRef.current) {
      patientUnsubRef.current();
      patientUnsubRef.current = null;
    }

    if (patient && patient.id) {
      const patientDocRef = doc(db, 'documents', docId, 'patients', patient.id);
      patientUnsubRef.current = onSnapshot(patientDocRef, (snap) => {
        if (snap.exists()) {
          const patientData = snap.data();
          setDocumentData({
            rightEye: patientData.rightEye || initialDocumentData.rightEye,
            leftEye: patientData.leftEye || initialDocumentData.leftEye,
            addition: patientData.addition || initialDocumentData.addition,
            annotations: typeof patientData.annotations === 'string'
              ? patientData.annotations
              : initialDocumentData.annotations,
          });
        } else {
          setDocumentData(initialDocumentData);
        }
      }, (err) => {
        console.error('Erro no listener do paciente:', err);
      });

      await updateDocInFirestore({
        selectedPatientId: patient.id,
        selectedPatientName: patient.name || '',
        selectedBy: userName,
        selectedAt: serverTimestamp(),
      });
    }
  };

  const handleBackToPatients = async () => {
    if (patientUnsubRef.current) { patientUnsubRef.current(); patientUnsubRef.current = null; }
    setSelectedPatient(null);
    try {
      await updateDocInFirestore({
        selectedPatientId: null,
        selectedPatientName: null,
        selectedBy: null,
        selectedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao limpar seleção de paciente:', error);
    }
  };

  const handleBackToProfile = () => {
    setUserProfile(null);
    setSelectedPatient(null);
    setShowPatientForm(false);
  };

  const handlePatientCreated = () => {
    setShowPatientForm(false);
  };

  const handleArchivePatient = async (patientId) => {
    try {
      await archivePatient(patientId);
      if (selectedPatient?.id === patientId) {
        await updateDocInFirestore({
          selectedPatientId: null,
          selectedPatientName: null,
          selectedBy: null,
          selectedAt: serverTimestamp(),
        });
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Erro ao arquivar paciente:', error);
      alert('Erro ao arquivar paciente');
    }
  };

  const handleQuickCare = async () => {
    try {
      const randomNumber = Math.floor(Math.random() * 100000);
      const quickPatientName = `Paciente #${randomNumber}`;
      const quickPatient = {
        id: `quick_${Date.now()}_${randomNumber}`,
        name: quickPatientName,
        status: 'active',
        createdAt: new Date(),
        documentId: docId,
        isQuickCare: true,
        exams: { ar: null, tonometry: null }
      };
      try {
        await createPatient(quickPatient.name, docId, quickPatient.exams, quickPatient.id);
      } catch (error) {
        console.error('Erro ao salvar paciente no Firestore:', error);
      }
      await handlePatientSelect(quickPatient);
    } catch (error) {
      console.error('Erro ao iniciar atendimento rápido:', error);
      alert('Erro ao iniciar atendimento rápido');
    }
  };

  const handleGeneratePrescription = () => {
    try {
      if (!selectedPatient) {
        alert('Nenhum paciente selecionado');
        return;
      }
      const fileName = generatePrescriptionPDF(selectedPatient, documentData);
      alert(`Receita gerada com sucesso: ${fileName}`);
    } catch (error) {
      console.error('Erro ao gerar receita:', error);
      alert('Erro ao gerar receita. Tente novamente.');
    }
  };

  // --- Avisos: enviar e finalizar ---
  const handleSendAlert = async ({ patientName, message }) => {
    try {
      if (!docId) return;
      if (!selectedPatient) {
        alert('Nenhum paciente selecionado.');
        return;
      }
      const color = '#ef4444'; // vermelho, combina com legacy
      await setDoc(
        doc(db, 'broadcasts', docId),
        {
          active: true,
          message: (message || '').trim(),
          color,
          emittedByName: userName || 'Médico',
          emittedByDocId: docId,
          patientId: selectedPatient.id,
          patientName: (patientName || selectedPatient.name || '').trim(),
          updatedAt: serverTimestamp(),
          startedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Erro ao enviar aviso:', e);
      alert('Falha ao enviar aviso.');
    }
  };

  const handleFinishAlert = async () => {
    try {
      if (!docId) return;
      await setDoc(
        doc(db, 'broadcasts', docId),
        { active: false, updatedAt: serverTimestamp(), endedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('Erro ao finalizar aviso:', e);
      alert('Falha ao finalizar aviso.');
    }
  };

  const renderArchivedModal = () => {
    if (!showArchivedPatients) return null;
    return (
      <ArchivedPatients
        documentId={docId}
        onClose={() => setShowArchivedPatients(false)}
      />
    );
  };

  if (loading || !documentData) {
    return (
      <>
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando documento...</p>
          </div>
        </div>
        {renderArchivedModal()}
      </>
    );
  }

  if (!docId) {
    return (
      <>
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <p className="text-red-600 text-lg">ID do documento não fornecido.</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
        {renderArchivedModal()}
      </>
    );
  }

  if (!userProfile) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto p-4">
            <div className="text-center mb-8 pt-8">
              <h1 className="text-4xl font-bold mb-2 text-gray-800">Eyenote</h1>
              <p className="text-gray-600">Documento: {docId}</p>
              <p className="text-sm text-gray-500 mt-2">
                Usuário: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
              </p>
            </div>
            <ProfileSelector 
              onProfileSelect={handleProfileSelect} 
              documentId={docId}
              userName={userName}
              userColor={userColor}
            />
          </div>
        </div>
        {renderArchivedModal()}
      </>
    );
  }

  if (userProfile === 'assistant') {
    if (showPatientForm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowPatientForm(false)}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Criar Paciente</h1>
                <p className="text-sm text-gray-600">Documento: {docId}</p>
              </div>
              <div></div>
            </div>
            <PatientCreationForm 
              documentId={docId} 
              onPatientCreated={handlePatientCreated}
            />
          </div>
          {renderArchivedModal()}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToProfile}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Trocar Perfil
            </button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">Assistente</h1>
              <p className="text-gray-600">Documento: {docId}</p>
              <p className="text-sm text-gray-500">
                Usuário: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
              </p>
            </div>
            <button
              onClick={() => setShowPatientForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Criar Paciente
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Pacientes Ativos</h2>
              <button
                onClick={() => setShowArchivedPatients(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Ver Arquivados
              </button>
            </div>
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Nenhum paciente criado ainda</p>
                <button
                  onClick={() => setShowPatientForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  Criar Primeiro Paciente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onArchive={handleArchivePatient}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Usuários Ativos ({activeUsers.length})</h2>
            <div className="flex flex-wrap gap-2">
              {activeUsers.map(user => (
                <div key={user.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: user.color || 'gray' }}
                  ></span>
                  <span className="text-sm font-medium" style={{ color: user.color || 'black' }}>
                    {user.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderArchivedModal()}
      </div>
    );
  }

  // Interface do Médico
  if (userProfile === 'doctor') {
    if (!selectedPatient) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToProfile}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Trocar Perfil
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">Médico</h1>
                <p className="text-gray-600">Documento: {docId}</p>
                <p className="text-sm text-gray-500">
                  Usuário: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowArchivedPatients(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Ver Arquivados
                </button>
                <button
                  onClick={handleQuickCare}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Atendimento Rápido
                </button>
              </div>
            </div>
            <PatientSelector 
              documentId={docId}
              selectedPatient={selectedPatient}
              onPatientSelect={handlePatientSelect}
              onArchive={handleArchivePatient}
            />
          </div>
          {renderArchivedModal()}
        </div>
      );
    }

    // Interface integrada: Receita + Exames
    return (
      <div className="container mx-auto p-4 flex flex-col min-h-screen bg-gray-100">
        <header className="mb-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToPatients}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Voltar para lista de pacientes"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">EyeNote</h1>
                <p className="text-sm text-gray-600">
                  Paciente: <span className="font-semibold">{selectedPatient.name}</span>
                  {selectedPatient.isQuickCare && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Atendimento Rápido
                    </span>
                  )} | 
                  Documento: {docId} | 
                  Editando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
            </div>

            {/* Ações do cabeçalho (lado direito): Arquivados / Rápido / Aviso */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchivedPatients(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Ver Arquivados
              </button>
              <button
                onClick={handleQuickCare}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Rápido
              </button>

              {/* Botão AVISO + estado atual */}
              <button
                onClick={() => setShowAlertModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
                title="Emitir aviso para o Legacy"
              >
                Aviso
              </button>

              {broadcastActive && (
                <>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Aviso ativo
                  </span>
                  <button
                    onClick={handleFinishAlert}
                    className="text-red-700 hover:text-red-900 text-sm underline"
                    title="Finalizar aviso"
                  >
                    Finalizar
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-grow flex-col lg:flex-row gap-6">
          <main className="flex-grow lg:w-[62%]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EyeForm 
                eyeLabel="Olho Direito (OD)" 
                eyeData={documentData.rightEye} 
                eyeKey="rightEye" 
                onFieldChange={updateField} 
                colorClass="border-blue-500"
              />
              <EyeForm 
                eyeLabel="Olho Esquerdo (OE)" 
                eyeData={documentData.leftEye} 
                eyeKey="leftEye" 
                onFieldChange={updateField} 
                colorClass="border-green-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Seção de Adição */}
              <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Adição</h2>
                <div className="flex items-center mb-4">
                  <label htmlFor="addition-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        id="addition-toggle" 
                        className="sr-only" 
                        checked={documentData.addition?.active || false} 
                        onChange={handleAdditionToggle}
                      />
                      <div className={`block w-14 h-8 rounded-full ${documentData.addition?.active ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${documentData.addition?.active ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-gray-700 font-medium">Ativar Adição</div>
                  </label>
                </div>
                {documentData.addition?.active && (
                  <div>
                    <label htmlFor="addition-value" className="block text-sm font-medium text-gray-700 mb-1">Valor da Adição</label>
                    <select 
                      id="addition-value" 
                      name="additionValue" 
                      value={documentData.addition.value} 
                      onChange={(e) => updateField('addition.value', e.target.value)} 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
                    >
                      {additionOptions.map(option => (
                        <option key={`addition-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Seção de Anotações */}
              <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-gray-500">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Anotações</h2>
                <textarea
                  value={documentData.annotations || ''}
                  onChange={(e) => updateField('annotations', e.target.value)}
                  placeholder="Digite suas anotações aqui..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm text-black resize-none"
                />
              </div>
            </div>
            
            <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border-t-4 border-gray-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Controles</h2>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleReset} 
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Resetar Valores
                </button>
                <button 
                  onClick={handleCopy} 
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  {copyStatus || 'Copiar para Tabela'}
                </button>
                <button 
                  onClick={() => handleArchivePatient(selectedPatient.id)} 
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
                >
                  Arquivar Paciente
                </button>
                <button 
                  onClick={handleGeneratePrescription} 
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Gerar Receita
                </button>
              </div>
              {copyStatus && (
                <p className="text-sm text-gray-600 mt-2">
                  {copyStatus === 'Copiado!' ? 'Dados copiados para a área de transferência.' : 
                  (copyStatus === 'Copiado como texto simples!' ? 'Dados copiados como texto simples.' : 'Não foi possível copiar.')}
                </p>
              )}
            </div>
            
            <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border-t-4 border-indigo-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Usuários Ativos ({activeUsers.length})</h2>
              {activeUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="text-sm">Nenhum usuário ativo no momento</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {activeUsers.map(user => (
                    <div 
                      key={user.id} 
                      className="flex items-center bg-gray-50 hover:bg-gray-100 rounded-full px-4 py-2 transition-colors duration-200 border border-gray-200"
                    >
                      <span 
                        className="w-3 h-3 rounded-full mr-3 border border-white shadow-sm" 
                        style={{ backgroundColor: user.color || '#6B7280' }}
                      ></span>
                      <span 
                        className="text-sm font-medium"
                        style={{ color: user.color || '#374151' }}
                      >
                        {user.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Usuários conectados em tempo real neste documento
                </p>
              </div>
            </div>
          </main>
          
          <aside className="w-full lg:w-[38%] bg-white rounded-lg shadow-md lg:sticky lg:top-6 self-start">
            <ExamViewer patient={selectedPatient} />
          </aside>
        </div>
        
        <footer className="mt-8 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
          As alterações são salvas automaticamente.
        </footer>

        {/* Modal de Aviso */}
        <AlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          defaultPatientName={selectedPatient?.name || ''}
          onSend={handleSendAlert}
        />

        {renderArchivedModal()}
      </div>
    );
  }

  return null;
}
