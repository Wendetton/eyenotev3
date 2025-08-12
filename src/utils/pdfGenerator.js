import jsPDF from 'jspdf';

export const generatePrescriptionPDF = (patientData, documentData) => {
  const pdf = new jsPDF();
  
  // Configurações de fonte e tamanho
  pdf.setFont('helvetica');
  
  // Título
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Receituário Óculos', 105, 30, { align: 'center' });
  
  // Linha do paciente
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Paciente: ___________________________________________________________', 20, 50);
  
  // Tabela principal - Cabeçalho
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  
  // Cabeçalhos da tabela
  const startY = 80;
  pdf.text('Esf', 80, startY);
  pdf.text('Cil', 120, startY);
  pdf.text('Eixo', 160, startY);
  
  // Linhas da tabela
  pdf.setFont('helvetica', 'normal');
  
  // Olho Direito
  const rightEyeY = startY + 20;
  pdf.text('Olho Direito', 20, rightEyeY);
  pdf.text(documentData.rightEye.esf || '0.00', 80, rightEyeY);
  pdf.text(documentData.rightEye.cil || '0.00', 120, rightEyeY);
  pdf.text(documentData.rightEye.eixo || '0', 160, rightEyeY);
  
  // Olho Esquerdo
  const leftEyeY = rightEyeY + 20;
  pdf.text('Olho Esquerdo', 20, leftEyeY);
  pdf.text(documentData.leftEye.esf || '0.00', 80, leftEyeY);
  pdf.text(documentData.leftEye.cil || '0.00', 120, leftEyeY);
  pdf.text(documentData.leftEye.eixo || '0', 160, leftEyeY);
  
  // Linhas da tabela
  const tableStartX = 15;
  const tableEndX = 195;
  
  // Linha horizontal superior
  pdf.line(tableStartX, startY - 5, tableEndX, startY - 5);
  
  // Linha horizontal do cabeçalho
  pdf.line(tableStartX, startY + 5, tableEndX, startY + 5);
  
  // Linha horizontal entre olhos
  pdf.line(tableStartX, rightEyeY + 5, tableEndX, rightEyeY + 5);
  
  // Linha horizontal inferior
  pdf.line(tableStartX, leftEyeY + 5, tableEndX, leftEyeY + 5);
  
  // Linhas verticais
  pdf.line(tableStartX, startY - 5, tableStartX, leftEyeY + 5); // Esquerda
  pdf.line(75, startY - 5, 75, leftEyeY + 5); // Antes Esf
  pdf.line(115, startY - 5, 115, leftEyeY + 5); // Antes Cil
  pdf.line(155, startY - 5, 155, leftEyeY + 5); // Antes Eixo
  pdf.line(tableEndX, startY - 5, tableEndX, leftEyeY + 5); // Direita
  
  let currentY = leftEyeY + 30;
  
  // Seção de Adição (condicional)
  if (documentData.addition && documentData.addition.active) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Perto', 20, currentY);
    
    currentY += 15;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Adição em ambos os olhos: ${documentData.addition.value || '+0.75'}`, 20, currentY);
    
    currentY += 20;
  }
  
  // Opções de lentes
  pdf.setFont('helvetica', 'normal');
  pdf.text('( ) Visão Simples', 20, currentY);
  
  currentY += 15;
  pdf.text('( ) Lentes progressivas', 20, currentY);
  
  // Sugiro
  currentY += 30;
  pdf.text('Sugiro: ___________________________________________________________', 20, currentY);
  
  // Data
  currentY += 30;
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR');
  pdf.text(`Data: ${formattedDate}`, 20, currentY);
  
  // Gerar o PDF
  const fileName = `receita_${patientData.name.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};

