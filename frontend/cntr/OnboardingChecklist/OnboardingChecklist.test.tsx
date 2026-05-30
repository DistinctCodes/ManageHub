import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingChecklist, OnboardingStep } from './OnboardingChecklist';

describe('OnboardingChecklist', () => {
  const defaultSteps: OnboardingStep[] = [
    { key: 'step-1', label: 'Create profile', description: 'Add your avatar and bio', isComplete: true },
    { key: 'step-2', label: 'Connect wallet', description: 'Link your Web3 wallet', isComplete: false },
    { key: 'step-3', label: 'Join community', description: 'Say hi in the forum', isComplete: false },
  ];

  it('renders the correct number of steps and progress text', () => {
    render(<OnboardingChecklist steps={defaultSteps} />);
    
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
    
    expect(screen.getByText('Create profile')).toBeInTheDocument();
    expect(screen.getByText('Connect wallet')).toBeInTheDocument();
    expect(screen.getByText('Join community')).toBeInTheDocument();
  });

  it('calculates the progress bar width correctly', () => {
    const { container } = render(<OnboardingChecklist steps={defaultSteps} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    // 1 out of 3 is 33%
    expect(progressBar).toHaveStyle('width: 33%');
  });

  it('applies strikethrough styling to completed steps', () => {
    render(<OnboardingChecklist steps={defaultSteps} />);
    
    const completedLabel = screen.getByText('Create profile');
    expect(completedLabel.className).toContain('line-through');
    
    const incompleteLabel = screen.getByText('Connect wallet');
    expect(incompleteLabel.className).not.toContain('line-through');
  });

  it('calls onStepClick when an incomplete step is clicked', () => {
    const onStepClick = vi.fn();
    render(<OnboardingChecklist steps={defaultSteps} onStepClick={onStepClick} />);
    
    const incompleteStep = screen.getByText('Connect wallet');
    fireEvent.click(incompleteStep);
    
    expect(onStepClick).toHaveBeenCalledTimes(1);
    expect(onStepClick).toHaveBeenCalledWith('step-2');
  });

  it('does not call onStepClick when a completed step is clicked', () => {
    const onStepClick = vi.fn();
    render(<OnboardingChecklist steps={defaultSteps} onStepClick={onStepClick} />);
    
    const completedStep = screen.getByText('Create profile');
    fireEvent.click(completedStep);
    
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it('renders the completion state when all steps are complete', () => {
    const completedSteps = defaultSteps.map(step => ({ ...step, isComplete: true }));
    render(<OnboardingChecklist steps={completedSteps} />);
    
    expect(screen.getByText('Onboarding complete! 🎉')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    expect(screen.queryByText('Create profile')).not.toBeInTheDocument();
  });

  it('renders nothing if steps array is empty', () => {
    const { container } = render(<OnboardingChecklist steps={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
