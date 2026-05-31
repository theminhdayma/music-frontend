import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StemControlItem from './StemControlItem';

describe('StemControlItem', () => {
  const defaultProps = {
    name: 'Vocals',
    icon: 'mic',
    colorClass: 'text-primary',
    progress: 50,
    isMuted: false,
    onMuteToggle: jest.fn(),
    onSoloToggle: jest.fn(),
  };

  it('renders the component with correct name and icon', () => {
    render(<StemControlItem {...defaultProps} />);
    expect(screen.getByText('Vocals')).toBeInTheDocument();
    expect(screen.getByText('mic')).toBeInTheDocument();
  });

  it('calls onMuteToggle when mute button is clicked', () => {
    render(<StemControlItem {...defaultProps} />);
    const muteButton = screen.getByRole('button', { name: /volume_up/i });
    fireEvent.click(muteButton);
    expect(defaultProps.onMuteToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onSoloToggle when solo button is clicked', () => {
    render(<StemControlItem {...defaultProps} />);
    const soloButton = screen.getByRole('button', { name: /Solo/i });
    fireEvent.click(soloButton);
    expect(defaultProps.onSoloToggle).toHaveBeenCalledTimes(1);
  });

  it('displays volume_off icon when isMuted is true', () => {
    render(<StemControlItem {...defaultProps} isMuted={true} />);
    expect(screen.getByText('volume_off')).toBeInTheDocument();
  });
});
