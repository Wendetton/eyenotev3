'use client';

import { useState, useEffect } from 'react';
import { getArchivedPatients, reactivatePatient, deletePatient } from '@/utils/patientUtils';
import { formatRelativeTime, hasAllExams, hasAnyExam } from '@/utils/patientUtils';

export default function ArchivedPatients({ documentId, onClose }) {
  const [archivedPatients, setArchivedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadArchivedPatients();
  }, [documentId]);

  const loadArchivedPatients = async () => {
    try {
      setLoading(true);
      const patients = await getArchivedPatients();
      // Filtrar apenas pacientes do documento atual
      const documentPatients = patients.filter(p => p.documentId === documentId);
      setArchivedPatients(documentPatients);
    } catch (error) {
      console.error('Erro ao carregar pacientes arquivados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (patientId) => {
    try {
      setProcessingId(patientId);
      await reactivatePatient(patientId);
      await loadArchivedPatients(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao reativar paciente:', error);
      alert('Erro ao reativar paciente');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (patientId, patientName) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o paciente "${patientName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setProcessingId(patientId);
      await deletePatient(patientId);
      await loadArchivedPatients(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      alert('Erro ao excluir paciente');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (patient) => {
    if (hasAllExams(patient)) {
      return 'bg-green-100 border-green-300 text-green-800';
    } else if (hasAnyExam(patient)) {
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    } else {
      return 'bg-red-100 border-red-300 text-red-800';
    }
  };

  const getStatusText = (patient) => {
    if (hasAllExams(patient)) {
      return 'Completo';
    } else if (hasAnyExam(patient)) {
      return 'Parcial';
    } else {
      return 'Pendente';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pacientes Arquivados</h2>
            <p className="text-sm text-gray-600">Documento: {documentId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando pacientes arquivados...</span>
            </div>
          ) : archivedPatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente arquivado</h3>
              <p className="text-gray-600">Pacientes arquivados aparecerão aqui</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 relative"
                >
                  {/* Header com nome e status */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 truncate pr-2">
                      {patient.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient)}`}>
                      {getStatusText(patient)}
                    </span>
                  </div>

                  {/* Status dos exames */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-gray-600">AR:</span>
                      {patient.exams?.ar?.uploaded ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <span className="text-red-600 text-sm">✗</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-gray-600">Tono:</span>
                      {patient.exams?.tonometry?.uploaded ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <span className="text-red-600 text-sm">✗</span>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="text-xs text-gray-500 mb-4">
                    <div>Criado {formatRelativeTime(patient.createdAt)}</div>
                    <div>Arquivado {formatRelativeTime(patient.updatedAt)}</div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleReactivate(patient.id)}
                      disabled={processingId === patient.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {processingId === patient.id ? 'Reativando...' : 'Reativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(patient.id, patient.name)}
                      disabled={processingId === patient.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {processingId === patient.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {archivedPatients.length} paciente(s) arquivado(s)
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

