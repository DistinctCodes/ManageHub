import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarUploader } from './AvatarUploader';

beforeEach(() => {
  (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
  (global as any).URL.revokeObjectURL = vi.fn();
});

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'.repeat(size)], name, { type });
  return file;
}

describe('AvatarUploader', () => {
  it('renders upload button', () => {
    render(<AvatarUploader onFileSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /upload profile picture/i })).toBeInTheDocument();
  });

  it('shows error for non-image file type', () => {
    render(<AvatarUploader onFileSelect={vi.fn()} />);
    const input = screen.getByTestId('avatar-input');
    fireEvent.change(input, { target: { files: [makeFile('doc.pdf', 'application/pdf', 100)] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/jpeg and png/i);
  });

  it('shows error when file exceeds 2MB', () => {
    render(<AvatarUploader onFileSelect={vi.fn()} />);
    const input = screen.getByTestId('avatar-input');
    fireEvent.change(input, { target: { files: [makeFile('big.jpg', 'image/jpeg', 3 * 1024 * 1024)] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/2mb/i);
  });

  it('calls onFileSelect with valid file', () => {
    const onFileSelect = vi.fn();
    render(<AvatarUploader onFileSelect={onFileSelect} />);
    const input = screen.getByTestId('avatar-input');
    const file = makeFile('avatar.png', 'image/png', 500);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});