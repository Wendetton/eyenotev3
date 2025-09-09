'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProfileSelector from '@/components/common/ProfileSelector';
import PatientSelector from '@/components/doctor/PatientSelector';
import PatientCreationForm from '@/components/assistant/PatientCreationForm';
import ExamViewer from '@/components/doctor/ExamViewer';
import { getPatients, subscribeToDocumentPatients, archivePatient, createPatient } from '@/utils/patientUtils';
import PatientCard from '@/components/patient/PatientCard';
import ArchivedPatients from '@/components/common/ArchivedPatients';
import { generatePrescriptionPDF } from '@/utils/pdfGenerator';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
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

const ExamSection = ({ title, data, onChange, isEditing, color }) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      {(['esf', 'cil', 'eixo']).map((key) => (
        <div className="mb-4" key={key}>
          <label className="block text-sm font-medium text-gray-700 capitalize">
            {key === 'esf' ? 'Esférico (ESF)' : key === 'cil' ? 'Cilíndrico (CIL)' : 'Eixo'}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={data[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full border-gray-300 rounded-md p-2 mt-1 text-sm"
            />
          ) : (
            <p className="text-gray-900 mt-1">{data[key]}</p>
          )}
        </div>
      ))}
      <div className="h-2 rounded-full mt-2" style={{ backgroundColor: color }}></div>
    </section>
  );
};

const AdditionSection = ({ active, value, onToggle, onChange, isEditing }) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Adição (para uso em lentes multifocais)</h2>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={active}
            onChange={onToggle}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-gray-700">Ativo</span>
        </label>
      </div>
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-gray-300 rounded-md p-2 mt-1 text-sm"
        />
      ) : (
        <p className="text-gray-900">{active ? value : 'Desativado'}</p>
      )}
    </section>
  );
};

const AnnotationsSection = ({ value, onChange, isEditing }) => {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Anotações</h2>
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-gray-300 rounded-md p-3 text-sm"
          rows={6}
          placeholder="Escreva anotações relevantes aqui..."
        ></textarea>
      ) : (
        <p className="text-gray-900 whitespace-pre-wrap">{value}</p>
      )}
    </section>
  );
};

