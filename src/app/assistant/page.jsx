'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToActivePatients, archivePatient } from '@/utils/patientUtils';
import PatientCard from '@/components/patient/PatientCard';
import PatientCreationForm from '@/components/assistant/PatientCreationForm';

export default function AssistantPage() {
  const [patients, setPatients] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Subscrever a mudanças em tempo real dos pacientes ativos
    const unsubscribe = subscribeToActivePatients((updatedPatients) => {
      setPatients(updatedPatients);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePatient = () => {
    setShowCreateForm(true);
  };

  const handlePatientCreated = (newPatient) => {
    setShowCreateForm(false);
    // O paciente será automaticamente adicionado à lista via subscription
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  const handleArchivePatient = async (patientId) => {
    if (window.confirm('Tem certeza que deseja arquivar este paciente?')) {
      try {
        await archivePatient(patientId);
        // O paciente será automaticamente removido da lista via subscription
      } catch (error) {
        console.error('Erro ao arquivar paciente:', error);
        alert('Erro ao arquivar paciente');
      }
    }
  };

  const handleViewArchived = () => {
    router.push('/assistant/archived');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <PatientCreationForm
            onPatientCreated={handlePatientCreated}
            onCancel={handleCancelCreate}
          />
        </div>
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
                <p className="text-sm text-gray-600">Modo Assistente</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full">
                30/07/2025
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={handleCreatePatient}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Criar Paciente</span>
          </button>
          
          <button
            onClick={handleViewArchived}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
            </svg>
            <span>Arquivados</span>
          </button>
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pacientes Ativos ({patients.length})
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Carregando pacientes...</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum paciente ativo
                </h3>
                <p className="text-gray-600 mb-6">
                  Comece criando um novo paciente para adicionar exames.
                </p>
                <button
                  onClick={handleCreatePatient}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Criar Primeiro Paciente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {patients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    showArchiveButton={true}
                    onArchive={handleArchivePatient}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

