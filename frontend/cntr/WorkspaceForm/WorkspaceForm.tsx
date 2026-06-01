import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const AMENITIES = ['WiFi', 'Parking', 'Coffee', 'Projector', 'AC', 'Standing Desk'];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1).max(500),
  hourlyRateKobo: z.coerce.number().min(0),
  address: z.string().optional(),
  amenities: z.array(z.string()),
});

export type WorkspaceFormData = z.infer<typeof schema>;
interface Props { initialData?: WorkspaceFormData; onSubmit: (d: WorkspaceFormData) => void; isSubmitting?: boolean; }

export function WorkspaceForm({ initialData, onSubmit, isSubmitting }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WorkspaceFormData>({ resolver: zodResolver(schema), defaultValues: initialData ?? { amenities: [] } });
  const amenities = watch('amenities') ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><label className="text-sm font-medium">Name</label><input {...register('name')} className="w-full border rounded px-3 py-2" />{errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}</div>
      <div><label className="text-sm font-medium">Description</label><textarea {...register('description')} className="w-full border rounded px-3 py-2" rows={2} /></div>
      <div><label className="text-sm font-medium">Capacity (1–500)</label><input type="number" {...register('capacity')} className="w-full border rounded px-3 py-2" />{errors.capacity && <p className="text-red-500 text-xs">{errors.capacity.message}</p>}</div>
      <div><label className="text-sm font-medium">Hourly Rate (₦)</label><input type="number" {...register('hourlyRateKobo', { setValueAs: (v) => Number(v) * 100 })} className="w-full border rounded px-3 py-2" /></div>
      <div><label className="text-sm font-medium">Address</label><input {...register('address')} className="w-full border rounded px-3 py-2" /></div>
      <div className="grid grid-cols-2 gap-1">{AMENITIES.map((a) => (<label key={a} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={amenities.includes(a)} onChange={(e) => setValue('amenities', e.target.checked ? [...amenities, a] : amenities.filter((x) => x !== a))} />{a}</label>))}</div>
      <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Save Workspace'}</button>
    </form>
  );
}