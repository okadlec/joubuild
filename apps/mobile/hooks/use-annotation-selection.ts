import { useState, useCallback } from 'react';

type Mode = 'idle' | 'moving';

export function useAnnotationSelection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('idle');

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setMode('idle');
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setMode('idle');
  }, []);

  const startMove = useCallback(() => {
    setMode('moving');
  }, []);

  const endMove = useCallback(() => {
    setMode('idle');
  }, []);

  return { selectedId, mode, select, deselect, startMove, endMove };
}
