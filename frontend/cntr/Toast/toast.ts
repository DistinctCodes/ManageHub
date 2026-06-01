import { toast } from 'sonner';

export function showSuccess(message: string): void {
  toast.success(message, { duration: 4000 });
}

export function showError(message: string): void {
  toast.error(message, { duration: Infinity });
}

export function showInfo(message: string): void {
  toast.info(message, { duration: 4000 });
}

export function showLoading(message: string): string | number {
  return toast.loading(message);
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}