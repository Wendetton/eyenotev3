'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToPatient } from '@/utils/patientUtils';
import ExamViewer from '@/components/doctor/ExamViewer';

// Importar componentes do sistema original
import { doc, onSnapshot, setDoc, updateDoc, collection, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  } else {
    for (let i = scaledStart; i >= scaledEnd; i += scaledStep) {
      const currentValue = i / scale;
      const value = formatFixed > 0 ? currentValue.toFixed(formatFixed) : currentValue.toString();
      const displayValue = (currentValue > 0 && formatFixed > 0 && value !== '0.00') ? `+${value}` : value;
      options.push({ value: value, label: displayValue });
    }
  }
  return options;
};

const esfOptions = generateOptions(-15.00, 15.00, 0.25);
const cilOptions = generateOptions(0.00, -6.00, -0.25);
const eixoOptions = generateOptions(0, 180, 5, 0);
const additionOptions = generateOptions(0.75, 3.00, 0.25);

const EyeForm = ({ eyeLabel, eyeData, eyeKey, onFieldChange, colorClass }) => {
  if (!eyeData) return null;
  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg border-t-4 ${colorClass}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 border-b pb-2`}>{eyeLabel}</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={`${eyeKey}-esf`} className="block text-sm font-medium text-gray-700 mb-1">Esférico (ESF)</label>
          <select
            id={`${eyeKey}-esf`}
            name="esf"
            value={eyeData.esf}
            onChange={(e) => onFieldChange(`${eyeKey}.esf`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
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
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
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
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
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

export default function PatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId;
  
  // Estados do paciente
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  
  // Estados do documento (receita)
  const [documentData, setDocumentData] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');
  
  // Estados da interface
  const [showExamViewer, setShowExamViewer] = useState(true);

  // Gerar docId baseado no patientId para manter consistência
  const docId = `patient_${patientId}`;

  useEffect(() => {
    if (!patientId) return;

    // Subscrever aos dados do paciente
    const unsubscribePatient = subscribeToPatient(patientId, (patientData) => {
      setPatient(patientData);
      setPatientLoading(false);
    });

    return () => unsubscribePatient();
  }, [patientId]);

  useEffect(() => {
    let localUserId = localStorage.getItem('collab_user_id');
    let localUserName = localStorage.getItem('collab_user_name');
    let localUserColor = localStorage.getItem('collab_user_color');
    if (!localUserId) {
      localUserId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('collab_user_id', localUserId);
    }
    setUserId(localUserId);
    if (!localUserName) {
      localUserName = prompt("Digite seu nome para colaborar:") || `Anônimo-${localUserId.substring(0, 4)}`;
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
          addition: data.addition ? { 
            active: typeof data.addition.active === 'boolean' ? data.addition.active : initialDocumentData.addition.active, 
            value: data.addition.value || initialDocumentData.addition.value 
          } : { ...initialDocumentData.addition },
          annotations: typeof data.annotations === 'string' ? data.annotations : initialDocumentData.annotations,
          patientId: patientId // Vincular ao paciente
        };
        setDocumentData(currentData);
      } else {
        const newDocData = { ...initialDocumentData, patientId };
        setDoc(docRef, newDocData).then(() => {
          setDocumentData(newDocData);
        }).catch(error => console.error("Erro ao criar novo documento: ", error));
      }
      setDocumentLoading(false);
    }, (error) => {
      console.error("Erro ao buscar documento:", error);
      setDocumentLoading(false);
    });

    // Sistema de presença
    const presenceRef = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, { name: userName, color: userColor, lastSeen: serverTimestamp() }, { merge: true });
      } catch (e) { console.error("Erro ao atualizar presença: ", e); }
    };
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 15000);

    const usersCollectionRef = collection(db, 'documents', docId, 'activeUsers');
    const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
      const users = [];
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      snapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.lastSeen && userData.lastSeen.toDate && userData.lastSeen.toDate() > sixtySecondsAgo) {
          users.push({ id: userDoc.id, ...userData });
        } else if (!userData.lastSeen) { 
          users.push({ id: userDoc.id, ...userData }); 
        }
      });
      setActiveUsers(users);
    });

    const handleBeforeUnload = async () => {
      await deleteDoc(presenceRef).catch(e => console.error("Erro ao remover presença: ", e));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeDoc();
      unsubscribeUsers();
      clearInterval(presenceInterval);
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [docId, userId, userName, userColor, patientId]);

  const updateDocInFirestore = async (dataToUpdate) => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);
    try { 
      await updateDoc(docRef, dataToUpdate); 
    } catch (error) { 
      console.error(`Erro ao salvar documento:`, error); 
    }
  };

  const updateField = (path, value) => {
    setDocumentData(prevData => {
      const keys = path.split('.');
      let tempData = JSON.parse(JSON.stringify(prevData));
      let currentLevel = tempData;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) { 
          currentLevel[key] = value; 
        } else { 
          if (!currentLevel[key] || typeof currentLevel[key] !== 'object') { 
            currentLevel[key] = {}; 
          } 
          currentLevel = currentLevel[key]; 
        }
      });
      return tempData;
    });
    
    updateDocInFirestore({ [path]: value });
  };

  const handleAdditionToggle = () => {
    if (!documentData || typeof documentData.addition === 'undefined') return;
    const newActiveState = !documentData.addition.active;
    updateField('addition.active', newActiveState);
  };

  const handleReset = async () => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);
    try { 
      const resetData = { ...initialDocumentData, patientId };
      await setDoc(docRef, resetData); 
      setDocumentData(resetData); 
    } catch (error) { 
      console.error("Erro ao resetar documento:", error); 
    }
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

    const tableStyle = 'border-collapse: collapse; width: auto; font-family: Tahoma, Arial, sans-serif; font-size: 10pt;';
    const thStyleBase = 'border: 1px solid #dddddd; padding: 4px; background-color: #f2f2f2;';
    const tdStyleBase = 'border: 1px solid #dddddd; padding: 4px;'
    
    const thStyles = {
        default: `${thStyleBase} text-align: left; width: 120px;`,
        center: `${thStyleBase} text-align: center; width: 80px;`
    };

    const tdStyles = {
        default: `${tdStyleBase} text-align: left; width: 120px;`,
        centerBold: `${tdStyleBase} text-align: center; font-weight: bold; width: 80px;`,
        right: `${tdStyleBase} text-align: right; width: 120px;`
    };  

    let htmlTable = `<table style="${tableStyle}">`;
    htmlTable += `<thead><tr>`;
    htmlTable += `<th style="${thStyles.default}">${tableRows[0][0]}</th>`; 
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][1]}</th>`; 
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][2]}</th>`; 
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][3]}</th>`; 
    htmlTable += `</tr></thead><tbody>`;
    
    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.default}">${tableRows[1][0]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][1]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][2]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][3]}</td>`;
    htmlTable += `</tr>`;

    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.default}">${tableRows[2][0]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][1]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][2]}</td>`;
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][3]}</td>`;
    htmlTable += `</tr>`;

    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.right}">${tableRows[3][0]}</td>`;
    htmlTable += `<td style="${tdStyles.default}" colspan="3">${tableRows[3][1]}</td>`;
    htmlTable += `</tr>`;

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

  const handleBackToDoctor = () => {
    router.push('/doctor');
  };

  if (patientLoading || documentLoading || !documentData || !patient) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando atendimento...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDoctor}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Voltar para lista de pacientes"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EyeNote</h1>
                <p className="text-sm text-gray-600">
                  Paciente: <span className="font-semibold">{patient.name}</span> | 
                  Editando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowExamViewer(!showExamViewer)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                title={showExamViewer ? 'Ocultar exames' : 'Mostrar exames'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                30/07/2025
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Exam Viewer - Sidebar */}
          {showExamViewer && (
            <div className="lg:col-span-1">
              <ExamViewer patient={patient} />
            </div>
          )}

          {/* Main Content Area - Prescription Form */}
          <div className={`${showExamViewer ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="space-y-6">
              {/* Eye Forms */}
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

              {/* Addition Section */}
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
                      className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
                    >
                      {additionOptions.map(option => (
                        <option key={`addition-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Controls Section */}
              <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-gray-500">
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
                </div>
                {copyStatus && (
                  <p className="text-sm text-gray-600 mt-2">
                    {copyStatus === 'Copiado!' ? 'Dados copiados para a área de transferência.' : 
                     copyStatus === 'Copiado como texto simples!' ? 'Dados copiados como texto simples.' : 
                     'Não foi possível copiar.'}
                  </p>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Users */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">
                      Usuários Ativos ({activeUsers.length})
                    </h3>
                    <ul className="space-y-2">
                      {activeUsers.map(user => (
                        <li 
                          key={user.id} 
                          className="flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-150" 
                          style={{ backgroundColor: user.color ? `${user.color}1A` : '#E5E7EB66' }}
                        >
                          <span 
                            style={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              backgroundColor: user.color || 'gray', 
                              marginRight: '10px', 
                              display: 'inline-block', 
                              flexShrink: 0 
                            }}
                          ></span>
                          <span className="text-sm font-medium" style={{ color: user.color || 'black' }}>
                            {user.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Annotations */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Anotações</h3>
                    <textarea
                      value={documentData.annotations || ''}
                      onChange={(e) => updateField('annotations', e.target.value)}
                      placeholder="Digite suas anotações aqui..."
                      className="w-full h-32 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm text-black"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
        As alterações são salvas automaticamente.
      </footer>
    </div>
  );
}

