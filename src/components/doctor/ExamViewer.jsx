'use client';

import { useState } from 'react';
import ImageModal from '@/components/common/ImageModal';

/**
 * ExamViewer
 * - Exibe imagem INTEGRAL no box (sem necessidade de clique)
 * - Mantém modal para zoom/pan quando o usuário quiser ampliar
 * - Corrige comportamento em iPad/iOS com svh
 * - Considera 'url' disponível como suficiente para exibir a imagem
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
    if (exam?.url) {
      setModalImage({
        url: exam.url,
        title: patient.name || 'Exame',
        examType: examType,
      });
      setShowModal(true);
    }
  };

  const getExamStatus = (exam) => {
    // Se já existe URL, consideramos "Enviado" (mesmo que 'uploaded' ainda não tenha propagado)
    if (exam?.url || exam?.uploaded) {
      return { status: 'uploaded', text: 'Enviado', color: 'text-green-600 bg-green-50' };
    }
    return { status: 'pending', text: 'Pendente', color: 'text-red-600 bg-red-50' };
  };

  const arStatus = getExamStatus(arExam);
  const tonometryStatus = getExamStatus(tonometryExam);

  const ImageBox = ({ exam, alt, onClick }) => {
    if (!exam?.url && !exam?.uploaded) {
      return (
        <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">
          Nenhuma imagem enviada.
        </div>
      );
    }

    const fullUrl = exam.url;
    const thumb = exam?.metadata?.thumbnailUrl || fullUrl;

    return (
      <div
        className="relative w-full rounded-lg overflow-hidden bg-gray-50 cursor-pointer group"
        onClick={onClick}
        aria-label="Abrir imagem em tela cheia"
      >
        <img
          src={fullUrl}
          srcSet={`${thumb} 480w, ${fullUrl} 1280w, ${fullUrl} 1920w`}
          sizes="(max-width: 1280px) 100vw, 33vw"
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-auto max-h-[70svh] md:max-h-[75vh] object-contain select-none"
          onError={(e) => {
            e.currentTarget.src = fullUrl;
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'ar'}
          >
            AR
          </button>

          <button
            onClick={() => setSelectedExam('tonometry')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedExam === 'tonometry'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'tonometry'}
          >
            Tonometria
          </button>
        </div>

        {/* Blocos de exame */}
        <div className="space-y-4">
          {selectedExam === 'ar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Autorrefrator</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${arStatus.color}`}>
                  {arStatus.text}
                </span>
              </div>
              <ImageBox exam={arExam} alt="Exame de Autorrefração" onClick={() => handleImageClick('ar')} />
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
              <ImageBox
                exam={tonometryExam}
                alt="Exame de Tonometria"
                onClick={() => handleImageClick('tonometry')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de zoom/pan */}
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
