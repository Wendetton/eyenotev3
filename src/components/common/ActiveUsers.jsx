'use client';

export default function ActiveUsers({ activeUsers }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-indigo-500">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Usuários Ativos ({activeUsers.length})
      </h2>
      
      {activeUsers.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <div className="text-2xl mb-2">👥</div>
          <p className="text-sm">Nenhum usuário ativo no momento</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {activeUsers.map(user => (
            <div 
              key={user.id} 
              className="flex items-center bg-gray-50 hover:bg-gray-100 rounded-full px-4 py-2 transition-colors duration-200 border border-gray-200"
            >
              <span 
                className="w-3 h-3 rounded-full mr-3 border border-white shadow-sm" 
                style={{ backgroundColor: user.color || '#6B7280' }}
              ></span>
              <span 
                className="text-sm font-medium"
                style={{ color: user.color || '#374151' }}
              >
                {user.name}
              </span>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Usuários conectados em tempo real neste documento
        </p>
      </div>
    </div>
  );
}

