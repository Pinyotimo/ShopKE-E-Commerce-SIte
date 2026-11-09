import { useEffect, useState } from 'react';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api, kes } from '../../api';
import { Empty, Spinner, Title } from '../../ui';

const blank = { name: '', description: '', price: '', stock: '', category: '', photos: '', sale_price: '', sale_ends_at: '' };
// One photo URL per line; the first is the cover.
const photoList = (text: string) => text.split(/\s+/).map(x => x.trim()).filter(x => /^https?:\/\//i.test(x));

export default function DashProducts() {
  const [ps, setPs] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [f, setF] = useState<any>(blank);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<any>(null);

  const load = () => api('/staff/products').then(setPs).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const cats = [...new Set((ps || []).map(p => p.category))];
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const openForm = (p?: any) => {
    setEdit(p || null);
    setF(p ? { 
      name: p.name, 
      description: p.description || '', 
      price: String(p.price), 
      stock: String(p.stock), 
      category: p.category || '', 
      photos: (p.images?.length ? p.images : p.image_url ? [p.image_url] : []).join('\n'),
      sale_price: p.sale_price ? String(p.sale_price) : '',
      sale_ends_at: p.sale_ends_at ? new Date(p.sale_ends_at).toLocaleString('sv').replace(' ', 'T').slice(0, 16) : ''
    } : blank);
    setOpen(true);
  };

  async function save() {
    setBusy(true);
    try {
      await api(edit ? `/staff/products/${edit.id}` : '/staff/products', { 
        method: edit ? 'PATCH' : 'POST', 
        body: { 
          ...f,
          photos: undefined,
          images: photoList(f.photos), 
          price: +f.price, 
          stock: +f.stock,
          sale_price: f.sale_price === '' ? null : +f.sale_price,
          sale_ends_at: f.sale_ends_at ? new Date(f.sale_ends_at).toISOString() : null
        } 
      });
      toast.success(edit ? 'Product updated' : 'Product added'); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const toggle = (p: any) => api(`/staff/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } }).then(load).catch(e => toast.error(e.message));
  
  async function remove() {
    try {
      const r = await api(`/staff/products/${del.id}`, { method: 'DELETE' });
      toast.success(r.archived ? 'Has past orders, so it was archived instead' : 'Product deleted');
    } catch (e: any) { toast.error(e.message); }
    setDel(null); load();
  }
  
  const rows = (ps || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Title action={<Button onClick={() => openForm()}><Plus className="mr-1.5 h-4 w-4" />New product</Button>}>Products</Title>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {ps === null ? <Skeleton className="h-48 rounded-2xl" />
        : !rows.length ? <Empty icon={Package} title="No products" />
        : <Card className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Visible</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(p => (
                <TableRow key={p.id} className={p.active ? '' : 'opacity-50'}>
                  <TableCell><div className="flex items-center gap-3"><img src={p.image_url} alt="" className="h-10 w-10 rounded-lg bg-muted object-cover" /><span className="font-medium">{p.name}</span></div></TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="font-semibold">{kes(p.price)}</TableCell>
                  <TableCell>{p.stock <= 5 ? <Badge variant="outline" className="border-0 bg-amber-100 text-amber-800">{p.stock} left</Badge> : p.stock}</TableCell>
                  <TableCell><Switch checked={p.active} onCheckedChange={() => toggle(p)} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => setDel(p)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? 'Edit product' : 'New product'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={set('name')} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={f.description} onChange={set('description')} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Price (KES)</Label><Input type="number" min={1} value={f.price} onChange={set('price')} /></div>
              <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min={0} value={f.stock} onChange={set('stock')} /></div>
              <div className="space-y-1.5"><Label>Category</Label><Input list="cats" value={f.category} onChange={set('category')} /><datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
            </div>
            <div className="space-y-1.5">
              <Label>Photos <span className="font-normal text-muted-foreground">(one link per line, first is the cover, up to 10)</span></Label>
              <Textarea rows={3} placeholder={'https://…/front.jpg\nhttps://…/side.jpg'} value={f.photos} onChange={set('photos')} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Sale price (optional)</Label><Input type="number" min={1} value={f.sale_price} onChange={set('sale_price')} /></div>
              <div className="space-y-1.5"><Label>Flash sale ends</Label><Input type="datetime-local" value={f.sale_ends_at} onChange={set('sale_ends_at')} /></div>
            </div>

            {photoList(f.photos).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoList(f.photos).slice(0, 10).map((src, i) => (
                  <div key={src + i} className="relative shrink-0">
                    <img src={src} alt="" className="h-20 w-20 rounded-xl border object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">Cover</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter><Button disabled={busy || !f.name || !(+f.price > 0)} onClick={save}>{busy ? <Spinner /> : edit ? 'Save changes' : 'Add product'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={o => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{del?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>If customers have ordered it before, it is archived (hidden) instead so order history stays intact.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}