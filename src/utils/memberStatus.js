export const ARQUIVO_MORTO_STATUSES = ['inativo', 'transferido'];

export const isArchivedMember = (membro) =>
  ARQUIVO_MORTO_STATUSES.includes((membro?.status || '').toLowerCase());

export const isActiveMember = (membro) => (membro?.status || 'ativo') === 'ativo';
