// src/utils/patientUtils.js
// Utilitários de pacientes com leitura MESCLADA (raiz + documento) e escrita espelhada.
// Resolve sumiço de imagem entre devices conectados em links diferentes (docId).

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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* --------------------- Normalização & Merge --------------------- */

const ensureExam = (exam) => {
  if (!exam) return { uploaded: false, url: null, uploadedAt: null, metadata: null };
  const { uploaded = !!exam.url, url = null, uploadedAt = null, metadata = null } = exam;
  return { uploaded, url, uploadedAt, metadata };
};

const normalizePatient = (p) => {
  if (!p) return p;
  const exams = p.exams || {};
  return {
    ...p,
    id: p.id,
    exams: {
      ar: ensureExam(exams.ar),
      tonometry: ensureExam(exams.tonometry),
    },
  };
};

// Mescla raso entre paciente do documento e da raiz.
// - Campos do documento (escopo da sessão) têm precedência.
// - 'exams' vem de qualquer um dos dois (o que estiver mais completo).
const mergePatient = (docPatient, rootPatient) => {
  const base = { ...(rootPatient || {}), ...(docPatient || {}) };
  const exams =
    (docPatient && docPatient.exams) ||
    (rootPatient && rootPatient.exams) ||
    undefined;
  if (exams) base.exams = exams;
  return normalizePatient(base);
};

/* --------------------- IDs e Criação --------------------- */

export const generatePatientId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const createPatient = async (patientName, documentId, exams = null, customId = null) => {
  const patientsRef = collection(db, 'patients');
  const newPatient = {
    name: patientName,
    documentId: documentId || null, // vínculo com a sessão, quando existir
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    exams:
      exams || {
        ar: { uploaded: false, url: null, uploadedAt: null, metadata: null },
        tonometry: { uploaded: false, url: null, uploadedAt: null, metadata: null },
      },
  };

  let docRef;
  if (customId) {
    docRef = doc(patientsRef, customId);
    await setDoc(docRef, newPatient, { merge: true });
  } else {
    docRef = await addDoc(patientsRef, newPatient);
  }

  return { id: docRef.id, ...newPatient };
};

/* --------------------- Leituras por consulta (não reativas) --------------------- */

