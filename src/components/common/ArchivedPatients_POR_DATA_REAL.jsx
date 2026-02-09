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

  // Agrupar pacientes por data exata
  const groupPatientsByDate = (patients) => {
    const groups = {};

    patients.forEach(patient => {
      const archivedDate = patient.updatedAt?.toDate ? patient.updatedAt.toDate() : new Date(patient.updatedAt);
      // Formata data como DD/MM/YYYY
      const dateKey = archivedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: archivedDate,
          patients: []
        };
      }
      groups[dateKey].patients.push(patient);
    });

    // Ordenar grupos por data (mais recente primeiro)
    const sortedGroups = Object.entries(groups)
      .sort(([, a], [, b]) => b.date - a.date)
      .map(([dateKey, data]) => ({
        dateKey,
        date: data.date,
        patients: data.patients
      }));

    return sortedGroups;
  };

  const groupedPatients = groupPatientsByDate(archivedPatients);

  // Formatar data por extenso para o título
  const formatDateTitle = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Se for hoje ou ontem, mostra isso + a data
    if (dateOnly.getTime() === today.getTime()) {
      return `Hoje - ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return `Ontem - ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } else {
      // Mostra dia da semana + data
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long',
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  const renderPatientRow = (patient) => (
    <div
      key={patient.id}
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
    >
      {/* Nome e informações */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {patient.name}
          </h3>
          
          {/* Status dos exames - inline */}
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              patient.exams?.ar?.uploaded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              AR {patient.exams?.ar?.uploaded ? '✓' : '✗'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              patient.exams?.tonometry?.uploaded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              Tono {patient.exams?.tonometry?.uploaded ? '✓' : '✗'}
            </span>
          </div>
        </div>
        
        {/* Timestamps */}
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          <span>Criado {formatRelativeTime(patient.createdAt)}</span>
          <span>•</span>
          <span>Arquivado {formatRelativeTime(patient.updatedAt)}</span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={() => handleReactivate(patient.id)}
          disabled={processingId === patient.id}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
        >
          {processingId === patient.id ? 'Reativando...' : 'Reativar'}
        </button>
        <button
          onClick={() => handleDelete(patient.id, patient.name)}
          disabled={processingId === patient.id}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
        >
          {processingId === patient.id ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </div>
  );

  const renderDateGroup = (dateKey, date, patients) => {
    if (!patients || patients.length === 0) return null;

    return (
      <div key={dateKey} className="mb-6">
        {/* Título da seção com data */}
        <div className="flex items-center mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            {formatDateTitle(date)}
          </h3>
          <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-semibold">
            {patients.length}
          </span>
          <div className="flex-1 ml-3 border-b border-gray-200"></div>
        </div>

        {/* Lista de pacientes */}
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {patients.map(patient => renderPatientRow(patient))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Pacientes Arquivados</h2>
            <p className="text-sm text-indigo-100">Documento: {documentId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando pacientes arquivados...</span>
            </div>
          ) : archivedPatients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente arquivado</h3>
              <p className="text-gray-600">Pacientes arquivados aparecerão aqui organizados por data</p>
            </div>
          ) : (
            <div>
              {groupedPatients.map(group => 
                renderDateGroup(group.dateKey, group.date, group.patients)
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 font-medium">
              {archivedPatients.length} paciente(s) arquivado(s)
            </p>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

