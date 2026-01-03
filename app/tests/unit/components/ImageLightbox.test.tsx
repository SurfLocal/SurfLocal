/**
 * ImageLightbox Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageLightbox from '../../../src/components/ImageLightbox';

describe('ImageLightbox', () => {
  const mockImages = [
    { url: 'https://example.com/image1.jpg', media_type: 'image/jpeg' },
    { url: 'https://example.com/image2.jpg', media_type: 'image/png' },
    { url: 'https://example.com/video.mp4', media_type: 'video/mp4' }
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open is true', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={0} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={0} 
        open={false} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display the correct image based on initialIndex', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={1} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    const image = document.querySelector('img');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe(mockImages[1].url);
  });

  it('should render video for video media type', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={2} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={0} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    // Find the close button by its sr-only text or the X icon button
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons[0]; // First button is typically close
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show navigation buttons when multiple images', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={0} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('should not show navigation buttons for single image', () => {
    render(
      <ImageLightbox 
        images={[mockImages[0]]} 
        initialIndex={0} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    // Should not have prev/next navigation buttons (only close buttons)
    // Navigation arrows use ChevronLeft/ChevronRight icons
    const prevButton = screen.queryByLabelText(/previous/i);
    const nextButton = screen.queryByLabelText(/next/i);
    expect(prevButton).toBeNull();
    expect(nextButton).toBeNull();
  });

  it('should display image counter for multiple images', () => {
    render(
      <ImageLightbox 
        images={mockImages} 
        initialIndex={0} 
        open={true} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByText(/1.*\/.*3/)).toBeInTheDocument();
  });
});
