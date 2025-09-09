'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ImageModal from '@/components/common/ImageModal';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * ExamViewer — robusto para sessão compartilhada
 * - NÃO altera Firestore: somente leitura (assina patients/{id} na raiz)
 * - Quando a ficha abrir "remotamente" em outro device, o componente
 *   busca os 'exams' na raiz e MESCLA com o que veio pelo paciente prop.
 * - "Sticky URL": não limpa a imagem se o snapshot vier temporariamente sem 'url'.
 * - Layout: imagem integral (object-contain) com altura estável no iPad (svh).
 */
export default function ExamViewer({ patient }) {
  const [selectedExam, setSelectedExam] = useState('ar'); // 'ar' | 'tonometry'
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // Exames vindos diretamente da raiz (patients/{id}), em tempo real
  const [rootExams, setRootExams] = useState(null);

  // Sticky URL por exame (evita "piscadas" e sumiços entre devices)
  const [displayedArUrl, setDisplayedArUrl] = useState(null);
  const [displayedTonoUrl, setDisplayedTonoUrl] = useState(null);
  const prevArUrlRef = useRef(null);
  const prevTonoUrlRef = useRef(null);

  const patientId = patient?.id || null;
  const propExams = patient?.exams || {};

  // Assina a raiz para garantir que temos 'exams' completos mesmo quando a ficha
  // abre "de fora" (sincronização de sessão) e as props não trazem as URLs.
  useEffect(() => {
    if (!patientId) {
      setRootExams(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'patients', patientId), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setRootExams(data?.exams || null);
    });
    return () => unsub && unsub();
  }, [patientId]);

  // Normalização defensiva
  const ensureExam = (exam) => {
    if (!exam) return { uploaded: false, url: null, uploadedAt: null, metadata: null };
    const { uploaded = !!exam.url, url = null, uploadedAt = null, metadata = null } = exam;
    return { uploaded, url, uploadedAt, metadata };
  };

  // Mescla exames: prioridade para o que tiver URL (geralmente raiz chega mais completo)
  const mergedExams = useMemo(() => {
    const ar = ensureExam(propExams?.ar);
    const to = ensureExam(propExams?.tonometry);
    const rootAr = ensureExam(rootExams?.ar);
    const rootTo = ensureExam(rootExams?.tonometry);

    return {
      ar: rootAr.url ? rootAr : ar.url ? ar : rootAr,             // prioriza quem tem URL
      tonometry: rootTo.url ? rootTo : to.url ? to : rootTo,
    };
  }, [propExams?.ar, propExams?.tonometry, rootExams?.ar, rootExams?.tonometry]);

  // Atualiza sticky para AR quando aparecer uma URL válida
  useEffect(() => {
    const next = mergedExams.ar?.url || null;
    if (next && next !== prevArUrlRef.current) {
      prevArUrlRef.current = next;
      setDisplayedArUrl(next);
    } else if (!displayedArUrl && next) {
      prevArUrlRef.current = next;
      setDisplayedArUrl(next);
    }
    // não limpamos se vier null; mantemos sticky
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedExams.ar?.url]);

  // Atualiza sticky para Tonometria quando aparecer uma URL válida
  useEffect(() => {
    const next = mergedExams.tonometry?.url || null;
    if (next && next !== prevTonoUrlRef.current) {
      prevTonoUrlRef.current = next;
      setDisplayedTonoUrl(next);
    } else if (!displayedTonoUrl && next) {
      prevTonoUrlRef.current = next;
      setDisplayedTonoUrl(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedExams.tonometry?.url]);

  const handleOpenModal = (url, title, examType) => {
    if (!url) return;
    setModalImage({ url, title, examType });
    setShowModal(true);
  };

  const statusChip = (hasUrl) =>
    hasUrl ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100';

  const ImageBlock = ({ label, examType, stickyUrl, liveUrl }) => {
    // prioridade: stickyUrl (última válida) > liveUrl atual
    const url = stickyUrl || liveUrl || null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{label}</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusChip(!!url)}`}>
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
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                contain: 'content',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)', // ajuda a estabilizar no Safari
              }}
              onError={(e) => {
                // Mantém a última imagem boa; se falhar, não limpa a tela
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

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Exames do Paciente</h2>
        <p className="text-sm text-gray-600 mb-4">{patient?.name}</p>

        {/* Seletor local */}
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

        {/* Renderização do exame selecionado (merge + sticky) */}
        <div className="space-y-6">
          {selectedExam === 'ar' ? (
            <ImageBlock
              label="Autorrefrator"
              examType="ar"
              stickyUrl={displayedArUrl}
              liveUrl={mergedExams.ar?.url || null}
            />
          ) : (
            <ImageBlock
              label="Tonometria"
              examType="tonometry"
              stickyUrl={displayedTonoUrl}
              liveUrl={mergedExams.tonometry?.url || null}
            />
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
