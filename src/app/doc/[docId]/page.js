'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

import ProfileSelector from '@/components/common/ProfileSelector';
import PatientSelector from '@/components/doctor/PatientSelector';
import PatientCreationForm from '@/components/assistant/PatientCreationForm';
import ExamViewer from '@/components/doctor/ExamViewer';
import CallPatientBar from '@/components/doctor/CallPatientBar';
import PatientCard from '@/components/patient/PatientCard';
import ArchivedPatients from '@/components/common/ArchivedPatients';
import AlertModal from '@/components/common/AlertModal';

import {
  subscribeToDocumentPatients,
  archivePatient,
  createPatient
} from '@/utils/patientUtils';

import { generatePrescriptionPDF } from '@/utils/pdfGenerator';

/* ------------------------- util ------------------------- */
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 10)];
  return color;
};

const initialEyeData = { esf: '0.00', cil: '0.00', eixo: '0' };
const initialDocumentData = {
  rightEye: { ...initialEyeData },
  leftEye: { ...initialEyeData },
  addition: { active: false, value: '+0.75' },
  annotations: ''
};

const generateOptions = (start, end, step, fixed = 2) => {
  const out = [];
  if (!step) return out;
  const s = Math.pow(10, fixed);
  for (let i = Math.round(start * s); i <= Math.round(end * s); i += Math.round(step * s)) {
    const v = i / s;
    const value = fixed ? v.toFixed(fixed) : String(v);
    const label = (v > 0 && fixed && value !== '0.00') ? `+${value}` : value;
    out.push({ value, label });
  }
  return out;
};

const esfOptions = generateOptions(-30, 30, 0.25, 2);
const cilOptions = generateOptions(-10, 0, 0.25, 2);
const eixoOptions = generateOptions(0, 180, 5, 0);
const additionOptions = generateOptions(0.75, 4, 0.25, 2);

