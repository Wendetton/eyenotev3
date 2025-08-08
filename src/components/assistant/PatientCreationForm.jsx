'use client';

import { useState } from 'react';
import { createPatient } from '@/utils/patientUtils';
import { useImageUpload } from '@/hooks/useImageUpload';

export default function PatientCreationForm({ onPatientCreated, onCancel }) {
  const [patientName, setPatientName] = useState('');
  const [arFile, setArFile] = useState(null);
  const [tonometryFile, setTonometryFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const { uploadMultipleImages, uploadProgress, uploadErrors, isUploading } = useImageUpload();

  const handleFileChange = (examType, file) => {
    if (examType === 'ar') {
      setArFile(file);
    } else if (examType === 'tonometry') {
      setTonometryFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!patientName.trim()) {
      setError('Nome do paciente é obrigatório');
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      // Criar paciente no Firestore
      const newPatient = await createPatient({
        name: patientName.trim()
      });

      // Upload das imagens se fornecidas
      const filesToUpload = {};
      if (arFile) filesToUpload.ar = arFile;
      if (tonometryFile) filesToUpload.tonometry = tonometryFile;

      if (Object.keys(filesToUpload).length > 0) {
        await uploadMultipleImages(filesToUpload, newPatient.id);
      }

      // Notificar componente pai
      if (onPatientCreated) {
        onPatientCreated(newPatient);
      }

      // Resetar formulário
      setPatientName('');
      setArFile(null);
      setTonometryFile(null);

    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      setError(error.message || 'Erro ao criar paciente');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = patientName.trim().length > 0;
  const isProcessing = isCreating || isUploading;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Criar Novo Paciente
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome do paciente */}
        <div>
          <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Paciente *
          </label>
          <input
            type="text"
            id="patientName"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Digite o nome do paciente"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            disabled={isProcessing}
            required
          />
        </div>

        {/* Upload AR */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AR - Autorrefrator
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('ar', e.target.files[0])}
              className="hidden"
              id="ar-upload"
              disabled={isProcessing}
            />
            <label htmlFor="ar-upload" className="cursor-pointer">
              <div className="text-blue-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                {arFile ? arFile.name : 'Clique para adicionar foto'}
              </p>
            </label>
            {uploadProgress.ar > 0 && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.ar}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress.ar}%</p>
              </div>
            )}
            {uploadErrors.ar && (
              <p className="text-red-500 text-xs mt-1">{uploadErrors.ar}</p>
            )}
          </div>
        </div>

        {/* Upload Tonometria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tono - Tonometria
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('tonometry', e.target.files[0])}
              className="hidden"
              id="tonometry-upload"
              disabled={isProcessing}
            />
            <label htmlFor="tonometry-upload" className="cursor-pointer">
              <div className="text-blue-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                {tonometryFile ? tonometryFile.name : 'Clique para adicionar foto'}
              </p>
            </label>
            {uploadProgress.tonometry > 0 && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.tonometry}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress.tonometry}%</p>
              </div>
            )}
            {uploadErrors.tonometry && (
              <p className="text-red-500 text-xs mt-1">{uploadErrors.tonometry}</p>
            )}
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Botões */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isProcessing}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isProcessing ? 'Criando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

