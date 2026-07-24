import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import usePermissions from '@/hooks/usePermissions';
import { useChurch } from '@/context/ChurchContext.jsx';
import { isArchivedMember } from '@/utils/memberStatus';

const defaultForm = {
  nome: '',
  faixa_etaria: '',
  professor_id: '',
  descricao: '',
  ativa: true,
};

export default function EbdClasses() {
  const { igrejaAtiva } = useChurch();
  const queryClient = useQueryClient();
  const perms = usePermissions('EbdClasses');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['ebd_classes', igrejaAtiva?.id],
    queryFn: () => base44.entities.EbdClasse.list('nome'),
    initialData: [],
  });

  const { data: membrosTodos = [] } = useQuery({
    queryKey: ['membros'],
    queryFn: () => base44.entities.Membro.list('nome_completo'),
    initialData: [],
  });

  // membros filtra fora arquivados (inativo/transferido) — mostrar arquivados só em ArquivoMorto
  const membros = React.useMemo(
    () => (membrosTodos || []).filter((m) => !isArchivedMember(m)),
    [membrosTodos]
  );

  const { data: matriculas = [] } = useQuery({
    queryKey: ['ebd_matriculas'],
    queryFn: () => base44.entities.EbdMatricula.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing?.id) return base44.entities.EbdClasse.update(editing.id, payload);
      return base44.entities.EbdClasse.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebd_classes'] });
      setShowModal(false);
      setForm(defaultForm);
      setEditing(null);
    },
    onError: (err) => alert('Erro ao salvar classe: ' + (err?.message || '')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EbdClasse.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ebd_classes'] }),
  });

  const classesFiltradas = useMemo(() => {
    return (classes || []).filter((c) => {
      if (igrejaAtiva && c.igreja_id && c.igreja_id !== igrejaAtiva.id) return false;
      return true;
    });
  }, [classes, igrejaAtiva]);

  const countMatriculas = (classeId) =>
    matriculas.filter((m) => m.classe_id === classeId && m.ativo !== false).length;

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      nome: c.nome || '',
      faixa_etaria: c.faixa_etaria || '',
      professor_id: c.professor_id || '',
      descricao: c.descricao || '',
      ativa: c.ativa !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      alert('Informe o nome da classe.');
      return;
    }
    const professor = membros.find((m) => m.id === form.professor_id);
    const payload = {
      ...form,
      igreja_id: igrejaAtiva?.id || null,
      professor_id: form.professor_id || null,
      professor_nome: professor?.nome_completo || '',
    };
    saveMutation.mutate(payload);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
              Classes da EBD
            </h1>
            <p className="text-slate-500 mt-1">Cadastre as classes, defina professor e faixa etária.</p>
          </div>
          {perms.canCreate && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-indigo-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Nova classe
            </Button>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Todas as classes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Carregando...</div>
            ) : classesFiltradas.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Nenhuma classe cadastrada.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classesFiltradas.map((c) => (
                  <div key={c.id} className="border rounded-xl p-4 bg-white hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{c.nome}</p>
                        {c.faixa_etaria && <p className="text-xs text-slate-500">{c.faixa_etaria}</p>}
                      </div>
                      <Badge variant={c.ativa !== false ? 'default' : 'secondary'}>
                        {c.ativa !== false ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    {c.professor_nome && (
                      <p className="text-sm text-slate-600 mt-2">Professor: <strong>{c.professor_nome}</strong></p>
                    )}
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {countMatriculas(c.id)} matriculado(s)
                    </p>
                    {c.descricao && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.descricao}</p>}
                    <div className="flex justify-end gap-2 mt-3">
                      {perms.canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {perms.canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (window.confirm(`Excluir a classe "${c.nome}"? As matrículas e aulas vinculadas também serão removidas.`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar classe' : 'Nova classe'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label>Nome da classe *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <Label>Faixa etária / público</Label>
              <Input
                value={form.faixa_etaria}
                onChange={(e) => setForm({ ...form, faixa_etaria: e.target.value })}
                placeholder="Ex.: Adultos, Jovens, 6-9 anos"
              />
            </div>
            <div>
              <Label>Professor</Label>
              <Select value={form.professor_id || ''} onValueChange={(v) => setForm({ ...form, professor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                <SelectContent searchable searchPlaceholder="Digite o nome do membro...">
                  <SelectItem value="">Sem professor definido</SelectItem>
                  {membros.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativa"
                checked={form.ativa}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />
              <Label htmlFor="ativa" className="cursor-pointer">Classe ativa</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-gradient-to-r from-indigo-500 to-blue-600">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
