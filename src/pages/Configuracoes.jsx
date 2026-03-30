import React, { useState, useEffect } from 'react';
import { base44, STORAGE_BUCKETS } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Upload, Church, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { compressImage } from '@/utils/imageCompression';
import ieadLogo from '@/assets/iead-logo.svg';
import usePermissions from '@/hooks/usePermissions';


export default function Configuracoes() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const perms = usePermissions('Configuracoes');

  const { data: configs = [] } = useQuery({
    queryKey: ['configs'],
    queryFn: () => base44.entities.Config.list(),
    initialData: [],
  });

  const config = configs[0];

  const [formData, setFormData] = useState({
    nome_igreja: '',
    endereco_completo: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    cnpj: '',
    pastor_presidente: '',
    logo_url: '',
  });

  useEffect(() => {
    if (config) {
      setFormData((prev) => ({ ...prev, ...config }));
    }
  }, [config]);

  const normalizeConfigPayload = (data) => {
    const optionalFields = [
      'endereco_completo',
      'cidade',
      'estado',
      'cep',
      'telefone',
      'email',
      'cnpj',
      'pastor_presidente',
      'logo_url',
    ];
    const payload = { ...data };

    optionalFields.forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    return payload;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const normalizedData = normalizeConfigPayload(data);
      if (config) {
        return base44.entities.Config.update(config.id, normalizedData);
      }
      return base44.entities.Config.create(normalizedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, { maxSize: 1000, quality: 0.85 });
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: compressedFile,
        bucket: STORAGE_BUCKETS.avatares,
      });
      handleChange('logo_url', file_url);
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
    }
    setUploading(false);
  };

  const previewLogo = formData.logo_url || ieadLogo;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configurações da Igreja
          </h1>
          <p className="text-slate-500 mt-1">
            Configure as informações da sua igreja que serão usadas em cartas, relatórios e cartões
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={!perms.canEdit}>
          {!perms.canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Você tem permissão apenas para visualizar as configurações. Entre em contato com um administrador para alterações.
              </p>
            </div>
          )}
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Church className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome_igreja">Nome da Igreja *</Label>
                  <Input
                    id="nome_igreja"
                    value={formData.nome_igreja}
                    onChange={(e) => handleChange('nome_igreja', e.target.value)}
                    placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="endereco_completo">Endereço Completo</Label>
                  <Textarea
                    id="endereco_completo"
                    value={formData.endereco_completo}
                    onChange={(e) => handleChange('endereco_completo', e.target.value)}
                    placeholder="Rua, número, bairro, complemento"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formData.cidade} onChange={(e) => handleChange('cidade', e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleChange('estado', e.target.value)}
                    placeholder="UF"
                  />
                </div>

                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleChange('cep', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="pastor_presidente">Pastor Presidente</Label>
                  <Input
                    id="pastor_presidente"
                    value={formData.pastor_presidente}
                    onChange={(e) => handleChange('pastor_presidente', e.target.value)}
                    placeholder="Nome do pastor presidente"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Logo da Igreja
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={previewLogo} alt="Logo da Igreja" className="max-h-48 rounded-lg shadow-md" />
                </div>

                <div>
                  <Label htmlFor="logo">Upload da Logo</Label>
                  <div className="mt-2">
                    <input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo').click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Escolher Imagem'}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Formatos aceitos: PNG, JPG, SVG. Tamanho recomendado: 400x400px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {perms.canEdit && (
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600"
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          )}
          </fieldset>
        </form>
      </div>
    </div>
  );
}