/* ------------------------- EyeForm ------------------------- */
const EyeForm = ({ eyeLabel, eyeData, eyeKey, onFieldChange, colorClass }) => (
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
          {esfOptions.map(o => <option key={`${eyeKey}-esf-${o.value}`} value={o.value}>{o.label}</option>)}
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
          {cilOptions.map(o => <option key={`${eyeKey}-cil-${o.value}`} value={o.value}>{o.label}</option>)}
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
          {eixoOptions.map(o => <option key={`${eyeKey}-eixo-${o.value}`} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  </div>
);

/* ------------------------- Page ------------------------- */
export default function DocumentPage() {
  const { docId } = useParams();
  const router = useRouter();

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);

  const [userId] = useState(() => Math.random().toString(36).slice(2));
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('');
  const [userProfile, setUserProfile] = useState(null); // 'doctor' | 'assistant'
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showArchivedPatients, setShowArchivedPatients] = useState(false);

  // --- refs estáveis para evitar race conditions ---
  const currentPatientIdRef = useRef(null);   // paciente que ESTE cliente está editando/visualizando
  const currentPatientUnsubRef = useRef(null);
  const rootDocUnsubRef = useRef(null);
  const presenceRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // --- Avisos (broadcasts) ---
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [broadcastPatientId, setBroadcastPatientId] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  /* --------- Lista de pacientes (tempo real) --------- */
  useEffect(() => {
    if (!docId) return;
    const unsub = subscribeToDocumentPatients(docId, (list) => setPatients(list));
    return () => unsub && unsub();
  }, [docId]);

  /* --------- Identidade local --------- */
  useEffect(() => {
    let n = localStorage.getItem('collab_user_name');
    let c = localStorage.getItem('collab_user_color');
    if (!n) { n = `Usuário ${Math.floor(Math.random() * 1000)}`; localStorage.setItem('collab_user_name', n); }
    if (!c) { c = getRandomColor(); localStorage.setItem('collab_user_color', c); }
    setUserName(n); setUserColor(c);
  }, []);

  /* --------- Helper: anexar listener do paciente --------- */
  const attachPatientListenerById = (patientId, patientName = 'Paciente Selecionado') => {
    // encerra listener anterior
    if (currentPatientUnsubRef.current) { currentPatientUnsubRef.current(); currentPatientUnsubRef.current = null; }

    currentPatientIdRef.current = patientId || null;

    if (!docId || !patientId) {
      setSelectedPatient(null);
      setDocumentData(initialDocumentData);
      return;
    }

    setSelectedPatient({ id: patientId, name: patientName });

    const patientDocRef = doc(db, 'documents', docId, 'patients', patientId);
    const unsub = onSnapshot(
      patientDocRef,
      (snap) => {
        if (snap.exists()) {
          const p = snap.data();
          setDocumentData({
            rightEye: p.rightEye || initialDocumentData.rightEye,
            leftEye:  p.leftEye  || initialDocumentData.leftEye,
            addition: p.addition || initialDocumentData.addition,
            annotations: typeof p.annotations === 'string' ? p.annotations : initialDocumentData.annotations
          });
        } else {
          setDocumentData(initialDocumentData);
        }
      },
      (err) => console.error('Erro no listener do paciente:', err)
    );
    currentPatientUnsubRef.current = unsub;
  };

  /* --------- Listener do documento raiz (seleção + presença) --------- */
  useEffect(() => {
    if (!docId || !userId || !userName || !userColor) return;

    const docRef = doc(db, 'documents', docId);
    rootDocUnsubRef.current = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          // Preencher visão padrão (quando nenhum paciente local ainda foi anexado)
          if (!currentPatientIdRef.current) {
            setDocumentData({
              rightEye: data.rightEye || initialDocumentData.rightEye,
              leftEye:  data.leftEye  || initialDocumentData.leftEye,
              addition: data.addition
                ? {
                    active: typeof data.addition.active === 'boolean' ? data.addition.active : false,
                    value: data.addition.value || initialDocumentData.addition.value
                  }
                : initialDocumentData.addition,
              annotations: typeof data.annotations === 'string' ? data.annotations : ''
            });
          }

          // ==== seguir seleção por PERFIL (com fallback compatível) ====
          const perProfileId   = data?.[`selectedPatientId_${userProfile}`];
          const perProfileName = data?.[`selectedPatientName_${userProfile}`] || 'Paciente Selecionado';

          // legado: só segue se origem do mesmo perfil (ou se legacy não informou perfil)
          const legacyOk = data?.selectedByProfile
            ? data.selectedByProfile === userProfile
            : true;

          const legacyId   = legacyOk ? data?.selectedPatientId   : null;
          const legacyName = legacyOk ? (data?.selectedPatientName || 'Paciente Selecionado') : 'Paciente Selecionado';

          const selId   = (perProfileId ?? legacyId) || null;
          const selName = (perProfileName ?? legacyName) || 'Paciente Selecionado';

          if (selId) {
            if (selId !== currentPatientIdRef.current) {
              attachPatientListenerById(selId, selName);
            }
          } else if (!selId && currentPatientIdRef.current) {
            // limpeza remota para ESTE perfil
            attachPatientListenerById(null);
          }
          // ==== fim seleção ====
        } else {
          setDoc(docRef, initialDocumentData).catch(e => console.error('Erro ao criar documento raiz:', e));
          setDocumentData(initialDocumentData);
        }
        setLoading(false);
      },
      (err) => { console.error('Erro no root listener:', err); setLoading(false); }
    );

    // Presença
    const presenceDoc = doc(db, 'documents', docId, 'activeUsers', userId);
    presenceRef.current = presenceDoc;
    const touchPresence = async () => {
      try {
        await setDoc(presenceDoc, { name: userName, color: userColor, lastSeen: serverTimestamp() }, { merge: true });
      } catch (e) { console.error('Erro ao tocar presença:', e); }
    };
    touchPresence();
    presenceIntervalRef.current = setInterval(touchPresence, 15000);

    const usersCol = collection(db, 'documents', docId, 'activeUsers');
    const cleanInactive = async () => {
      const oneMinAgo = new Date(Date.now() - 60000);
      const q = query(usersCol, where('lastSeen', '<', oneMinAgo));
      const snap = await getDocs(q);
      snap.forEach(async (d) => { try { await deleteDoc(d.ref); } catch {} });
    };
    const cleanupTimer = setInterval(cleanInactive, 30000);

    const unsubUsers = onSnapshot(usersCol, (s) => {
      const arr = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveUsers(arr);
    });

    return () => {
      rootDocUnsubRef.current && rootDocUnsubRef.current();
      unsubUsers && unsubUsers();
      clearInterval(cleanupTimer);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (presenceRef.current) { deleteDoc(presenceRef.current).catch(()=>{}); }
      if (currentPatientUnsubRef.current) { currentPatientUnsubRef.current(); currentPatientUnsubRef.current = null; }
      currentPatientIdRef.current = null;
    };
  }, [docId, userId, userName, userColor, userProfile]);

  /* --------- Listener do aviso (broadcasts/{docId}) --------- */
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

  /* --------- Escrita unificada (doc raiz x subdoc paciente) --------- */
  const updateDocInFirestore = async (updates) => {
    if (!docId) return;

    const keys = Object.keys(updates || {});
    const isPatientField = keys.some((k) =>
      k === 'rightEye' || k.startsWith('rightEye.') ||
      k === 'leftEye'  || k.startsWith('leftEye.')  ||
      k === 'addition' || k.startsWith('addition.') ||
      k === 'annotations'
    );

    const pid = currentPatientIdRef.current;

    if (isPatientField && pid) {
      const patientDocRef = doc(db, 'documents', docId, 'patients', pid);
      try {
        await updateDoc(patientDocRef, updates);
      } catch {
        try {
          await setDoc(patientDocRef, { patientId: pid, patientName: selectedPatient?.name || '', createdAt: serverTimestamp() }, { merge: true });
          await updateDoc(patientDocRef, updates);
        } catch (e) {
          console.error('Erro ao atualizar subdocumento do paciente:', e);
        }
      }
    } else {
      const rootRef = doc(db, 'documents', docId);
      try {
        await updateDoc(rootRef, updates);
      } catch (e) {
        console.error('Erro ao atualizar documento raiz:', e);
      }
    }
  };

  /* --------- Atualização local + persistência --------- */
  const updateField = (path, value) => {
    const keys = path.split('.');
    setDocumentData((prev) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });

    if (path === 'annotations') {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        updateDocInFirestore({ [path]: value });
      }, 400);
    } else {
      updateDocInFirestore({ [path]: value });
    }
  };

  const handleAdditionToggle = () => {
    if (!documentData?.addition) return;
    updateField('addition.active', !documentData.addition.active);
  };

  const handleReset = async () => {
    const pid = currentPatientIdRef.current;
    try {
      if (pid) {
        await updateDocInFirestore({
          rightEye: initialDocumentData.rightEye,
          leftEye : initialDocumentData.leftEye,
          addition: initialDocumentData.addition,
          annotations: initialDocumentData.annotations
        });
        setDocumentData(initialDocumentData);
      } else {
        const rootRef = doc(db, 'documents', docId);
        await setDoc(rootRef, initialDocumentData, { merge: true });
        setDocumentData(initialDocumentData);
      }
    } catch (e) {
      console.error('Erro ao resetar:', e);
    }
  };

  const formatEsfericoForCopy = (esfValue) => {
    const n = parseFloat(esfValue);
    if (isNaN(n)) return esfValue;
    return n > 0 ? `+${esfValue}` : esfValue;
  };

  const handleCopy = async () => {
    if (!documentData) return;
    const { rightEye, leftEye, addition } = documentData;

    let addTxt = '';
    if (addition.active && addition.value) {
      const v = addition.value.toString();
      addTxt = v.startsWith('+') ? v : `+${v}`;
    }

    const rows = [
      ['', 'ESF', 'CIL', 'Eixo'],
      ['Olho Direito', formatEsfericoForCopy(rightEye.esf), rightEye.cil, rightEye.eixo],
      ['Olho Esquerdo', formatEsfericoForCopy(leftEye.esf), leftEye.cil, leftEye.eixo],
      [addition.active ? 'Para perto' : '', addition.active ? `Adição ${addTxt} (AO)` : '', '', '']
    ];

    const html = [
      '<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt;"><tbody>',
      ...rows.map((row, i) =>
        '<tr>' + row.map((cell, j) => {
          const header = i === 0;
          const w = j === 0 ? '120px' : '80px';
          const align = j === 0 ? 'left' : 'center';
          const style = `border: 1px solid black; padding: 4px; width: ${w}; text-align: ${align}; ${header ? 'font-weight: bold; background-color: #f0f0f0;' : ''}`;
          return `<${header ? 'th' : 'td'} style="${style}">${cell}</${header ? 'th' : 'td'}>`;
        }).join('') + '</tr>'
      ),
      '</tbody></table>'
    ].join('');

    const tsv = rows.map(r => r.join('\t')).join('\n');

    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([tsv], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText });
      await navigator.clipboard.write([item]);
      setCopyStatus('Copiado!');
    } catch {
      try {
        await navigator.clipboard.writeText(tsv);
        setCopyStatus('Copiado como texto simples!');
      } catch {
        setCopyStatus('Falha ao copiar.');
      }
    }
    setTimeout(() => setCopyStatus(''), 3000);
  };

  /* --------- Seleção de perfil/paciente --------- */
  const handleProfileSelect = (profile) => setUserProfile(profile);

  // >>> ABRIR PACIENTE (local imediato + publish por perfil + compat) <<<
  const handlePatientSelect = async (patient) => {
    // 1) abre local imediatamente
    attachPatientListenerById(patient?.id || null, patient?.name || 'Paciente Selecionado');

    // 2) publica seleção por perfil + legado (compat)
    if (patient?.id) {
      try {
        await updateDocInFirestore({
          [`selectedPatientId_${userProfile}`]: patient.id,
          [`selectedPatientName_${userProfile}`]: patient.name || '',
          // compat com clientes antigos:
          selectedPatientId: patient.id,
          selectedPatientName: patient.name || '',
          // metadados:
          selectedBy: userName,
          selectedByProfile: userProfile,
          selectedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('Erro ao publicar seleção de paciente:', e);
      }
    }
  };

  const handleBackToPatients = async () => {
    // encerra listener
    attachPatientListenerById(null);
    // limpa seleção apenas do perfil atual + legado
    try {
      await updateDocInFirestore({
        [`selectedPatientId_${userProfile}`]: null,
        [`selectedPatientName_${userProfile}`]: null,
        // compat:
        selectedPatientId: null,
        selectedPatientName: null,
        // metadados:
        selectedBy: null,
        selectedByProfile: null,
        selectedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Erro ao limpar seleção de paciente:', e);
    }
  };

  const handleBackToProfile = () => {
    attachPatientListenerById(null);
    setUserProfile(null);
    setShowPatientForm(false);
  };

  const handlePatientCreated = () => setShowPatientForm(false);

  const handleArchivePatient = async (patientId) => {
    try {
      await archivePatient(patientId);
      if (currentPatientIdRef.current === patientId) {
        await handleBackToPatients();
      }
    } catch (e) {
      console.error('Erro ao arquivar paciente:', e);
      alert('Erro ao arquivar paciente');
    }
  };

  const handleQuickCare = async () => {
    try {
      const n = Math.floor(Math.random() * 100000);
      const name = `Paciente #${n}`;
      const p = {
        id: `quick_${Date.now()}_${n}`,
        name,
        status: 'active',
        createdAt: new Date(),
        documentId: docId,
        isQuickCare: true,
        exams: { ar: null, tonometry: null }
      };
      try { await createPatient(p.name, docId, p.exams, p.id); } catch (e) { console.error('Erro ao salvar paciente rápido:', e); }
      await handlePatientSelect(p);
    } catch (e) {
      console.error('Erro ao iniciar atendimento rápido:', e);
      alert('Erro ao iniciar atendimento rápido');
    }
  };

  const handleGeneratePrescription = () => {
    try {
      if (!selectedPatient) return alert('Nenhum paciente selecionado');
      const fileName = generatePrescriptionPDF(selectedPatient, documentData);
      alert(`Receita gerada com sucesso: ${fileName}`);
    } catch (e) {
      console.error('Erro ao gerar receita:', e);
      alert('Erro ao gerar receita. Tente novamente.');
    }
  };

  /* --------- Avisos: enviar / finalizar --------- */
  const handleSendAlert = async ({ patientName, message }) => {
    try {
      if (!docId) return;
      if (!selectedPatient) {
        alert('Nenhum paciente selecionado.');
        return;
      }
      const color = '#ef4444'; // vermelho
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

  const renderArchivedModal = () =>
    showArchivedPatients ? <ArchivedPatients documentId={docId} onClose={() => setShowArchivedPatients(false)} /> : null;

  /* ------------------------- Render ------------------------- */
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
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Voltar ao Início
            </button>
          </div>
        </div>
        {renderArchivedModal()}
      </>
    );
  }

  // Seleção de perfil
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
            <ProfileSelector onProfileSelect={handleProfileSelect} documentId={docId} userName={userName} userColor={userColor} />
          </div>
        </div>
        {renderArchivedModal()}
      </>
    );
  }

  /* ----------------- ASSISTENTE ----------------- */
  if (userProfile === 'assistant') {
    // Form de criação
    if (showPatientForm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowPatientForm(false)} className="flex items-center text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Voltar
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Criar Paciente</h1>
                <p className="text-sm text-gray-600">Documento: {docId}</p>
              </div>
              <div />
            </div>
            <PatientCreationForm documentId={docId} onPatientCreated={() => setShowPatientForm(false)} />
          </div>
          {renderArchivedModal()}
        </div>
      );
    }

    // Sem paciente selecionado
    if (!selectedPatient) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={handleBackToProfile} className="flex items-center text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Trocar Perfil
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">Assistente</h1>
                <p className="text-gray-600">Documento: {docId}</p>
                <p className="text-sm text-gray-500">
                  Usuário: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setShowArchivedPatients(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                  Ver Arquivados
                </button>
                <button onClick={() => setShowPatientForm(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium">
                  Criar Paciente
                </button>
              </div>
            </div>

            <PatientSelector
              documentId={docId}
              selectedPatient={selectedPatient}
              onPatientSelect={handlePatientSelect}
              onArchive={handleArchivePatient}
            />

            {/* Usuários Ativos */}
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-700">Usuários Ativos ({activeUsers.length})</h2>
              <div className="flex flex-wrap gap-2">
                {activeUsers.map(u => (
                  <div key={u.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: u.color || 'gray' }}></span>
                    <span className="text-sm font-medium" style={{ color: u.color || 'black' }}>{u.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {renderArchivedModal()}
        </div>
      );
    }

    // Com paciente selecionado — Assistente pode substituir a imagem (canEdit)
    return (
      <div className="container mx-auto p-4 flex flex-col min-h-screen bg-emerald-50">
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
                <h1 className="text-3xl font-bold text-gray-800">Assistente</h1>
                <p className="text-sm text-gray-600">
                  Paciente: <span className="font-semibold">{selectedPatient.name}</span> | Documento: {docId} |{' '}
                  Visualizando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-grow flex-col lg:flex-row gap-6">
          <main className="flex-grow">
            <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-emerald-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Exames do Paciente</h2>
              <ExamViewer patient={selectedPatient} canEdit={true} />
              <p className="text-sm text-gray-500 mt-3">Atualizações são em tempo real para todos.</p>
            </div>
          </main>

          <aside className="w-full lg:w-[38%] bg-white rounded-lg shadow-md lg:sticky lg:top-6 self-start">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Ações rápidas</h3>
              <button
                onClick={() => setShowArchivedPatients(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Ver Pacientes Arquivados
              </button>
            </div>
          </aside>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
          Alterações de exames são salvas automaticamente.
        </footer>
        {renderArchivedModal()}
      </div>
    );
  }

  /* ----------------- MÉDICO ----------------- */
  if (userProfile === 'doctor') {
    if (!selectedPatient) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={handleBackToProfile} className="flex items-center text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Trocar Perfil
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">Médico</h1>
                <p className="text-gray-600">Documento: {docId}</p>
                <p className="text-sm text-gray-500">Usuário: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span></p>
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
                  )} | Documento: {docId} | Editando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
            </div>

              {/* lado direito do cabeçalho: Chamador + Avisos (alinhados por py-2) */}
              <div className="flex items-center gap-2">
                <CallPatientBar patient={selectedPatient} compact />
              
                {/* botão Aviso com mesma altura do "Chamar" (py-2) */}
                <button
                  type="button"
                  onClick={() => setShowAlertModal(true)}
                  title="Emitir aviso para o Legacy"
                  className="inline-flex items-center px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                >
                  Aviso
                </button>
              
                {broadcastActive && (
                  <>
                    {/* badge com padding vertical = py-2 */}
                    <span
                      className="inline-flex items-center px-3 py-2 rounded-full text-xs font-semibold bg-red-100 text-red-800 leading-none"
                    >
                      Aviso ativo
                    </span>
              
                    {/* link "Finalizar" também com py-2 para nivelar */}
                    <button
                      type="button"
                      onClick={handleFinishAlert}
                      title="Finalizar aviso"
                      className="inline-flex items-center py-2 text-red-700 hover:text-red-900 text-sm underline"
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
              {/* Adição */}
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

              {/* Anotações */}
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
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm"
                >
                  Resetar Valores
                </button>
                <button
                  onClick={handleCopy}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-sm"
                >
                  {copyStatus || 'Copiar para Tabela'}
                </button>
                <button
                  onClick={() => handleArchivePatient(selectedPatient.id)}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-md shadow-sm"
                >
                  Arquivar Paciente
                </button>
                <button
                  onClick={handleGeneratePrescription}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm"
                >
                  Gerar Receita
                </button>
              </div>
            </div>

            {/* Usuários Ativos */}
            <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border-t-4 border-indigo-500">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Usuários Ativos ({activeUsers.length})</h2>
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
            </div>
          </main>

          {/* Sidebar - Exames do Paciente */}
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
