import jsPDF from 'jspdf';

// Função para formatar valores com sinal positivo
const formatValue = (value) => {
  if (!value || value === '0.00' || value === '0') {
    return '0.00';
  }
  
  const numValue = parseFloat(value);
  if (numValue > 0) {
    return `+${numValue.toFixed(2)}`;
  } else if (numValue < 0) {
    return numValue.toFixed(2);
  }
  return '0.00';
};

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
  
  // Tabela principal - Configurações
  const tableStartX = 15;
  const tableEndX = 195;
  const colWidths = [60, 45, 45, 45]; // Larguras das colunas
  const colPositions = [
    tableStartX,
    tableStartX + colWidths[0],
    tableStartX + colWidths[0] + colWidths[1],
    tableStartX + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  // Cabeçalhos da tabela
  const startY = 80;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  
  // Cabeçalhos centralizados
  pdf.text('Esf', colPositions[1] + colWidths[1]/2, startY, { align: 'center' });
  pdf.text('Cil', colPositions[2] + colWidths[2]/2, startY, { align: 'center' });
  pdf.text('Eixo', colPositions[3] + colWidths[3]/2, startY, { align: 'center' });
  
  // Dados da tabela
  pdf.setFont('helvetica', 'normal');
  
  // Olho Direito
  const rightEyeY = startY + 20;
  pdf.text('Olho Direito', colPositions[0] + 5, rightEyeY);
  pdf.text(formatValue(documentData.rightEye.esf), colPositions[1] + colWidths[1]/2, rightEyeY, { align: 'center' });
  pdf.text(formatValue(documentData.rightEye.cil), colPositions[2] + colWidths[2]/2, rightEyeY, { align: 'center' });
  pdf.text(documentData.rightEye.eixo || '0', colPositions[3] + colWidths[3]/2, rightEyeY, { align: 'center' });
  
  // Olho Esquerdo
  const leftEyeY = rightEyeY + 20;
  pdf.text('Olho Esquerdo', colPositions[0] + 5, leftEyeY);
  pdf.text(formatValue(documentData.leftEye.esf), colPositions[1] + colWidths[1]/2, leftEyeY, { align: 'center' });
  pdf.text(formatValue(documentData.leftEye.cil), colPositions[2] + colWidths[2]/2, leftEyeY, { align: 'center' });
  pdf.text(documentData.leftEye.eixo || '0', colPositions[3] + colWidths[3]/2, leftEyeY, { align: 'center' });
  
  // Desenhar linhas da tabela principal
  // Linhas horizontais
  pdf.line(tableStartX, startY - 5, tableEndX, startY - 5); // Superior
  pdf.line(tableStartX, startY + 5, tableEndX, startY + 5); // Cabeçalho
  pdf.line(tableStartX, rightEyeY + 5, tableEndX, rightEyeY + 5); // Entre olhos
  pdf.line(tableStartX, leftEyeY + 5, tableEndX, leftEyeY + 5); // Inferior
  
  // Linhas verticais
  pdf.line(colPositions[0], startY - 5, colPositions[0], leftEyeY + 5); // Esquerda
  pdf.line(colPositions[1], startY - 5, colPositions[1], leftEyeY + 5); // Antes Esf
  pdf.line(colPositions[2], startY - 5, colPositions[2], leftEyeY + 5); // Antes Cil
  pdf.line(colPositions[3], startY - 5, colPositions[3], leftEyeY + 5); // Antes Eixo
  pdf.line(tableEndX, startY - 5, tableEndX, leftEyeY + 5); // Direita
  
  let currentY = leftEyeY + 30;
  
  // Seção de Adição em formato de tabela (condicional)
  if (documentData.addition && documentData.addition.active) {
    // Título da seção
    pdf.setFont('helvetica', 'bold');
    pdf.text('Perto', 20, currentY);
    
    currentY += 15;
    
    // Tabela de adição
    const additionTableY = currentY;
    const additionTableHeight = 20;
    
    // Desenhar tabela de adição
    pdf.line(tableStartX, additionTableY - 5, tableEndX, additionTableY - 5); // Superior
    pdf.line(tableStartX, additionTableY + additionTableHeight - 5, tableEndX, additionTableY + additionTableHeight - 5); // Inferior
    
    // Linhas verticais da tabela de adição
    pdf.line(tableStartX, additionTableY - 5, tableStartX, additionTableY + additionTableHeight - 5); // Esquerda
    pdf.line(colPositions[1], additionTableY - 5, colPositions[1], additionTableY + additionTableHeight - 5); // Divisão
    pdf.line(tableEndX, additionTableY - 5, tableEndX, additionTableY + additionTableHeight - 5); // Direita
    
    // Conteúdo da tabela de adição
    pdf.setFont('helvetica', 'normal');
    pdf.text('Adição em ambos os olhos', colPositions[0] + 5, additionTableY + 10);
    pdf.text(formatValue(documentData.addition.value), colPositions[1] + (tableEndX - colPositions[1])/2, additionTableY + 10, { align: 'center' });
    
    currentY += 35;
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

