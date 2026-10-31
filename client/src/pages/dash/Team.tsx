import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '../../api';
import { Title } from '../../ui';

export default function Team() {
  const [us, setUs] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const load = () => api('/admin/users').then(setUs).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const setRole = (id: number, role: string) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } })
    .then(() => toast.success(`Role set to ${role}`)).catch(e => toast.error(e.message)).finally(load);
  const rows = (us || []).filter(u => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Title>Team</Title>
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">Staff can manage products and fulfil orders. Ask someone to register first, then set their role here.</p>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or email…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {us === null ? <Skeleton className="h-40 rounded-2xl" /> : (
        <Card className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="w-40">Role</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell><TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.role === 'admin' ? <Badge>Owner</Badge> : (
                      <Select value={u.role} onValueChange={v => setRole(u.id, v)}>
                        <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
                      </Select>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>)}
    </>
  );
}