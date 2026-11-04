import { lazy } from 'react';
import { Skeleton } from '@/components/ui';
import { AppLayout } from '../components/layout/AppLayout';

const Chart = lazy(() => import('../components/HeavyChart'));

export default function Home() {
  return <AppLayout><Skeleton /><Chart /></AppLayout>;
}
