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

// Função para desenhar seção com título
const drawSection = (pdf, title, x, y, width, height) => {
  // Fundo do cabeçalho
  pdf.setFillColor('#F5F5F5');
  pdf.rect(x, y, width, 15, 'F');
  
  // Borda da seção
  pdf.setDrawColor('#333333');
  pdf.setLineWidth(1.2);
  pdf.rect(x, y, width, height);
  
  // Título da seção
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor('#333333');
  pdf.text(title, x + 5, y + 10);
  
  return y + 15; // Retorna Y após o cabeçalho
};

export const generatePrescriptionPDF = (patientData, documentData) => {
  const pdf = new jsPDF();
  
  // Configurações gerais
  pdf.setFont('helvetica');
  pdf.setTextColor('#000000');
  
  // Título principal
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEITUÁRIO ÓCULOS', 105, 25, { align: 'center' });
  
  let currentY = 40;
  
  // ===== SEÇÃO DADOS DO PACIENTE =====
  const patientSectionHeight = 25;
  const patientContentY = drawSection(pdf, '📋 DADOS DO PACIENTE', 15, currentY, 180, patientSectionHeight);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor('#000000');
  pdf.text('Nome:', 20, patientContentY + 8);
  pdf.line(35, patientContentY + 8, 190, patientContentY + 8);
  
  currentY += patientSectionHeight + 10;
  
  // ===== SEÇÃO PRESCRIÇÃO ÓPTICA =====
  const prescriptionSectionHeight = 65;
  const prescriptionContentY = drawSection(pdf, '👁️ PRESCRIÇÃO ÓPTICA', 15, currentY, 180, prescriptionSectionHeight);
  
  // Configurações da tabela principal
  const tableStartX = 20;
  const tableWidth = 170;
  const colWidths = [50, 40, 40, 40];
  const colPositions = [
    tableStartX,
    tableStartX + colWidths[0],
    tableStartX + colWidths[0] + colWidths[1],
    tableStartX + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  const tableStartY = prescriptionContentY + 5;
  const rowHeight = 15;
  
  // Cabeçalho da tabela com fundo
  pdf.setFillColor('#E8E8E8');
  pdf.rect(tableStartX, tableStartY, tableWidth, rowHeight, 'F');
  
  // Bordas da tabela
  pdf.setDrawColor('#666666');
  pdf.setLineWidth(1);
  
  // Linhas horizontais
  for (let i = 0; i <= 3; i++) {
    pdf.line(tableStartX, tableStartY + (i * rowHeight), tableStartX + tableWidth, tableStartY + (i * rowHeight));
  }
  
  // Linhas verticais
  for (let i = 0; i <= 4; i++) {
    const x = i === 0 ? tableStartX : 
              i === 1 ? colPositions[1] :
              i === 2 ? colPositions[2] :
              i === 3 ? colPositions[3] :
              tableStartX + tableWidth;
    pdf.line(x, tableStartY, x, tableStartY + (3 * rowHeight));
  }
  
  // Cabeçalhos da tabela
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor('#333333');
  
  pdf.text('ESF', colPositions[1] + colWidths[1]/2, tableStartY + 10, { align: 'center' });
  pdf.text('CIL', colPositions[2] + colWidths[2]/2, tableStartY + 10, { align: 'center' });
  pdf.text('EIXO', colPositions[3] + colWidths[3]/2, tableStartY + 10, { align: 'center' });
  
  // Dados da tabela
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor('#000000');
  
  // Olho Direito
  const rightEyeY = tableStartY + rowHeight + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('👁️ OD (Direito)', tableStartX + 3, rightEyeY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatValue(documentData.rightEye.esf), colPositions[1] + colWidths[1]/2, rightEyeY, { align: 'center' });
  pdf.text(formatValue(documentData.rightEye.cil), colPositions[2] + colWidths[2]/2, rightEyeY, { align: 'center' });
  pdf.text((documentData.rightEye.eixo || '0') + '°', colPositions[3] + colWidths[3]/2, rightEyeY, { align: 'center' });
  
  // Olho Esquerdo
  const leftEyeY = tableStartY + (2 * rowHeight) + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('👁️ OE (Esquerdo)', tableStartX + 3, leftEyeY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatValue(documentData.leftEye.esf), colPositions[1] + colWidths[1]/2, leftEyeY, { align: 'center' });
  pdf.text(formatValue(documentData.leftEye.cil), colPositions[2] + colWidths[2]/2, leftEyeY, { align: 'center' });
  pdf.text((documentData.leftEye.eixo || '0') + '°', colPositions[3] + colWidths[3]/2, leftEyeY, { align: 'center' });
  
  currentY += prescriptionSectionHeight + 10;
  
  // ===== SEÇÃO ADIÇÃO (condicional) =====
  if (documentData.addition && documentData.addition.active) {
    const additionSectionHeight = 35;
    const additionContentY = drawSection(pdf, '➕ PRESCRIÇÃO PARA PERTO', 15, currentY, 180, additionSectionHeight);
    
    // Tabela de adição
    const additionTableY = additionContentY + 5;
    const additionTableHeight = 20;
    
    // Fundo da tabela de adição
    pdf.setFillColor('#F9F9F9');
    pdf.rect(tableStartX, additionTableY, tableWidth, additionTableHeight, 'F');
    
    // Bordas da tabela de adição
    pdf.setDrawColor('#666666');
    pdf.rect(tableStartX, additionTableY, tableWidth, additionTableHeight);
    pdf.line(tableStartX + 120, additionTableY, tableStartX + 120, additionTableY + additionTableHeight);
    
    // Conteúdo da adição
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('ADIÇÃO PARA PERTO', tableStartX + 5, additionTableY + 8);
    pdf.text('(Ambos os olhos)', tableStartX + 5, additionTableY + 16);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(formatValue(documentData.addition.value) + ' D', tableStartX + 120 + 25, additionTableY + 12, { align: 'center' });
    
    currentY += additionSectionHeight + 10;
  }
  
  // ===== SEÇÃO TIPO DE LENTE =====
  const lenseSectionHeight = 45;
  const lenseContentY = drawSection(pdf, '🔧 TIPO DE LENTE', 15, currentY, 180, lenseSectionHeight);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor('#000000');
  
  // Opções de lente em layout organizado
  pdf.text('☐ Monofocal (Visão Simples)', 20, lenseContentY + 10);
  pdf.text('☐ Bifocal', 20, lenseContentY + 20);
  pdf.text('☐ Multifocal/Progressiva', 20, lenseContentY + 30);
  
  pdf.text('☐ Antirreflexo', 110, lenseContentY + 10);
  pdf.text('☐ Fotossensível', 110, lenseContentY + 20);
  pdf.text('☐ Blue Light', 110, lenseContentY + 30);
  
  currentY += lenseSectionHeight + 15;
  
  // ===== RODAPÉ =====
  // Data
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR');
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Data: ${formattedDate}`, 20, currentY);
  
  // Campo para assinatura
  currentY += 20;
  pdf.line(20, currentY, 120, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Assinatura e Carimbo do Médico', 20, currentY + 8);
  
  // Gerar o PDF
  const fileName = `receita_${patientData.name.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};

