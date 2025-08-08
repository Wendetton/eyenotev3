# Eyenote - Sistema de Gestão Oftalmológica Expandido

Sistema colaborativo em tempo real para gestão de receitas oftalmológicas com funcionalidades expandidas para gerenciamento de pacientes e visualização de exames.

## 🚀 Funcionalidades

### 👨‍⚕️ Perfil Médico
- **Seleção de Pacientes**: Lista em tempo real de pacientes ativos
- **Visualização de Exames**: Visualizador avançado com zoom e pan para exames AR e Tonometria
- **Receita Integrada**: Interface original preservada com todos os campos oftalmológicos
- **Sincronização Real-time**: Atualizações instantâneas entre dispositivos
- **Histórico de Pacientes**: Acesso a pacientes arquivados

### 👩‍💼 Perfil Assistente
- **Gestão de Pacientes**: Criar, editar e arquivar pacientes
- **Upload de Exames**: Upload simultâneo de exames AR e Tonometria
- **Compressão Automática**: Otimização automática de imagens
- **Status Visual**: Indicadores de status dos exames (Completo/Parcial/Pendente)
- **Busca e Filtros**: Localização rápida de pacientes

### 🖼️ Sistema de Imagens
- **Firebase Storage**: Armazenamento seguro e escalável
- **Thumbnails**: Geração automática para carregamento rápido
- **Visualizador Avançado**: Modal com zoom, pan e controles de teclado
- **Metadados**: Informações completas de upload e arquivo
- **Fallback**: Sistema robusto de fallback para imagens

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Firebase Firestore (tempo real)
- **Storage**: Firebase Storage
- **Deploy**: Vercel
- **Linguagem**: TypeScript/JavaScript

## 📋 Estrutura do Projeto

```
src/
├── app/
│   ├── page.js                    # Seleção de perfil
│   ├── doctor/
│   │   └── page.jsx              # Dashboard médico
│   ├── assistant/
│   │   └── page.jsx              # Dashboard assistente
│   ├── patient/[patientId]/
│   │   └── page.jsx              # Página integrada do paciente
│   └── doc/[docId]/
│       └── page.js               # Sistema original preservado
├── components/
│   ├── common/
│   │   ├── ProfileSelector.jsx   # Seleção de perfil
│   │   └── ImageModal.jsx        # Modal de visualização
│   ├── doctor/
│   │   ├── PatientSelector.jsx   # Seletor de pacientes
│   │   └── ExamViewer.jsx        # Visualizador de exames
│   ├── assistant/
│   │   └── PatientCreationForm.jsx # Formulário de criação
│   └── patient/
│       └── PatientCard.jsx       # Card de paciente
├── hooks/
│   └── useImageUpload.js         # Hook de upload
├── utils/
│   └── patientUtils.js           # Utilitários de pacientes
└── lib/
    └── firebase.js               # Configuração Firebase
```

## 🔧 Instalação e Configuração

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/eyenote-expandido.git
cd eyenote-expandido
```

### 2. Instalar Dependências
```bash
npm install --force
```

### 3. Configurar Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Configure Firestore Database e Storage
3. Copie as configurações para `.env.local`

### 4. Executar Localmente
```bash
npm run dev
```

## 🚀 Deploy

Consulte o arquivo `INSTRUCOES_DEPLOY.md` para instruções detalhadas de deploy no Vercel.

## 📊 Estrutura de Dados

### Pacientes (Firestore)
```javascript
{
  id: "patient_id",
  name: "Nome do Paciente",
  status: "active" | "archived",
  createdAt: timestamp,
  updatedAt: timestamp,
  exams: {
    ar: {
      uploaded: boolean,
      url: string,
      uploadedAt: timestamp,
      metadata: {
        originalName: string,
        size: number,
        type: string,
        thumbnailUrl: string
      }
    },
    tonometry: { /* mesma estrutura */ }
  }
}
```

### Imagens (Firebase Storage)
```
patients/
├── {patientId}/
│   ├── ar/
│   │   ├── original_image.jpg
│   │   └── thumbnail_image.jpg
│   └── tonometry/
│       ├── original_image.jpg
│       └── thumbnail_image.jpg
```

## 🔒 Segurança

- **Regras Firestore**: Controle de acesso por documento
- **Regras Storage**: Controle de upload por estrutura
- **Validação Client-side**: Validação de tipos e tamanhos
- **Compressão**: Redução automática de tamanho

## 🎯 Fluxo de Trabalho

1. **Assistente** cria paciente e faz upload dos exames
2. **Sistema** processa e armazena imagens com thumbnails
3. **Médico** seleciona paciente e visualiza exames
4. **Médico** preenche receita com sincronização em tempo real
5. **Sistema** mantém histórico e permite arquivamento

## 📱 Responsividade

- **Desktop**: Interface completa com painéis lado a lado
- **Tablet**: Layout adaptativo com navegação por abas
- **Mobile**: Interface otimizada para toque

## 🔄 Sincronização

- **Firestore Real-time**: Atualizações instantâneas
- **Presença de Usuários**: Indicadores de usuários ativos
- **Conflito de Edição**: Resolução automática
- **Offline Support**: Funcionalidade básica offline

## 📈 Performance

- **Lazy Loading**: Carregamento sob demanda
- **Image Optimization**: Compressão e thumbnails
- **Code Splitting**: Divisão automática de código
- **Caching**: Cache inteligente de recursos

## 🆘 Suporte

Para dúvidas ou problemas:
1. Consulte `INSTRUCOES_DEPLOY.md`
2. Verifique logs no Firebase Console
3. Verifique logs no Vercel Dashboard

## 📄 Licença

Este projeto é proprietário e destinado ao uso médico específico.

---

**Desenvolvido com ❤️ para otimizar o atendimento oftalmológico**

