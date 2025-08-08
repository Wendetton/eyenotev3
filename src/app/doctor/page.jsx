'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PatientSelector from '@/components/doctor/PatientSelector';
import ExamViewer from '@/components/doctor/ExamViewer';

export default function DoctorPage() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientSelector, setShowPatientSelector] = useState(true);
  const router = useRouter();

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    if (patient) {
      // Quando um paciente é selecionado, podemos navegar para a interface de atendimento
      router.push(`/patient/${patient.id}`);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const togglePatientSelector = () => {
    setShowPatientSelector(!showPatientSelector);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToHome}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Voltar ao início"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Eyenote</h1>
                <p className="text-sm text-gray-600">Modo Médico</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePatientSelector}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                title={showPatientSelector ? 'Ocultar lista' : 'Mostrar lista'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
          {/* Patient Selector - Sidebar */}
          {showPatientSelector && (
            <div className="lg:col-span-1">
              <PatientSelector
                selectedPatient={selectedPatient}
                onPatientSelect={handlePatientSelect}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className={`${showPatientSelector ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Info Header */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedPatient.name}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          Criado em {selectedPatient.createdAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'Data não disponível'}
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>AR:</span>
                          {selectedPatient.exams?.ar?.uploaded ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>Tono:</span>
                          {selectedPatient.exams?.tonometry?.uploaded ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/patient/${selectedPatient.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Iniciar Atendimento
                    </button>
                  </div>
                </div>

                {/* Exam Viewer */}
                <ExamViewer patient={selectedPatient} />

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => router.push(`/patient/${selectedPatient.id}`)}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar Receita</span>
                    </button>
                    
                    <button
                      onClick={() => window.print()}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Imprimir</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Finalizar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No Patient Selected State */
              <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">👨‍⚕️</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    Bem-vindo, Doutor!
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Selecione um paciente da lista ao lado para visualizar os exames e iniciar o atendimento.
                  </p>
                  {!showPatientSelector && (
                    <button
                      onClick={togglePatientSelector}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Mostrar Lista de Pacientes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

