'use client';

import { useState, useEffect } from 'react';
import { subscribeToActivePatients } from '@/utils/patientUtils';
import PatientCard from '@/components/patient/PatientCard';

export default function PatientSelector({ selectedPatient, onPatientSelect }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Subscrever a mudanças em tempo real dos pacientes ativos
    const unsubscribe = subscribeToActivePatients((updatedPatients) => {
      setPatients(updatedPatients);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePatientClick = (patient) => {
    if (onPatientSelect) {
      onPatientSelect(patient);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Selecionar Paciente ({patients.length})
        </h3>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando pacientes...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8">
            {searchTerm ? (
              <div className="text-gray-500">
                <div className="text-2xl mb-2">🔍</div>
                <p>Nenhum paciente encontrado para "{searchTerm}"</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <div className="text-2xl mb-2">👥</div>
                <p>Nenhum paciente ativo</p>
                <p className="text-sm">Aguardando criação de pacientes pelo assistente</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className={`transition-all duration-200 ${
                  selectedPatient?.id === patient.id
                    ? 'ring-2 ring-blue-500 ring-opacity-50'
                    : ''
                }`}
              >
                <PatientCard
                  patient={patient}
                  onClick={handlePatientClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer com paciente selecionado */}
      {selectedPatient && (
        <div className="bg-blue-50 px-4 py-3 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Paciente Selecionado:
              </p>
              <p className="text-blue-700">{selectedPatient.name}</p>
            </div>
            <button
              onClick={() => onPatientSelect(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

