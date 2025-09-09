'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ImageModal from '@/components/common/ImageModal';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * ExamViewer — estável em sessão compartilhada e anti-flicker no iPad
 * - SOMENTE leitura: assina patients/{id} na raiz para garantir exams completos.
 * - Dedup de snapshots: só re-renderiza quando a URL realmente muda.
 * - Sticky URL: conserva a última imagem válida (sem “piscada”).
 * - Layout: imagem integral com altura estável (svh), sem transforms.
 */
export default function ExamViewer({ patient }) {
  const [selectedExam, setSelectedExam] = useState('ar'); // 'ar' | 'tonometry'
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // Exames vindos diretamente da raiz (patients/{id})
  const [rootExams, setRootExams] = useState(null);
  const prevRootExamsRef = useRef(null);

  // Sticky URL por exame
  const [displayedArUrl, setDisplayedArUrl] = useState(null);
  const [displayedTonoUrl, setDisplayedTonoUrl] = useState(null);
  const prevArUrlRef = useRef(null);
  const prevTonoUrlRef = useRef(null);

  const patientId = patient?.id || null;
  const propExams = patient?.exams || {};

  // Listener na raiz com DEDUP (só atualiza se URL mudou)
  useEffect(() => {
    if (!patientId) {
      setRootExams(null);
      prevRootExamsRef.current = null;
      return;
    }
    const unsub = onSnapshot(doc(db, 'patients', patientId), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const next = data?.exams || null;

      const prev = prevRootExamsRef.current || {};
      const same =
        (!!prev?.ar?.url === !!next?.ar?.url) &&
        (prev?.ar?.url === next?.ar?.url) &&
        (!!prev?.tonometry?.url === !!next?.tonometry?.url) &&
        (prev?.tonometry?.url === next?.tonometry?.url);

      if (!same) {
        prevRootExamsRef.current = next;
        setRootExams(next);
      }
      // else: ignora mudanças irrelevantes (ex.: updatedAt/presença)
    });

    return () => unsub && unsub();
  }, [patientId]);

  // Normalização
  const ensureExam = (exam) => {
    if (!exam) return { uploaded: false, url: null, uploadedAt: null, metadata: null };
    const { uploaded = !!exam.url, url = null, uploadedAt = null, metadata = null } = exam;
    return { uploaded, url, uploadedAt, metadata };
  };

  // Mescla props + raiz (prioriza quem tem URL)
  const mergedExams = useMemo(() => {
    const arProp = ensureExam(propExams?.ar);
    const toProp = ensureExam(propExams?.tonometry);
    const arRoot = ensureExam(rootExams?.ar);
    const toRoot = ensureExam(rootExams?.tonometry);

    return {
      ar: arRoot.url ? arRoot : (arProp.url ? arProp : arRoot),
      tonometry: toRoot.url ? toRoot : (toProp.url ? toProp : toRoot),
    };
  }, [propExams?.ar, propExams?.tonometry, rootExams?.ar, rootExams?.tonometry]);

  // Sticky AR
  useEffect(() => {
    const next = mergedExams.ar?.url || null;
    if (next && next !== prevArUrlRef.current) {
      prevArUrlRef.current = next;
      setDisplayedArUrl(next);
    } else if (!displayedArUrl && next) {
      prevArUrlRef.current = next;
      setDisplayedArUrl(next);
    }
    // não limpa quando vem null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedExams.ar?.url]);

  // Sticky Tonometria
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

  const statusChip = (hasUrl) => (hasUrl ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100');

  const ImageBlock = ({ label, examType, stickyUrl, liveUrl }) => {
    // prioridade: stickyUrl (última válida) > liveUrl
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
              // Evita flicker no iOS: carregar logo, sem hints assíncronos
              loading="eager"
              draggable={false}
              className="w-full h-auto max-h-[70svh] md:max-h-[75vh] object-contain select-none"
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
              onError={(e) => {
                // Mantém última imagem boa
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
              selectedExam === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'ar'}
          >
            AR
          </button>

          <button
            onClick={() => setSelectedExam('tonometry')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedExam === 'tonometry' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={selectedExam === 'tonometry'}
          >
            Tonometria
          </button>
        </div>

        {/* Renderização do exame selecionado */}
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
