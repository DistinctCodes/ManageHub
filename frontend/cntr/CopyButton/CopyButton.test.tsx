import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopyButton from './CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders default Copy label', () => {
    render(<CopyButton text="hello" />);

    expect(
      screen.getByRole('button', { name: /copy/i }),
    ).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(
      <CopyButton
        text="hello"
        label="Copy API Key"
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /copy api key/i,
      }),
    ).toBeInTheDocument();
  });

  it('copies text using clipboard api', async () => {
    render(<CopyButton text="workspace-123" />);

    fireEvent.click(
      screen.getByRole('button'),
    );

    await waitFor(() => {
      expect(
        navigator.clipboard.writeText,
      ).toHaveBeenCalledWith(
        'workspace-123',
      );
    });
  });

  it('shows copied confirmation', async () => {
    render(<CopyButton text="abc" />);

    fireEvent.click(
      screen.getByRole('button'),
    );

    expect(
      await screen.findByText(/copied!/i),
    ).toBeInTheDocument();
  });

  it('returns to default label after 2000ms', async () => {
    render(<CopyButton text="abc" />);

    fireEvent.click(
      screen.getByRole('button'),
    );

    expect(
      await screen.findByText(/copied!/i),
    ).toBeInTheDocument();

    jest.advanceTimersByTime(2000);

    expect(
      screen.getByRole('button', {
        name: /copy/i,
      }),
    ).toBeInTheDocument();
  });

  it('falls back to execCommand when clipboard api is unavailable', () => {
    Object.defineProperty(
      navigator,
      'clipboard',
      {
        value: undefined,
        configurable: true,
      },
    );

    const execSpy = jest
      .spyOn(document, 'execCommand')
      .mockImplementation(() => true);

    render(<CopyButton text="fallback-text" />);

    fireEvent.click(
      screen.getByRole('button'),
    );

    expect(execSpy).toHaveBeenCalledWith(
      'copy',
    );
  });
});