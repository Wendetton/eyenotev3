'use client';

import { formatRelativeTime, hasAllExams, hasAnyExam } from '@/utils/patientUtils';

export default function PatientCard({ patient, onClick, showArchiveButton = false, onArchive }) {
  const handleClick = () => {
    if (onClick) {
      onClick(patient);
    }
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(patient.id);
    }
  };

  const getStatusColor = () => {
    if (hasAllExams(patient)) {
      return 'bg-green-100 border-green-300 text-green-800';
    } else if (hasAnyExam(patient)) {
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    } else {
      return 'bg-red-100 border-red-300 text-red-800';
    }
  };

  const getStatusText = () => {
    if (hasAllExams(patient)) {
      return 'Completo';
    } else if (hasAnyExam(patient)) {
      return 'Parcial';
    } else {
      return 'Pendente';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
        patient.status === 'active' 
          ? 'bg-blue-50 border-blue-200 hover:border-blue-300' 
          : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
      }`}
    >
      {/* Header com nome e status */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800 truncate pr-2">
          {patient.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
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

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mb-2">
        Criado {formatRelativeTime(patient.createdAt)}
      </div>

      {/* Botão de arquivar (se aplicável) */}
      {showArchiveButton && (
        <button
          onClick={handleArchive}
          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors duration-200"
          title="Arquivar paciente"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 3a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

