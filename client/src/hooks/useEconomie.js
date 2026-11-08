import { useSyncExternalStore } from 'react';
import { economieActive, abonnerEconomie } from '../lib/economie';

// true quand le mode économie de données est actif (réagit au changement, y compris depuis un autre onglet).
export default function useEconomie() {
  return useSyncExternalStore(abonnerEconomie, economieActive, () => false);
}
