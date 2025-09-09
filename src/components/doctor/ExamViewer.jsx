'use client';

import { useState } from 'react';
import ImageModal from '@/components/common/ImageModal';

/**
 * ExamViewer (layout-only)
 * - SOMENTE layout: não grava nada, não muda lógica de dados
 * - Mostra a imagem no box se existir exam.url (sem exigir 'uploaded')
 * - Mantém modal de zoom/pan ao clicar
 * - iPad estável: usa svh (Small Viewport Height)
 */
export default function ExamViewer({ patient }) {
  const [selectedExam, setSelectedExam] = useState('ar'); // 'ar' | 'tonometry'
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

  const exams = patient?.exams || {};
  const arExam = exams.ar || null;
  const tonoExam = exams.tonometry || null;

  const handleOpenModal = (url, title, examType) => {
    if (!url) return;
    setModalImage({ url, title, examType });
    setShowModal(true);
  };

  const ImageBlock = ({ exam, label, examType }) => {
    // Regra ultra segura: se tem URL, mostra; se não tem, placeholder
    const url = exam?.url || null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{label}</h4>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              url ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'
            }`}
          >
            {url ? 'Enviado' : 'Pendente'}
          </span>
        </div>

        {url ? (
          <div
            className="relative w-full rounded-lg overflow-hidden bg-gray-50 cursor-pointer group"
            onClick={() => handleOpenModal(url, patient?.name || 'Exame', examType)}
            aria-label="Abrir imagem em tela cheia"
          >
            <img
              src={url}
              alt={`Exame ${label}`}
              loading="lazy"
              decoding="async"
              className="w-full h-auto max-h-[70svh] md:max-h-[75vh] object-contain select-none"
              style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
              onError={(e) => {
                // fallback: mantém o src (desativa quebra para não alternar estado visual)
                e.currentTarget.src = url;
              }}
            />
            <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-black/60 text-white opacity-80 group-hover:opacity-100 transition-opacity">
              Toque para ampliar
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">
            Nenhuma imagem enviada.
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Exames do Paciente</h2>
        <p className="text-sm text-gray-600 mb-4">{patient?.name}</p>

        {/* Seletor simples (não persiste em lugar nenhum, apenas local) */}
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

        {/* Renderização do exame selecionado — somente layout */}
        <div className="space-y-6">
          {selectedExam === 'ar' ? (
            <ImageBlock exam={arExam} label="Autorrefrator" examType="ar" />
          ) : (
            <ImageBlock exam={tonoExam} label="Tonometria" examType="tonometry" />
          )}
        </div>
      </div>

      {/* Modal para zoom/pan (opcional) */}
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
