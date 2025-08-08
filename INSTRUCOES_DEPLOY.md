# Instruções de Deploy - Eyenote Expandido

## 📋 Pré-requisitos

1. **Conta no Firebase**
   - Acesse [Firebase Console](https://console.firebase.google.com/)
   - Crie um novo projeto ou use um existente

2. **Conta no Vercel**
   - Acesse [Vercel](https://vercel.com/)
   - Conecte sua conta GitHub

3. **Node.js**
   - Versão 18 ou superior

## 🔧 Configuração do Firebase

### 1. Configurar Firestore Database

1. No Firebase Console, vá para **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha **Modo de teste** (para desenvolvimento)
4. Selecione uma localização próxima

### 2. Configurar Firebase Storage

1. No Firebase Console, vá para **Storage**
2. Clique em **Começar**
3. Aceite as regras padrão (para desenvolvimento)

### 3. Obter Configurações do Firebase

1. No Firebase Console, vá para **Configurações do projeto** (ícone de engrenagem)
2. Na aba **Geral**, role até **Seus aplicativos**
3. Clique em **Adicionar app** > **Web** (ícone `</>`)
4. Registre o app com nome "Eyenote"
5. Copie as configurações que aparecem

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` com suas configurações:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

## 🚀 Deploy no Vercel

### 1. Preparar Repositório

```bash
# Criar repositório no GitHub
git init
git add .
git commit -m "Initial commit - Eyenote Expandido"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/eyenote-expandido.git
git push -u origin main
```

### 2. Deploy no Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **New Project**
3. Importe seu repositório GitHub
4. Configure as variáveis de ambiente:
   - Adicione todas as variáveis do arquivo `.env.local`
5. Clique em **Deploy**

### 3. Configurar Domínio (Opcional)

1. No dashboard do Vercel, vá para **Settings** > **Domains**
2. Adicione seu domínio personalizado

## 🔒 Configurar Regras de Segurança

### Firestore Rules

No Firebase Console, vá para **Firestore Database** > **Regras** e substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso aos documentos de pacientes
    match /patients/{patientId} {
      allow read, write: if true; // Para desenvolvimento
    }
    
    // Permitir acesso aos documentos colaborativos existentes
    match /documents/{documentId} {
      allow read, write: if true;
    }
  }
}
```

### Storage Rules

No Firebase Console, vá para **Storage** > **Regras** e substitua por:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir upload e download de imagens de pacientes
    match /patients/{patientId}/{examType}/{fileName} {
      allow read, write: if true; // Para desenvolvimento
    }
  }
}
```

## 🧪 Teste Local

```bash
# Instalar dependências
npm install --force

# Executar em desenvolvimento
npm run dev

# Acessar http://localhost:3000
```

## 📱 Funcionalidades Implementadas

### ✅ Perfil Assistente
- Criar pacientes
- Upload de exames (AR e Tonometria)
- Visualizar lista de pacientes
- Arquivar pacientes

### ✅ Perfil Médico
- Selecionar pacientes
- Visualizar exames com zoom
- Interface de receita integrada
- Sincronização em tempo real

### ✅ Sistema de Imagens
- Upload para Firebase Storage
- Compressão automática
- Geração de thumbnails
- Visualizador com zoom e pan

## 🔧 Manutenção

### Backup dos Dados

```bash
# Exportar dados do Firestore
firebase firestore:export gs://seu-projeto.appspot.com/backups/$(date +%Y%m%d)
```

### Monitoramento

- Use o Firebase Console para monitorar uso
- Configure alertas de quota no Vercel
- Monitore logs de erro no Vercel Dashboard

## 🆘 Solução de Problemas

### Erro de Conexão Firebase
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto Firebase está ativo
- Verifique as regras de segurança

### Erro de Upload de Imagens
- Confirme se o Firebase Storage está configurado
- Verifique as regras de Storage
- Teste com imagens menores (< 5MB)

### Erro de Build no Vercel
- Verifique se todas as dependências estão no package.json
- Confirme se as variáveis de ambiente estão configuradas
- Verifique os logs de build no Vercel

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no Firebase Console
2. Verifique os logs no Vercel Dashboard
3. Teste localmente primeiro
4. Consulte a documentação do Firebase e Vercel

---

**Importante**: Este sistema foi desenvolvido para uso médico. Certifique-se de seguir todas as regulamentações de privacidade e segurança de dados médicos aplicáveis à sua região.

