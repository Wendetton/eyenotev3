import { useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { updateExamStatus } from '@/utils/patientUtils';

// Função para redimensionar imagem
const resizeImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para blob
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Função para gerar thumbnail
const generateThumbnail = (file, size = 300) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      
      let newWidth, newHeight;
      if (aspectRatio > 1) {
        newWidth = size;
        newHeight = size / aspectRatio;
      } else {
        newHeight = size;
        newWidth = size * aspectRatio;
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const useImageUpload = () => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
    }
    
    return true;
  };

  const uploadImage = useCallback(async (file, patientId, examType) => {
    try {
      setIsUploading(true);
      setUploadErrors(prev => ({ ...prev, [examType]: null }));
      setUploadProgress(prev => ({ ...prev, [examType]: 0 }));

      // Validar arquivo
      validateFile(file);

      // Processar imagem
      const resizedImage = await resizeImage(file);
      const thumbnail = await generateThumbnail(file);

      // Gerar nomes únicos para os arquivos
      const timestamp = Date.now();
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const imagePath = `patients/${patientId}/${examType}/${timestamp}_${originalName}.jpg`;
      const thumbnailPath = `patients/${patientId}/${examType}/thumb_${timestamp}_${originalName}.jpg`;

      // Upload da imagem principal
      const imageRef = ref(storage, imagePath);
      const imageUploadTask = uploadBytesResumable(imageRef, resizedImage);

      // Upload do thumbnail
      const thumbnailRef = ref(storage, thumbnailPath);
      const thumbnailUploadTask = uploadBytesResumable(thumbnailRef, thumbnail);

      // Monitorar progresso do upload principal
      imageUploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [examType]: Math.round(progress) }));
        },
        (error) => {
          console.error('Erro no upload:', error);
          setUploadErrors(prev => ({ ...prev, [examType]: 'Erro no upload da imagem' }));
          setIsUploading(false);
        }
      );

      // Aguardar conclusão dos uploads
      await Promise.all([imageUploadTask, thumbnailUploadTask]);

      // Obter URLs de download
      const imageUrl = await getDownloadURL(imageRef);
      const thumbnailUrl = await getDownloadURL(thumbnailRef);

      // Preparar metadados
      const metadata = {
        originalName: file.name,
        size: file.size,
        type: file.type,
        dimensions: {
          width: resizedImage.width || 'unknown',
          height: resizedImage.height || 'unknown'
        },
        thumbnailUrl,
        uploadedBy: 'assistant', // Pode ser dinâmico no futuro
        uploadedAt: new Date().toISOString()
      };

      // Atualizar status no Firestore
      await updateExamStatus(patientId, examType, {
        url: imageUrl,
        metadata
      });

      setUploadProgress(prev => ({ ...prev, [examType]: 100 }));
      setIsUploading(false);

      return {
        url: imageUrl,
        thumbnailUrl,
        metadata
      };

    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadErrors(prev => ({ ...prev, [examType]: error.message }));
      setUploadProgress(prev => ({ ...prev, [examType]: 0 }));
      setIsUploading(false);
      throw error;
    }
  }, []);

  const uploadMultipleImages = useCallback(async (files, patientId) => {
    const results = {};
    
    for (const [examType, file] of Object.entries(files)) {
      if (file) {
        try {
          results[examType] = await uploadImage(file, patientId, examType);
        } catch (error) {
          results[examType] = { error: error.message };
        }
      }
    }
    
    return results;
  }, [uploadImage]);

  const resetUploadState = useCallback((examType = null) => {
    if (examType) {
      setUploadProgress(prev => ({ ...prev, [examType]: 0 }));
      setUploadErrors(prev => ({ ...prev, [examType]: null }));
    } else {
      setUploadProgress({});
      setUploadErrors({});
    }
    setIsUploading(false);
  }, []);

  return {
    uploadImage,
    uploadMultipleImages,
    uploadProgress,
    uploadErrors,
    isUploading,
    resetUploadState
  };
};

