import React from 'react';
import { BarChart3 } from 'lucide-react';
import HistoricoAtas from '@/components/relatorios/HistoricoAtas.jsx';

/** Secretaria › Reuniões › Relatórios — histórico de atas com resumo. */
export default function ReunioesRelatorios() {
  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-600" />
            Reuniões · Relatórios
          </h1>
          <p className="text-slate-500 mt-1">
            Histórico das atas de reunião dos setores, com presença registrada. Abra, imprima ou baixe cada ata.
          </p>
        </div>
        <HistoricoAtas mostrarResumo />
      </div>
    </div>
  );
}