export const getPatientsByDocument = async (documentId) => {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('documentId', '==', documentId), where('status', '==', 'active'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach((d) => arr.push(normalizePatient({ id: d.id, ...d.data() })));

  // ordenar por createdAt desc (no cliente)
  arr.sort((a, b) => {
    const aT = a.createdAt?.toDate?.() || new Date(0);
    const bT = b.createdAt?.toDate?.() || new Date(0);
    return bT - aT;
  });

  return arr;
};

export const getActivePatients = async () => {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('status', '==', 'active'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach((d) => arr.push(normalizePatient({ id: d.id, ...d.data() })));

  arr.sort((a, b) => {
    const aT = a.createdAt?.toDate?.() || new Date(0);
    const bT = b.createdAt?.toDate?.() || new Date(0);
    return bT - aT;
  });

  return arr;
};

export const getArchivedPatients = async () => {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('status', '==', 'archived'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach((d) => arr.push(normalizePatient({ id: d.id, ...d.data() })));

  arr.sort((a, b) => {
    const aT = a.updatedAt?.toDate?.() || new Date(0);
    const bT = b.updatedAt?.toDate?.() || new Date(0);
    return bT - aT;
  });

  return arr;
};

export const getPatientById = async (patientId) => {
  const ref = doc(db, 'patients', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? normalizePatient({ id: snap.id, ...snap.data() }) : null;
};

/* --------------------- Atualizações CRUD simples --------------------- */

export const updatePatient = async (patientId, patch) => {
  const ref = doc(db, 'patients', patientId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  return true;
};

export const archivePatient = async (patientId) => {
  const ref = doc(db, 'patients', patientId);
  await updateDoc(ref, { status: 'archived', updatedAt: serverTimestamp() });
  return true;
};

export const reactivatePatient = async (patientId) => {
  const ref = doc(db, 'patients', patientId);
  await updateDoc(ref, { status: 'active', updatedAt: serverTimestamp() });
  return true;
};

export const deletePatient = async (patientId) => {
  const ref = doc(db, 'patients', patientId);
  await deleteDoc(ref);
  return true;
};

/* --------------------- Listeners em tempo real (com MERGE) --------------------- */

// MESCLA pacientes do documento (documents/{docId}/patients) com os da raiz (patients)
// e entrega uma única lista normalizada. Resolve divergência entre devices.
export const subscribeToDocumentPatients = (documentId, callback) => {
  const rootQ = query(collection(db, 'patients'), where('documentId', '==', documentId), where('status', '==', 'active'));
  const docCol = collection(db, 'documents', documentId, 'patients');

  let rootMap = new Map(); // id -> patient (raiz)
  let docMap = new Map();  // id -> patient (doc)

  const emit = () => {
    const ids = new Set([...rootMap.keys(), ...docMap.keys()]);
    const merged = [];
    ids.forEach((id) => {
      const rootP = rootMap.get(id) || null;
      const docP = docMap.get(id) || null;
      const m = mergePatient(docP, rootP);
      if (m) merged.push(m);
    });

    // ordenar por createdAt desc (no cliente)
    merged.sort((a, b) => {
      const aT = a.createdAt?.toDate?.() || new Date(0);
      const bT = b.createdAt?.toDate?.() || new Date(0);
      return bT - aT;
    });

    callback(merged);
  };

  const unsubRoot = onSnapshot(rootQ, (snap) => {
    const next = new Map();
    snap.forEach((d) => next.set(d.id, { id: d.id, ...d.data() }));
    rootMap = next;
    emit();
  });

  const unsubDoc = onSnapshot(docCol, (snap) => {
    const next = new Map();
    snap.forEach((d) => next.set(d.id, { id: d.id, ...d.data() }));
    docMap = next;
    emit();
  });

  return () => {
    unsubRoot();
    unsubDoc();
  };
};

// Listener de paciente por ID (raiz). Mantemos assinatura atual.
// Se o seu fluxo precisar do paciente MESCLADO por documento específico, use a lista acima
// (subscribeToDocumentPatients) para obter o objeto já unificado e repassar ao componente.
export const subscribeToPatient = (patientId, callback) => {
  const ref = doc(db, 'patients', patientId);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? normalizePatient({ id: snap.id, ...snap.data() }) : null);
    },
    (err) => console.error('onSnapshot subscribeToPatient', err)
  );
};

export const subscribeToActivePatients = (callback) => {
  const q = query(collection(db, 'patients'), where('status', '==', 'active'));
  return onSnapshot(q, (snap) => {
    const arr = [];
    snap.forEach((d) => arr.push(normalizePatient({ id: d.id, ...d.data() })));
    arr.sort((a, b) => {
      const aT = a.createdAt?.toDate?.() || new Date(0);
      const bT = b.createdAt?.toDate?.() || new Date(0);
      return bT - aT;
    });
    callback(arr);
  });
};

/* --------------------- Atualização de EXAMES (espelhada) --------------------- */

// Atualiza o exame no paciente da RAIZ e, se houver 'documentId' no paciente,
// espelha também em documents/{docId}/patients/{patientId}. Usa atualização
// aninhada (exams.<tipo>) para não sobrescrever o outro exame.
export const updateExamStatus = async (patientId, examType, examData) => {
  const rootRef = doc(db, 'patients', patientId);
  const rootSnap = await getDoc(rootRef);

  if (!rootSnap.exists()) {
    throw new Error(`Paciente ${patientId} não encontrado na raiz`);
  }

  // Atualiza na RAIZ, preservando os demais exames
  await updateDoc(rootRef, {
    [`exams.${examType}`]: {
      uploaded: true,
      url: examData.url,
      uploadedAt: serverTimestamp(),
      metadata: examData.metadata || null,
    },
    updatedAt: serverTimestamp(),
  });

  // Se conhecer o docId (vinculado no paciente), espelha no escopo do documento
  const rootData = rootSnap.data();
  const docId = rootData?.documentId || null;

  if (docId) {
    const docRef = doc(db, 'documents', docId, 'patients', patientId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { id: patientId, createdAt: serverTimestamp() }, { merge: true });
    }
    await updateDoc(docRef, {
      [`exams.${examType}`]: {
        uploaded: true,
        url: examData.url,
        uploadedAt: serverTimestamp(),
        metadata: examData.metadata || null,
      },
      updatedAt: serverTimestamp(),
    });
  }

  return true;
};

/* --------------------- Helpers de UI --------------------- */

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Agora mesmo';
  const now = new Date();
  const t = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now - t;

  const s = Math.floor(diffMs / 1000);
  if (s < 60) return 'Agora mesmo';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dias`;
};

export const hasAllExams = (patient) => {
  const ar = patient?.exams?.ar;
  const to = patient?.exams?.tonometry;
  return (!!ar?.uploaded || !!ar?.url) && (!!to?.uploaded || !!to?.url);
};

export const hasAnyExam = (patient) => {
  const ar = patient?.exams?.ar;
  const to = patient?.exams?.tonometry;
  return (!!ar?.uploaded || !!ar?.url) || (!!to?.uploaded || !!to?.url);
};
