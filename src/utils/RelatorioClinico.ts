import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportData {
  patientName: string;
  biometrics: {
    age?: number;
    sex?: string;
    weight?: number;
    height?: number;
    imc?: number;
    activityLevel?: string;
  };
  weightHistory: any[];
  waterLogs: any[];
  meals: any[];
}

export const generatePatientReport = async (data: ReportData, chartsElementId?: string) => {
  const doc = new jsPDF();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Cabeçalho
  doc.setFontSize(22);
  doc.setTextColor(40, 167, 69); // Nutri Green
  doc.text("NutriTrack - Relatório Clínico Evolution", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${today}`, 14, 30);
  doc.line(14, 32, 196, 32);

  // Informações do Paciente
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("Dados do Paciente", 14, 45);
  
  autoTable(doc, {
    startY: 50,
    head: [["Campo", "Informação"]],
    body: [
      ["Nome", data.patientName],
      ["Sexo", data.biometrics.sex || "-"],
      ["Peso Atual", `${data.biometrics.weight || "-"} kg`],
      ["Altura", `${data.biometrics.height || "-"} cm`],
      ["IMC", data.biometrics.imc?.toFixed(2) || "-"],
      ["Nível de Atividade", data.biometrics.activityLevel || "-"],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 167, 69] },
  });

  // Capturar Gráficos se o ID for provido
  if (chartsElementId) {
    const element = document.getElementById(chartsElementId);
    if (element) {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Evolução Gráfica", 14, 20);
      doc.addImage(imgData, "PNG", 14, 30, imgWidth, imgHeight);
    }
  }

  // Tabela de Histórico de Peso
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Histórico de Pesagens", 14, 20);
  
  autoTable(doc, {
    startY: 25,
    head: [["Data", "Peso (kg)", "Notas"]],
    body: data.weightHistory.map((log) => [
      format(new Date(log.created_at), "dd/MM/yyyy"),
      log.weight,
      log.notes || "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [40, 167, 69] },
  });

  // Resumo de Consumo de Água
  doc.setFontSize(16);
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.text("Registro de Hidratação (Últimos dias)", 14, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [["Data", "Meta Alcançada (ml)"]],
    body: data.waterLogs.slice(0, 7).map((log) => [
      format(new Date(log.date), "dd/MM/yyyy"),
      log.amount,
    ]),
    theme: "striped",
    headStyles: { fillColor: [0, 123, 255] }, // Blue for water
  });

  // Salvar o PDF
  doc.save(`Relatorio_${data.patientName.replace(/\s+/g, "_")}.pdf`);
};
