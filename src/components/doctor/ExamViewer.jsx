'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ImageModal from '@/components/common/ImageModal';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * ExamViewer — layout “enxuto” + anti-flicker iPad
 * - Leitura: assina patients/{id} (raiz) e mescla com props.
 * - Dedup de snapshots e Sticky URL (sem “piscada”).
 * - Se canEdit === true, mostra barra para substituir a imagem do exame selecionado (AR/Tonometria).
 */
export default function ExamViewer({ patient, canEdit = false }) {
  const [selectedExam, setSelectedExam] = useState('ar'); // 'ar' | 'tonometry'
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // Exames vindos diretamente da raiz (patients/{id})
  const [rootExams, setRootExams] = useState(null);
  const prevRootExamsRef = useRef(null);

  // Sticky URL por exame (evita “piscar” no iOS/Chrome)
  const [displayedArUrl, setDisplayedArUrl] = useState(null);
  const [displayedTonoUrl, setDisplayedTonoUrl] = useState(null);
  const prevArUrlRef = useRef(null);
  const prevTonoUrlRef = useRef(null);

  // Upload refs/estado
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const patientId = patient?.id || null;
  const propExams = patient?.exams || {};

  // Listener na raiz com dedup: só muda se a URL realmente mudou
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
    });
    return () => unsub && unsub();
  }, [patientId]);

  // Normalização defensiva
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

  /* ---------- Upload / Substituição ---------- */

  const triggerPickFile = () => {
    if (!patientId || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    // limpa o input para permitir re-seleção do mesmo arquivo depois
    e.target.value = '';
    if (!file || !patientId) return;

    try {
      setIsUploading(true);

      // examType conforme seleção atual do toggle
      const examType = selectedExam === 'tonometry' ? 'tonometry' : 'ar';

      // path único para bustar cache
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const path = `exams/${patientId}/${examType}/${patientId}_${examType}_${Date.now()}.${ext}`;

      const sref = storageRef(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);

      // Atualiza Firestore (merge) no doc raiz do paciente
      const payload = {
        exams: {
          [examType]: {
            uploaded: true,
            url,
            uploadedAt: serverTimestamp(),
            metadata: {
              name: file.name,
              size: file.size,
              type: file.type || null,
            },
          },
        },
      };
      await setDoc(doc(db, 'patients', patientId), payload, { merge: true });

      // Atualiza sticky imediatamente para evitar “piscar”
      if (examType === 'ar') {
        prevArUrlRef.current = url;
        setDisplayedArUrl(url);
      } else {
        prevTonoUrlRef.current = url;
        setDisplayedTonoUrl(url);
      }
    } catch (err) {
      console.error('Falha ao enviar/substituir imagem:', err);
      alert('Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  /* ---------- UI enxuta ---------- */

  const Toggle = () => (
    <div className="inline-flex rounded-md bg-gray-100 p-1">
      <button
        onClick={() => setSelectedExam('ar')}
        className={`px-3 py-1.5 text-xs rounded-md transition ${
          selectedExam === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        }`}
        aria-pressed={selectedExam === 'ar'}
      >
        AR
      </button>
      <button
        onClick={() => setSelectedExam('tonometry')}
        className={`px-3 py-1.5 text-xs rounded-md transition ${
          selectedExam === 'tonometry' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        }`}
        aria-pressed={selectedExam === 'tonometry'}
      >
        Tonometria
      </button>
    </div>
  );

  const ImageBlock = ({ label, examType, stickyUrl, liveUrl }) => {
    const url = stickyUrl || liveUrl || null;

    return (
      <div>
        {/* título discreto acima da imagem (sem chips/labels laterais) */}
        <div className="mb-2 text-sm font-medium text-gray-800">{label}</div>

        {url ? (
          <div
            className="relative w-full rounded-lg overflow-hidden bg-gray-50 cursor-pointer"
            onClick={() => handleOpenModal(url, patient?.name || 'Exame', examType)}
            aria-label="Abrir imagem em tela cheia"
          >
            <img
              src={url}
              alt={`Exame ${label}`}
              loading="eager"          /* anti-flicker iOS */
              draggable={false}
              className="w-full h-auto max-h-[74svh] md:max-h-[78svh] object-contain select-none"
              style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
              onError={(e) => {
                e.currentTarget.src = url; // mantém última boa
              }}
            />
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
      <div className="bg-white p-4 rounded-lg shadow-lg border-t-4 border-purple-500">
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📋</div>
          <p>Selecione um paciente para visualizar os exames</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow-lg border-t-4 border-purple-500">
        {/* header compacto: título + toggle */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Exames do Paciente</h2>
          <Toggle />
        </div>

        {/* barra de substituição (somente quando canEdit) */}
        {canEdit && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Substituir imagem do exame:&nbsp;
              <strong>{selectedExam === 'ar' ? 'Autorrefrator' : 'Tonometria'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                onClick={triggerPickFile}
                disabled={!patientId || isUploading}
                className={`px-3 py-1.5 text-sm rounded-md border shadow-sm ${
                  isUploading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploading ? 'Enviando...' : 'Selecionar imagem'}
              </button>
            </div>
          </div>
        )}

        {/* imagem dominante */}
        <div className="space-y-4">
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
