import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Download, X } from 'lucide-react';
import ChurchLogo from '@/components/ChurchLogo.jsx';
import { useChurch } from '@/context/ChurchContext.jsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const cargoLabel = (c) => ({
  cooperador: 'Cooperador',
  diacono: 'Diácono',
  presbitero: 'Presbítero',
  evangelista: 'Evangelista',
  pastor: 'Pastor',
}[c] || c || '');

export default function AtaModal({ open, onClose, reuniao, presencas, membros, departamento }) {
  const { config, igrejaAtiva } = useChurch();
  const [secretario, setSecretario] = useState(config?.secretario || '');
  const [pastor, setPastor] = useState(config?.pastor_presidente || '');
  const [local, setLocal] = useState(config?.cidade ? `${config.cidade}/${config.estado || ''}`.replace(/\/$/, '') : '');

  if (!reuniao) return null;

  // Lista de presenças com membro e cargo
  const presencasMembros = (presencas || [])
    .filter((p) => p.reuniao_id === reuniao.id && p.presente !== false)
    .map((p) => {
      const membro = membros.find((m) => m.id === p.membro_id);
      return {
        nome: membro?.nome_completo || p.membro_nome || '—',
        cargo: membro?.cargo_obreiro ? cargoLabel(membro.cargo_obreiro) : (membro?.tipo || ''),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const dataReuniao = reuniao.data_reuniao
    ? format(new Date(`${reuniao.data_reuniao}T00:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '—';

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b print:hidden flex flex-row items-center justify-between">
          <DialogTitle>Visualização da ATA</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Form pra dados extras (não vão pro PDF) */}
        <div className="px-6 py-3 bg-slate-50 border-b grid md:grid-cols-3 gap-3 print:hidden">
          <div>
            <Label className="text-xs">Local</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Cidade/UF" />
          </div>
          <div>
            <Label className="text-xs">Pastor Presidente</Label>
            <Input value={pastor} onChange={(e) => setPastor(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Secretário(a)</Label>
            <Input value={secretario} onChange={(e) => setSecretario(e.target.value)} />
          </div>
        </div>

        {/* ATA — área imprimível */}
        <div id="ata-print-area" className="px-10 py-8 bg-white text-slate-900 print:px-[18mm] print:py-[15mm]">
          {/* Cabeçalho da Igreja */}
          <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-800">
            <ChurchLogo className="w-16 h-16 object-contain" />
            <div className="flex-1">
              <h2 className="text-xl font-bold uppercase">{igrejaAtiva?.nome || config?.nome_igreja || 'Igreja'}</h2>
              {igrejaAtiva?.endereco && <p className="text-xs text-slate-600">{igrejaAtiva.endereco}</p>}
              {(igrejaAtiva?.cidade || config?.cidade) && (
                <p className="text-xs text-slate-600">
                  {igrejaAtiva?.cidade || config?.cidade}{igrejaAtiva?.estado || config?.estado ? '/' + (igrejaAtiva?.estado || config?.estado) : ''}
                  {igrejaAtiva?.cnpj ? ` • CNPJ: ${igrejaAtiva.cnpj}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Título */}
          <div className="text-center my-8">
            <h1 className="text-2xl font-bold uppercase tracking-wide">ATA — {reuniao.tema || departamento?.nome || 'Reunião'}</h1>
            <p className="text-sm text-slate-600 mt-1">{departamento?.nome ? `Setor: ${departamento.nome}` : ''}</p>
          </div>

          {/* Corpo: observações */}
          <section className="mb-8 leading-relaxed text-justify">
            <p className="indent-12">
              Aos {dataReuniao}{reuniao.hora_inicio ? `, às ${reuniao.hora_inicio}` : ''}, reuniram-se os
              membros do {departamento?.nome || 'setor'} {local ? `na cidade de ${local}` : ''} sob a direção
              de {pastor || '_____________________'}{reuniao.responsavel_nome ? `, tendo como responsável ${reuniao.responsavel_nome}` : ''}.
              {' '}Conforme o que se segue:
            </p>
            <div className="mt-4 whitespace-pre-wrap">
              {reuniao.observacoes || '— sem observações registradas —'}
            </div>
          </section>

          {/* Lista de presença */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-3 border-b pb-1">LISTA DE PRESENÇA</h3>
            {presencasMembros.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Nenhuma presença registrada.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-1 w-8">#</th>
                    <th className="text-left py-1">Nome</th>
                    <th className="text-left py-1 w-32">Cargo</th>
                    <th className="text-left py-1 w-2/5">Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {presencasMembros.map((p, i) => (
                    <tr key={i} className="border-b border-dotted border-slate-300">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2">{p.nome}</td>
                      <td className="py-2 text-slate-600">{p.cargo}</td>
                      <td className="py-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Local e data */}
          <p className="mt-12 text-center">
            {local || '__________________________'}, {dataReuniao}.
          </p>

          {/* Assinaturas pastor + secretário */}
          <div className="grid grid-cols-2 gap-12 mt-16">
            <div className="text-center">
              <div className="border-t border-slate-800 pt-1">
                <p className="font-medium">{pastor || '_______________________________'}</p>
                <p className="text-xs text-slate-600">Pastor Presidente</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-800 pt-1">
                <p className="font-medium">{secretario || '_______________________________'}</p>
                <p className="text-xs text-slate-600">Secretário(a)</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @page { size: A4; margin: 12mm; }
          @media print {
            body * { visibility: hidden; }
            #ata-print-area, #ata-print-area * { visibility: visible; }
            #ata-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
