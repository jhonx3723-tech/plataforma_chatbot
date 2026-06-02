import { useState, useEffect } from 'react';
import { crmAPI } from './api';

export const DEFAULT_STAGES = [
  { id: '__nuevo',       name: 'Nuevo',       color: '#64748b', sort_order: 0, is_won: false, is_lost: false },
  { id: '__contactado',  name: 'Contactado',  color: '#3b82f6', sort_order: 1, is_won: false, is_lost: false },
  { id: '__propuesta',   name: 'Propuesta',   color: '#f59e0b', sort_order: 2, is_won: false, is_lost: false },
  { id: '__negociacion', name: 'Negociación', color: '#f97316', sort_order: 3, is_won: false, is_lost: false },
  { id: '__ganado',      name: 'Ganado',      color: '#10b981', sort_order: 4, is_won: true,  is_lost: false },
  { id: '__perdido',     name: 'Perdido',     color: '#ef4444', sort_order: 5, is_won: false, is_lost: true  },
];

export function useCrmStages(companyId) {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    crmAPI.getStages(companyId)
      .then(setStages)
      .catch(() => setStages(DEFAULT_STAGES))
      .finally(() => setLoading(false));
  }, [companyId]);

  return { stages, setStages, loading };
}
