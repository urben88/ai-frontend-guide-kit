import { Skeleton } from '../components/ui/Skeleton';
import DataTable from '../components/DataTable';
import Ghost from './Ghost';

export default function About({ ready }: { ready: boolean }) {
  return ready ? <DataTable /> : <div className="animate-pulse" />;
}
