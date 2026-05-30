import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AmenitiesList } from './AmenitiesList';

describe('AmenitiesList', () => {
  it('renders a list of amenities with capitalized labels', () => {
    render(<AmenitiesList amenities={['wifi', 'parking', 'air conditioning']} />);
    
    expect(screen.getByText('Wifi')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Air conditioning')).toBeInTheDocument();
  });

  it('renders an unknown amenity and falls back to the Tag icon', () => {
    const { container } = render(<AmenitiesList amenities={['unknown amenity']} />);
    
    expect(screen.getByText('Unknown amenity')).toBeInTheDocument();
    // Verify it renders the fallback Tag icon (lucide icons add class 'lucide-tag')
    expect(container.querySelector('.lucide-tag')).toBeInTheDocument();
  });

  it('handles empty or missing arrays gracefully', () => {
    const { container } = render(<AmenitiesList amenities={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles varied casing and whitespace in inputs', () => {
    render(<AmenitiesList amenities={['  WIFI  ', 'PARKING', 'coFfee']} />);
    
    expect(screen.getByText('Wifi')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });

  it('renders multiple known icons', () => {
    const { container } = render(<AmenitiesList amenities={['wifi', 'parking', 'gym']} />);
    
    expect(container.querySelector('.lucide-wifi')).toBeInTheDocument();
    expect(container.querySelector('.lucide-car')).toBeInTheDocument();
    expect(container.querySelector('.lucide-dumbbell')).toBeInTheDocument();
  });
});
