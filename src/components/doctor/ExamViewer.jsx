'use client';

import { useState } from 'react';
import ImageModal from '@/components/common/ImageModal';

export default function ExamViewer({ patient }) {
  const [selectedExam, setSelectedExam] = useState('ar');
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  if (!patient) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exames</h3>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>Selecione um paciente para visualizar os exames</p>
        </div>
      </div>
    );
  }

  const { exams } = patient;
  const arExam = exams?.ar;
  const tonometryExam = exams?.tonometry;

  const handleImageClick = (examType) => {
    const exam = examType === 'ar' ? arExam : tonometryExam;
    if (exam?.uploaded && exam?.url) {
      setModalImage({
        url: exam.url,
        title: patient.name,
        examType: examType
      });
      setShowModal(true);
    }
  };

  const getExamStatus = (exam) => {
    if (!exam || !exam.uploaded) {
      return { status: 'pending', text: 'Pendente', color: 'text-red-600 bg-red-50' };
    }
    return { status: 'uploaded', text: 'Enviado', color: 'text-green-600 bg-green-50' };
  };

  const arStatus = getExamStatus(arExam);
  const tonometryStatus = getExamStatus(tonometryExam);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Exames do Paciente</h3>
          <p className="text-sm text-gray-600">{patient.name}</p>
        </div>

        {/* Exam Type Selector */}
        <div className="p-4 border-b">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedExam('ar')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedExam === 'ar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              AR - Autorrefrator
            </button>
            <button
              onClick={() => setSelectedExam('tonometry')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedExam === 'tonometry'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tono - Tonometria
            </button>
          </div>
        </div>

        {/* Exam Content */}
        <div className="p-4">
          {selectedExam === 'ar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Autorrefrator</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${arStatus.color}`}>
                  {arStatus.text}
                </span>
              </div>
              
              {arExam?.uploaded ? (
                <div className="space-y-3">
                  <div 
                    className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors group"
                    onClick={() => handleImageClick('ar')}
                  >
                    <img
                      src={arExam.metadata?.thumbnailUrl || arExam.url}
                      alt="Exame AR"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = arExam.url; // Fallback para imagem principal
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {arExam.metadata && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Arquivo: {arExam.metadata.originalName}</p>
                      <p>Enviado: {new Date(arExam.metadata.uploadedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">Exame AR não enviado</p>
                  <p className="text-xs text-gray-400">Aguardando upload pelo assistente</p>
                </div>
              )}
            </div>
          )}

          {selectedExam === 'tonometry' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Tonometria</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tonometryStatus.color}`}>
                  {tonometryStatus.text}
                </span>
              </div>
              
              {tonometryExam?.uploaded ? (
                <div className="space-y-3">
                  <div 
                    className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors group"
                    onClick={() => handleImageClick('tonometry')}
                  >
                    <img
                      src={tonometryExam.metadata?.thumbnailUrl || tonometryExam.url}
                      alt="Exame Tonometria"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = tonometryExam.url; // Fallback para imagem principal
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {tonometryExam.metadata && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Arquivo: {tonometryExam.metadata.originalName}</p>
                      <p>Enviado: {new Date(tonometryExam.metadata.uploadedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">Exame Tonometria não enviado</p>
                  <p className="text-xs text-gray-400">Aguardando upload pelo assistente</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 px-4 py-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status dos Exames:</span>
            <div className="flex space-x-4">
              <span className={`flex items-center space-x-1 ${arStatus.color.split(' ')[0]}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>AR</span>
              </span>
              <span className={`flex items-center space-x-1 ${tonometryStatus.color.split(' ')[0]}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>Tono</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageUrl={modalImage?.url}
        title={modalImage?.title}
        examType={modalImage?.examType}
      />
    </>
  );
}

