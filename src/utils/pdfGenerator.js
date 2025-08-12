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
  
  // Configurações gerais - layout clean
  pdf.setFont('helvetica');
  pdf.setTextColor('#000000');
  pdf.setLineWidth(0.5); // Linhas mais finas para economia
  
  let currentY = 20; // Começar mais no topo
  
  // ===== TÍTULO PRINCIPAL - COMPACTO =====
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEITUÁRIO DE ÓCULOS', 105, currentY, { align: 'center' });
  
  // Linha separadora simples
  currentY += 8;
  pdf.line(20, currentY, 190, currentY);
  currentY += 12;
  
  // ===== DADOS DO PACIENTE - UMA LINHA =====
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PACIENTE:', 20, currentY);
  pdf.line(45, currentY, 190, currentY);
  currentY += 15;
  
  // ===== PRESCRIÇÃO ÓPTICA - TABELA COMPACTA =====
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PRESCRIÇÃO ÓPTICA', 20, currentY);
  currentY += 8;
  
  // Configurações da tabela compacta
  const tableStartX = 20;
  const tableWidth = 120; // Tabela mais estreita
  const colWidths = [30, 30, 30, 30];
  const rowHeight = 12; // Linhas mais baixas
  
  // Cabeçalho da tabela
  pdf.setDrawColor('#000000');
  pdf.setLineWidth(0.5);
  
  // Bordas da tabela
  pdf.rect(tableStartX, currentY, tableWidth, rowHeight * 3);
  
  // Linhas horizontais
  pdf.line(tableStartX, currentY + rowHeight, tableStartX + tableWidth, currentY + rowHeight);
  pdf.line(tableStartX, currentY + (rowHeight * 2), tableStartX + tableWidth, currentY + (rowHeight * 2));
  
  // Linhas verticais
  pdf.line(tableStartX + colWidths[0], currentY, tableStartX + colWidths[0], currentY + (rowHeight * 3));
  pdf.line(tableStartX + colWidths[0] + colWidths[1], currentY, tableStartX + colWidths[0] + colWidths[1], currentY + (rowHeight * 3));
  pdf.line(tableStartX + colWidths[0] + colWidths[1] + colWidths[2], currentY, tableStartX + colWidths[0] + colWidths[1] + colWidths[2], currentY + (rowHeight * 3));
  
  // Cabeçalhos
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('', tableStartX + 15, currentY + 8, { align: 'center' });
  pdf.text('ESF', tableStartX + colWidths[0] + 15, currentY + 8, { align: 'center' });
  pdf.text('CIL', tableStartX + colWidths[0] + colWidths[1] + 15, currentY + 8, { align: 'center' });
  pdf.text('EIXO', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 15, currentY + 8, { align: 'center' });
  
  // Dados OD
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('OD', tableStartX + 15, currentY + rowHeight + 8, { align: 'center' });
  pdf.text(formatValue(documentData.rightEye.esf), tableStartX + colWidths[0] + 15, currentY + rowHeight + 8, { align: 'center' });
  pdf.text(formatValue(documentData.rightEye.cil), tableStartX + colWidths[0] + colWidths[1] + 15, currentY + rowHeight + 8, { align: 'center' });
  pdf.text((documentData.rightEye.eixo || '0') + 'º', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 15, currentY + rowHeight + 8, { align: 'center' });
  
  // Dados OE
  pdf.text('OE', tableStartX + 15, currentY + (rowHeight * 2) + 8, { align: 'center' });
  pdf.text(formatValue(documentData.leftEye.esf), tableStartX + colWidths[0] + 15, currentY + (rowHeight * 2) + 8, { align: 'center' });
  pdf.text(formatValue(documentData.leftEye.cil), tableStartX + colWidths[0] + colWidths[1] + 15, currentY + (rowHeight * 2) + 8, { align: 'center' });
  pdf.text((documentData.leftEye.eixo || '0') + 'º', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 15, currentY + (rowHeight * 2) + 8, { align: 'center' });
  
  currentY += (rowHeight * 3) + 12;
  
  // ===== ADIÇÃO - UMA LINHA SIMPLES =====
  if (documentData.addition && documentData.addition.active) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`ADICAO: ${formatValue(documentData.addition.value)} D (ambos os olhos)`, 20, currentY);
    currentY += 12;
  }
  
  // ===== TIPO DE LENTE - COMPACTO =====
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('TIPO: ( ) Monofocal  ( ) Bifocal  ( ) Progressiva', 20, currentY);
  currentY += 10;
  pdf.text('      ( ) Antirreflexo  ( ) Fotossensível  ( ) Blue Light', 20, currentY);
  currentY += 15;
  
  // ===== RODAPÉ COMPACTO =====
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR');
  
  // Data e assinatura na mesma linha
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Data: ${formattedDate}`, 20, currentY);
  
  // Linha para assinatura
  pdf.line(120, currentY, 190, currentY);
  pdf.setFontSize(8);
  pdf.text('Assinatura e Carimbo do Médico', 120, currentY + 8);
  
  // Gerar o PDF
  const fileName = `receita_${patientData.name.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};

