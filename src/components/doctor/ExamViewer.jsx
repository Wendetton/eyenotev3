'use client';

import { useState } from 'react';
import ImageModal from '@/components/common/ImageModal';

export default function ExamViewer({ patient }) {
  const [selectedExam, setSelectedExam] = useState('ar');
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  if (!patient) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Exames do Paciente</h2>
        <div className="text-center text-gray-500 py-8">
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
    if (!exam || !exam.uploaded || !exam.url) {
      return {
        label: 'sem exame',
        color: 'text-gray-500',
        bg: 'bg-gray-100',
        icon: '⬜'
      };
    }
    return {
      label: 'disponível',
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: '🟩'
    };
  };

  const arStatus = getExamStatus(arExam);
  const tonometryStatus = getExamStatus(tonometryExam);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Exames do Paciente</h2>
        <p className="text-sm text-gray-600 mb-4">{patient.name}</p>

        {/* Seletor AR/TONO */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setSelectedExam('ar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedExam === 'ar'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'ar'}
          >
            Autorrefração
          </button>

          <button
            onClick={() => setSelectedExam('tonometry')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedExam === 'tonometry'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'tonometry'}
          >
            Tonometria
          </button>
        </div>

        {/* Cards de status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-3 rounded-lg border ${arStatus.bg} flex items-center justify-between`}>
            <span className="flex items-center space-x-2">
              <span className="text-lg">{arStatus.icon}</span>
              <span className="text-sm text-gray-700">AR</span>
            </span>
            <span className={`text-xs font-medium ${arStatus.color}`}>{arStatus.label}</span>
          </div>

          <div className={`p-3 rounded-lg border ${tonometryStatus.bg} flex items-center justify-between`}>
            <span className="flex items-center space-x-2">
              <span className="text-lg">{tonometryStatus.icon}</span>
              <span className="text-sm text-gray-700">Tonometria</span>
            </span>
            <span className={`text-xs font-medium ${tonometryStatus.color}`}>{tonometryStatus.label}</span>
          </div>
        </div>

        {/* Renderização do exame selecionado (IMAGEM INTEGRAL NO BOX) */}
        <div className="space-y-6">
          {selectedExam === 'ar' ? (
            <div className="space-y-3">
              {arExam?.uploaded ? (
                <div
                  className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleImageClick('ar')}
                  aria-label="Abrir AR em tela cheia"
                >
                  <img
                    src={arExam.url}
                    srcSet={`${arExam?.metadata?.thumbnailUrl || arExam.url} 480w, ${arExam.url} 1920w`}
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    alt="Exame AR"
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-[70vh] object-contain rounded-md bg-gray-50"
                    onError={(e) => {
                      e.currentTarget.src = arExam.url; // Fallback
                    }}
                  />
                  {/* etiqueta superior opcional */}
                  <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-black/60 text-white">
                    Clique para ampliar
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">
                  Nenhuma imagem de AR enviada.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tonometryExam?.uploaded ? (
                <div
                  className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => handleImageClick('tonometry')}
                  aria-label="Abrir Tonometria em tela cheia"
                >
                  <img
                    src={tonometryExam.url}
                    srcSet={`${tonometryExam?.metadata?.thumbnailUrl || tonometryExam.url} 480w, ${tonometryExam.url} 1920w`}
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    alt="Exame Tonometria"
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-[70vh] object-contain rounded-md bg-gray-50"
                    onError={(e) => {
                      e.currentTarget.src = tonometryExam.url; // Fallback
                    }}
                  />
                  <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-black/60 text-white">
                    Clique para ampliar
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">
                  Nenhuma imagem de Tonometria enviada.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé/resumo */}
        <div className="mt-6 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span className={`flex items-center space-x-1 ${arStatus.color.split(' ')[0]}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>AR</span>
              </span>
              <span className={`flex items-center space-x-1 ${tonometryStatus.color.split(' ')[0]}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>TONO</span>
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Modal ainda disponível para zoom/pan */}
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
