import React, { useState } from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { baixarPdf, imprimirElemento, nomeArquivoSeguro } from '@/utils/exportar';

/**
 * Botões "Imprimir" e "Baixar PDF" para qualquer área de relatório.
 *
 * alvoRef: ref do elemento a exportar.
 * titulo: título do documento (também vira o nome do arquivo).
 * orientacao: 'retrato' | 'paisagem'.
 */
export default function BotoesExportar({
  alvoRef,
  titulo = 'Relatório',
  nomeArquivo,
  orientacao = 'retrato',
  className = '',
  variantImprimir = 'outline',
  classeBaixar = 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white',
  antesDeExportar,
}) {
  const [ocupado, setOcupado] = useState(null); // 'imprimir' | 'pdf' | null
  const arquivo = nomeArquivo || nomeArquivoSeguro(titulo);

  const executar = async (acao) => {
    if (!alvoRef?.current) {
      window.alert('Nada para exportar ainda. Gere o relatório primeiro.');
      return;
    }
    setOcupado(acao);
    try {
      if (antesDeExportar) await antesDeExportar();
      if (acao === 'imprimir') {
        await imprimirElemento(alvoRef.current, { titulo, orientacao, nomeArquivo: arquivo });
      } else {
        await baixarPdf(alvoRef.current, arquivo, { titulo, orientacao });
      }
    } catch (err) {
      console.error('Falha ao exportar:', err);
      window.alert(`Não foi possível ${acao === 'imprimir' ? 'imprimir' : 'gerar o PDF'}: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className={`flex gap-2 print:hidden ${className}`}>
      <Button variant={variantImprimir} onClick={() => executar('imprimir')} disabled={!!ocupado}>
        {ocupado === 'imprimir' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
        Imprimir
      </Button>
      <Button onClick={() => executar('pdf')} disabled={!!ocupado} className={classeBaixar}>
        {ocupado === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        {ocupado === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
      </Button>
    </div>
  );
}