export default function DocumentPage() {
  const { docId } = useParams();
  const router = useRouter();

  const [documentData, setDocumentData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userProfile, setUserProfile] = useState('doctor'); 
  const [isEditing, setIsEditing] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  const [patients, setPatients] = useState([]); 
  const [archivedPatients, setArchivedPatients] = useState([]);
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  const [primaryPatient, setPrimaryPatient] = useState(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState(false);
  const [newPatientDocumentId, setNewPatientDocumentId] = useState(docId); 
  const [selectedPatientExams, setSelectedPatientExams] = useState(null); 

  const [patientsLoading, setPatientsLoading] = useState(false);

  const [rightEyeColor, setRightEyeColor] = useState(getRandomColor());
  const [leftEyeColor, setLeftEyeColor] = useState(getRandomColor());
  const rightEyeRef = useRef(null);
  const leftEyeRef = useRef(null);

  const [selectedColor, setSelectedColor] = useState(null);
  useEffect(() => {
    setSelectedColor((prev) => {
      if (!prev) return {
        rightEyeColor,
        leftEyeColor,
      };

      if (prev.rightEyeColor === rightEyeColor && prev.leftEyeColor === leftEyeColor) {
        return prev;  
      }

      return {
        rightEyeColor,
        leftEyeColor,
      };
    });
  }, [rightEyeColor, leftEyeColor]);

  const updateColor = (colorType, newColor) => {
    if (colorType === 'rightEye') {
      setRightEyeColor(newColor);
    } else if (colorType === 'leftEye') {
      setLeftEyeColor(newColor);
    }
  };

  const fetchPatientsByDocumentId = async (docId) => {
    const q = query(collection(db, 'patients'), where('documentId', '==', docId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const [document, setDocument] = useState(initialDocumentData);
  const [userName, setUserName] = useState('');

  const docRef = doc(db, 'documents', docId);

  const updateDocInFirestore = async (data) => {
    try {
      await updateDoc(docRef, {
        ...data,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao atualizar o documento no Firestore:", error);
      alert("Erro ao atualizar o documento no Firestore.");
    }
  };

  useEffect(() => {
    const user = prompt("Por favor, digite seu nome (será usado para colaborar no documento):");
    if (user) {
      setUserName(user); 
    } else {
      alert("Nome é obrigatório para colaborar no documento.");
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (docId && userName) {
      const unsubscribeDoc = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setDocument(prev => ({
            ...prev,
            ...data, 
          }));

          setDocumentData({
            rightEye: data.rightEye || initialDocumentData.rightEye,
            leftEye: data.leftEye || initialDocumentData.leftEye,
            addition: data.addition || initialDocumentData.addition,
            annotations: data.annotations || initialDocumentData.annotations, 
          });

          setPrimaryPatient(data.primaryPatient || null);
          setIsEditing(data.isEditing || false);
          setCreatedBy(data.createdBy || '');
          setLastUpdated(data.lastUpdated);

          // Sincronizar seleção de paciente entre usuários
          if (data.selectedPatientId && data.selectedBy !== userName) {
            // Buscar dados do paciente selecionado por outro usuário
            if (data.selectedPatientId !== selectedPatient?.id) {
              const syncPatient = {
                id: data.selectedPatientId,
                name: data.selectedPatientName || 'Paciente Selecionado'
              };
              setSelectedPatient(syncPatient);
            }
          } else if (!data.selectedPatientId && selectedPatient) {
            setSelectedPatient(null);
          }
        } else {
          const initialData = {
            ...initialDocumentData,
            createdBy: 'sistema',
            lastUpdated: serverTimestamp(),
            isEditing: false,
          };
          setDoc(docRef, initialData);
        }
      });

      return () => unsubscribeDoc();
    }
  }, [docId, userName]);

  useEffect(() => {
    if (!docId) return;

    const unsubscribe = subscribeToDocumentPatients(docId, (patients) => {
      setPatients(patients.filter((patient) => patient.status !== 'archived')); 
      setArchivedPatients(patients.filter((patient) => patient.status === 'archived')); 
    });

    return () => unsubscribe(); 
  }, [docId]);

  useEffect(() => {
    const restoreSelectedPatient = sessionStorage.getItem(`selectedPatient_${docId}`);
    if (restoreSelectedPatient) {
      const parsedPatient = JSON.parse(restoreSelectedPatient);
      setSelectedPatient(parsedPatient);
    }
  }, [docId]);

  useEffect(() => {
    if (selectedPatient) {
      sessionStorage.setItem(`selectedPatient_${docId}`, JSON.stringify(selectedPatient));
    } else {
      sessionStorage.removeItem(`selectedPatient_${docId}`);
    }
  }, [docId, selectedPatient]);

  const handleInputChange = (eye, field, value) => {
    setDocument(prev => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value,
      },
    }));
  };

  const handleAdditionChange = (field, value) => {
    setDocument(prev => ({
      ...prev,
      addition: {
        ...prev.addition,
        [field]: value,
      },
    }));
  };

  const handleAnnotationsChange = (value) => {
    setDocument(prev => ({
      ...prev,
      annotations: value, 
    }));
  };

  const handleSave = async () => {
    try {
      await updateDoc(docRef, {
        ...document,
        lastUpdated: serverTimestamp(),
      });
      alert('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert('Erro ao salvar dados.');
    }
  };

  const handleToggleEdit = async () => {
    try {
      const newIsEditing = !isEditing;
      setIsEditing(newIsEditing);

      await updateDocInFirestore({
        isEditing: newIsEditing,
        editedBy: userName || 'usuário desconhecido',
      });
    } catch (error) {
      console.error('Erro ao alternar modo de edição:', error);
      alert('Erro ao alternar modo de edição.');
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);

    await updateDocInFirestore({
      selectedPatientId: patient.id,
      selectedPatientName: patient.name || '',
      selectedBy: userName || 'usuário desconhecido',
      selectedAt: serverTimestamp(),
    });

    const patientDocRef = doc(db, 'patients', patient.id);
    const patientDoc = await getDoc(patientDocRef);

    if (patientDoc.exists()) {
      setDocument(prev => ({
        ...prev,
        rightEye: patientDoc.data().rightEye || initialDocumentData.rightEye,
        leftEye: patientDoc.data().leftEye || initialDocumentData.leftEye,
      }));
    }
  };

  const [items] = useState([
    {
      title: 'Algemas para consulta',
      content: 'Informações úteis para a consulta de forma simples e clara.',
    },
    {
      title: 'Preparação do paciente',
      content: 'Passos para preparação do paciente antes da consulta.',
    },
    {
      title: 'Observações',
      content: 'Espaço para anotações diversas e observações do médico.',
    },
  ]);

  const handleSetPrimaryPatient = async () => {
    try {
      await updateDocInFirestore({
        primaryPatient: {
          id: selectedPatient.id,
          name: selectedPatient.name,
        },
      });
      alert('Paciente principal definido com sucesso!');
    } catch (error) {
      console.error('Erro ao definir paciente principal:', error);
      alert('Erro ao definir paciente principal.');
    }
  };

  const toggleAnotacoes = async () => {
    try {
      await updateDocInFirestore({
        annotationsVisible: !documentData?.annotationsVisible,
      });
    } catch (error) {
      console.error('Erro ao alternar visibilidade das anotações:', error);
      alert('Erro ao alternar visibilidade das anotações.');
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [prescription, setPrescription] = useState({
    patientName: '',
    rightEye: { esf: '', cil: '', eixo: '' },
    leftEye: { esf: '', cil: '', eixo: '' },
    addition: '',
  });

  const getPatientById = (id) => {
    return patients.find(patient => patient.id === id) || null;
  };

  const handleBackToPatients = async () => {
    setSelectedPatient(null);
    await updateDocInFirestore({
      selectedPatientId: null,
      selectedPatientName: null,
      selectedBy: null,
      selectedAt: serverTimestamp(),
    });
  };

  /* ====== ARQUIVAR PACIENTE (agora limpando a seleção compartilhada) ====== */
  const handleArchivePatient = async (patientId) => {
    try {
      await archivePatient(patientId);
      // Se o paciente arquivado estava selecionado, limpar seleção compartilhada e voltar à lista
      if (selectedPatient?.id === patientId) {
        await updateDocInFirestore({
          selectedPatientId: null,
          selectedPatientName: null,
          selectedBy: null,
          selectedAt: serverTimestamp()
        });
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Erro ao arquivar paciente:', error);
      alert('Erro ao arquivar paciente');
    }
  }

  const handleReactivatePatient = async (patientId) => {
    try {
      const patientDocRef = doc(db, 'patients', patientId);
      await updateDoc(patientDocRef, { status: 'active' });

      const restoredPatient = getPatientById(patientId);

      if (restoredPatient) {
        setSelectedPatient(restoredPatient);
        await updateDocInFirestore({
          selectedPatientId: restoredPatient.id,
          selectedPatientName: restoredPatient.name || '',
          selectedBy: userName || 'usuário desconhecido',
          selectedAt: serverTimestamp(),
        });
      }

      alert('Paciente reativado com sucesso!');
    } catch (error) {
      console.error('Erro ao reativar paciente:', error);
      alert('Erro ao reativar paciente.');
    }
  };

  const renderFormControls = () => (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Controles de Prescrição</h2>
        <label className="flex items-center space-x-2">
          <span className="text-gray-700">Modo de Edição</span>
          <input
            type="checkbox"
            checked={isEditing}
            onChange={handleToggleEdit}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExamSection
          title="Olho Direito (OD)"
          data={document.rightEye}
          onChange={(key, value) => handleInputChange('rightEye', key, value)}
          isEditing={isEditing}
          color={rightEyeColor}
        />

        <ExamSection
          title="Olho Esquerdo (OE)"
          data={document.leftEye}
          onChange={(key, value) => handleInputChange('leftEye', key, value)}
          isEditing={isEditing}
          color={leftEyeColor}
        />
      </div>

      <div className="mt-6">
        <AdditionSection
          active={document.addition.active}
          value={document.addition.value}
          onToggle={() => handleAdditionChange('active', !document.addition.active)}
          onChange={(value) => handleAdditionChange('value', value)}
          isEditing={isEditing}
        />
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Salvar Prescrição
        </button>
      </div>
    </div>
  );

  const [archivItem, setArchivItem] = useState(null);

  const renderArchivedModal = () => {
    if (!showArchivedModal) return null;

    return (
      <ArchivedPatients
        docId={docId}
        onClose={() => setShowArchivedModal(false)}
        onReactivate={handleReactivatePatient}
      />
    );
  };

  const toggleArchivedModal = () => {
    setShowArchivedModal(!showArchivedModal);
  };

  const handleArchive = (id) => {
    setArchivItem({ id, status: 'archived' });
  };

  useEffect(() => {
    if (archivItem?.id) {
      const archiveData = async () => {
        await updateDoc(doc(db, 'patients', archivItem.id), {
          status: archivItem.status,
        });
        setArchivItem(null);
      };
      archiveData();
    }
  }, [archivItem]);

  const handleCreatePatient = async ({ patientName, documentId }) => {
    try {
      const created = await createPatient(patientName, documentId);
      if (created) {
        setNewPatientName('');
        setNewPatientDocumentId(docId);
        setIsCreatePatientModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      alert('Erro ao criar paciente. Tente novamente.');
    }
  };

  const renderPatientsList = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">Pacientes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatePatientModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Novo Paciente
          </button>
          <button
            onClick={toggleArchivedModal}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            Arquivados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            onSelect={() => handleSelectPatient(patient)}
            onArchive={() => handleArchivePatient(patient.id)}
          />
        ))}
      </div>
    </section>
  );

  const [quill, setQuill] = useState(null);
  const quillRef = useRef(null);

  const togglePrescriptionModal = () => {
    setIsPrescriptionModalOpen(!isPrescriptionModalOpen);
  };

  const generatePDF = () => {
    if (quill) {
      const content = quill.root.innerHTML;
      const doc = `<html><body>${content}</body></html>`;
      generatePrescriptionPDF({ content: doc });
    } else {
      alert('O editor não está carregado. Tente novamente.');
    }
  };

  const [textAreaValue, setTextAreaValue] = useState('');

  const handleTextareaChange = (e) => {
    setTextAreaValue(e.target.value);
  };

  useEffect(() => {
    sessionStorage.setItem('textAreaContent', textAreaValue);
  }, [textAreaValue]);

  useEffect(() => {
    const savedText = sessionStorage.getItem('textAreaContent');
    if (savedText) {
      setTextAreaValue(savedText);
    }
  }, []);

  const [eyeRx, setEyeRx] = useState(initialDocumentData);

  const renderRightSide = () => (
    <div className="space-y-6">
      {renderFormControls()}
    </div>
  );

  const renderLeftSide = () => (
    <div className="space-y-6">
      {renderPatientsList()}

      {selectedPatient && userProfile === 'doctor' ? (
        <ExamViewer patient={selectedPatient} />
      ) : null}
    </div>
  );

  const handleSetProfile = (profile) => {
    setUserProfile(profile);
  };

  const handleBack = () => {
    setSelectedPatient(null);
  };

  const [isObservationsVisible, setIsObservationsVisible] = useState(true);
  const [isRightEyeVisible, setIsRightEyeVisible] = useState(true);
  const [isLeftEyeVisible, setIsLeftEyeVisible] = useState(true);

  const toggleRightEyeVisibility = () => setIsRightEyeVisible(!isRightEyeVisible);
  const toggleLeftEyeVisibility = () => setIsLeftEyeVisible(!isLeftEyeVisible);

  const renderRightEyeSection = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Olho Direito (OD)</h2>
        <button
          onClick={toggleRightEyeVisibility}
          className="text-blue-600 hover:underline"
        >
          {isRightEyeVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {isRightEyeVisible && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {[{ label: 'Esférico (ESF)', key: 'esf' }, { label: 'Cilíndrico (CIL)', key: 'cil' }, { label: 'Eixo', key: 'eixo' }].map((field) => (
            <div key={field.key} className="bg-gray-50 p-4 rounded-md border">
              <label className="block text-sm font-medium text-gray-700">{field.label}</label>
              <input
                type="text"
                value={document.rightEye[field.key]}
                onChange={(e) => handleInputChange('rightEye', field.key, e.target.value)}
                className="w-full mt-1 border-gray-300 rounded-md p-2 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderLeftEyeSection = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Olho Esquerdo (OE)</h2>
        <button
          onClick={toggleLeftEyeVisibility}
          className="text-blue-600 hover:underline"
        >
          {isLeftEyeVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {isLeftEyeVisible && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {[{ label: 'Esférico (ESF)', key: 'esf' }, { label: 'Cilíndrico (CIL)', key: 'cil' }, { label: 'Eixo', key: 'eixo' }].map((field) => (
            <div key={field.key} className="bg-gray-50 p-4 rounded-md border">
              <label className="block text-sm font-medium text-gray-700">{field.label}</label>
              <input
                type="text"
                value={document.leftEye[field.key]}
                onChange={(e) => handleInputChange('leftEye', field.key, e.target.value)}
                className="w-full mt-1 border-gray-300 rounded-md p-2 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderObservationsSection = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Observações</h2>
        <button
          onClick={() => setIsObservationsVisible(!isObservationsVisible)}
          className="text-blue-600 hover:underline"
        >
          {isObservationsVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {isObservationsVisible && (
        <textarea
          className="w-full mt-2 border-gray-300 rounded-md p-3 text-sm"
          rows={6}
          placeholder="Escreva observações aqui..."
          value={textAreaValue}
          onChange={handleTextareaChange}
        ></textarea>
      )}
    </section>
  );

  const [observations, setObservations] = useState('');

  const saveObservations = async () => {
    try {
      await updateDocInFirestore({
        observations,
      });
      alert('Observações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar observações:', error);
      alert('Erro ao salvar observações.');
    }
  };

  const [rightEyeEsf, setRightEyeEsf] = useState('0.00');
  const [rightEyeCil, setRightEyeCil] = useState('0.00');
  const [rightEyeEixo, setRightEyeEixo] = useState('0');

  const [leftEyeEsf, setLeftEyeEsf] = useState('0.00');
  const [leftEyeCil, setLeftEyeCil] = useState('0.00');
  const [leftEyeEixo, setLeftEyeEixo] = useState('0');

  const handleRightEyeFieldChange = (key, value) => {
    setDocument(prev => ({
      ...prev,
      rightEye: {
        ...prev.rightEye,
        [key]: value,
      },
    }));
  };

  const handleLeftEyeFieldChange = (key, value) => {
    setDocument(prev => ({
      ...prev,
      leftEye: {
        ...prev.leftEye,
        [key]: value,
      },
    }));
  };

  const handleAnnotationsFieldChange = (value) => {
    setDocument(prev => ({
      ...prev,
      annotations: value,
    }));
  };

  useEffect(() => {
    setDocumentData(prev => ({
      ...prev,
      rightEye: document.rightEye,
      leftEye: document.leftEye,
    }));
  }, [document.rightEye, document.leftEye]);

  const [copyStatus, setCopyStatus] = useState('');

  const handleCopyPrescription = () => {
    const prescriptionText = `Prescrição Oftalmológica:

Olho Direito (OD):
- ESF: ${document.rightEye.esf}
- CIL: ${document.rightEye.cil}
- Eixo: ${document.rightEye.eixo}

Olho Esquerdo (OE):
- ESF: ${document.leftEye.esf}
- CIL: ${document.leftEye.cil}
- Eixo: ${document.leftEye.eixo}

Adição: ${document.addition.active ? document.addition.value : 'Desativada'}

Anotações:
${document.annotations || ''}`;

    navigator.clipboard.writeText(prescriptionText).then(() => {
      setCopyStatus('Prescrição copiada com sucesso!');
      setTimeout(() => setCopyStatus(''), 3000);
    }).catch((error) => {
      console.error('Erro ao copiar prescrição:', error);
      setCopyStatus('Erro ao copiar prescrição.');
    });
  };

  const renderLeftSection = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescrição Oftalmológica</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExamSection
          title="Olho Direito (OD)"
          data={document.rightEye}
          onChange={(key, value) => handleInputChange('rightEye', key, value)}
          isEditing={isEditing}
          color={rightEyeColor}
        />

        <ExamSection
          title="Olho Esquerdo (OE)"
          data={document.leftEye}
          onChange={(key, value) => handleInputChange('leftEye', key, value)}
          isEditing={isEditing}
          color={leftEyeColor}
        />
      </div>

      <div className="mt-6">
        <AdditionSection
          active={document.addition.active}
          value={document.addition.value}
          onToggle={() => handleAdditionChange('active', !document.addition.active)}
          onChange={(value) => handleAdditionChange('value', value)}
          isEditing={isEditing}
        />
      </div>

      <div className="mt-6">
        <AnnotationsSection
          value={document.annotations}
          onChange={handleAnnotationsChange}
          isEditing={isEditing}
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Salvar
        </button>

        <button
          onClick={togglePrescriptionModal}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          Gerar Prescrição
        </button>
      </div>
    </section>
  );

  const [doctorView, setDoctorView] = useState('form'); 

  const renderRightSection = () => (
    <section className="space-y-6">
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ferramentas do Médico</h2>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDoctorView('form')}
            className={`px-4 py-2 rounded-lg ${doctorView === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Prescrição
          </button>
          <button
            onClick={() => setDoctorView('exams')}
            className={`px-4 py-2 rounded-lg ${doctorView === 'exams' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Exames
          </button>
        </div>
      </section>

      {doctorView === 'form' ? (
        renderFormControls()
      ) : (
        selectedPatient && (
          <section className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Exames do Paciente</h2>

            <div className="space-y-4">
              <ExamViewer patient={selectedPatient} />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => alert('Função em desenvolvimento')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Fazer Upload de Exames
              </button>
            </div>
          </section>
        )
      )}
    </section>
  );

  const [assistantNotes, setAssistantNotes] = useState('');

  const handleAssistantNoteChange = (e) => {
    setAssistantNotes(e.target.value);
  };

  const handleSaveAssistantNote = async () => {
    try {
      await updateDocInFirestore({
        assistantNotes,
      });
      alert('Anotações do assistente salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações do assistente:', error);
      alert('Erro ao salvar anotações do assistente.');
    }
  };

  const renderAssistantTools = () => (
    <section className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Ferramentas do Assistente</h2>

      <div className="space-y-4">
        <textarea
          value={assistantNotes}
          onChange={handleAssistantNoteChange}
          className="w-full border-gray-300 rounded-md p-3"
          rows={6}
          placeholder="Escreva anotações do assistente aqui..."
        ></textarea>

        <div className="flex justify-end">
          <button
            onClick={handleSaveAssistantNote}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Salvar Anotações
          </button>
        </div>
      </div>
    </section>
  );

  const renderArchivedModalButton = () => (
    <div className="flex justify-center">
      <button
        onClick={toggleArchivedModal}
        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
      >
        Ver Pacientes Arquivados
      </button>
    </div>
  );

  /* ===================== LAYOUT PRINCIPAL ===================== */
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white py-6 shadow-sm border-b">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Documento: {docId}</h1>
              <p className="text-sm text-gray-600">Criado por: {createdBy}</p>
            </div>

            <ProfileSelector profile={userProfile} setProfile={handleSetProfile} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Layout em duas colunas com proporção ajustada (Exames mais largos) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Coluna principal (formulários, lista, etc.) */}
          <main className="flex-grow lg:w-[62%]">
            <div className="space-y-6">
              {userProfile === 'doctor' ? (
                <>
                  {renderLeftSection()}
                  {renderRightSection()}
                </>
              ) : (
                <>
                  {renderLeftSection()}
                  {renderAssistantTools()}
                </>
              )}
            </div>
          </main>

          {/* Coluna lateral (Exames do Paciente ampliado) */}
          <aside className="w-full lg:w-[38%] bg-white rounded-lg shadow-md lg:sticky lg:top-6 self-start">
            <div className="p-6">
              {selectedPatient ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Exames do Paciente</h2>
                    <button
                      onClick={handleBackToPatients}
                      className="text-blue-600 hover:underline"
                    >
                      Voltar para a Lista
                    </button>
                  </div>

                  <ExamViewer patient={selectedPatient} />

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={handleSetPrimaryPatient}
                      className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                    >
                      Definir como Principal
                    </button>
                    <button
                      onClick={() => handleArchivePatient(selectedPatient.id)} 
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Arquivar Paciente
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Exames do Paciente</h2>
                    <button
                      onClick={() => router.push(`/doc/${docId}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Atualizar
                    </button>
                  </div>
                  <p className="text-gray-600">Selecione um paciente na lista para visualizar os exames.</p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Modais */}
        {isCreatePatientModalOpen && (
          <PatientCreationForm
            onClose={() => setIsCreatePatientModalOpen(false)}
            onCreate={(values) => handleCreatePatient(values)}
            defaultDocumentId={newPatientDocumentId}
          />
        )}

        {renderArchivedModal()}
      </main>

      <footer className="bg-white py-6 mt-12 border-t">
        <div className="container mx-auto px-6">
          <p className="text-center text-gray-600 text-sm">Colaboração em tempo real com o Firestore.</p>
        </div>
      </footer>
    </div>
  );
}
