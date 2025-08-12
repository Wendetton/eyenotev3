'use client';

export default function ProfileSelector({ onProfileSelect }) {
  const handleProfileSelection = (profile) => {
    if (onProfileSelect) {
      onProfileSelect(profile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Botão Médico */}
        <button
          onClick={() => handleProfileSelection('doctor')}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          <div className="relative z-10">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <h2 className="text-3xl font-bold mb-2">Médico</h2>
            <p className="text-blue-100 text-sm">
              Atender pacientes e visualizar exames
            </p>
          </div>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        </button>

        {/* Botão Assistente */}
        <button
          onClick={() => handleProfileSelection('assistant')}
          className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          <div className="relative z-10">
            <div className="text-6xl mb-4">👩‍💼</div>
            <h2 className="text-3xl font-bold mb-2">Assistente</h2>
            <p className="text-green-100 text-sm">
              Gerenciar pacientes e adicionar exames
            </p>
          </div>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Para testar a colaboração, abra o mesmo link em duas janelas ou navegadores diferentes.</p>
      </div>
    </div>
  );
}

