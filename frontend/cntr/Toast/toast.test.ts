import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }));

import { toast } from 'sonner';
import { showSuccess, showError, showInfo, showLoading, dismissToast } from './toast';

describe('toast', () => {
  beforeEach(() => vi.clearAllMocks());
  it('showSuccess calls toast.success with 4000ms', () => { showSuccess('ok'); expect(toast.success).toHaveBeenCalledWith('ok', { duration: 4000 }); });
  it('showError calls toast.error with Infinity', () => { showError('err'); expect(toast.error).toHaveBeenCalledWith('err', { duration: Infinity }); });
  it('showInfo calls toast.info with 4000ms', () => { showInfo('info'); expect(toast.info).toHaveBeenCalledWith('info', { duration: 4000 }); });
  it('showLoading calls toast.loading', () => { showLoading('loading'); expect(toast.loading).toHaveBeenCalledWith('loading'); });
  it('dismissToast calls toast.dismiss', () => { dismissToast('id'); expect(toast.dismiss).toHaveBeenCalledWith('id'); });
});