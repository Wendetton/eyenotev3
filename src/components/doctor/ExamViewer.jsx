'use client';

import { useState } from 'react';
import ImageModal from '@/components/common/ImageModal';

/**
 * ExamViewer
 * - Exibe imagem INTEGRAL no próprio box (sem necessidade de clique)
 * - Mantém o modal para zoom/pan quando o usuário quiser ampliar
 * - Corrige comportamento em iPad/iOS: usa svh para viewport estável
 * - Não altera Firestore nem a colaboração em tempo real
 */
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
        title: patient.name || 'Exame',
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

  const ImageBox = ({ exam, alt, onClick }) => {
    if (!exam?.uploaded || !exam?.url) {
      return (
        <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">
          Nenhuma imagem enviada.
        </div>
      );
    }

    // Preferir renderização nítida em telas retina, sem cortar
    const thumb = exam?.metadata?.thumbnailUrl || exam.url;

    return (
      <div
        className="relative w-full rounded-lg overflow-hidden bg-gray-50 cursor-pointer group"
        onClick={onClick}
        aria-label="Abrir imagem em tela cheia"
      >
        <img
          src={exam.url}
          srcSet={`${thumb} 480w, ${exam.url} 1280w, ${exam.url} 1920w`}
          sizes="(max-width: 1280px) 100vw, 33vw"
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-auto max-h-[70svh] md:max-h-[75vh] object-contain select-none"
          onError={(e) => {
            e.currentTarget.src = exam.url;
          }}
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        />
        <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-black/60 text-white opacity-80 group-hover:opacity-100 transition-opacity">
          Toque para ampliar
        </div>
      </div>
    );
  };

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

        {/* Renderização do exame selecionado: imagem integral no box */}
        <div className="space-y-6">
          {selectedExam === 'ar' ? (
            <ImageBox
              exam={arExam}
              alt="Exame de Autorrefração"
              onClick={() => handleImageClick('ar')}
            />
          ) : (
            <ImageBox
              exam={tonometryExam}
              alt="Exame de Tonometria"
              onClick={() => handleImageClick('tonometry')}
            />
          )}
        </div>
      </div>

      {/* Modal de zoom/pan (opcional) */}
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
