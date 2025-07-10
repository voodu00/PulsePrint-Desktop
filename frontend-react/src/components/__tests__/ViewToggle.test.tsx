import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewToggle from '../ViewToggle';

describe('ViewToggle', () => {
  const mockOnViewModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders both card and table view buttons', () => {
    render(
      <ViewToggle viewMode="card" onViewModeChange={mockOnViewModeChange} />
    );

    expect(screen.getByTitle('Card View')).toBeInTheDocument();
    expect(screen.getByTitle('Table View')).toBeInTheDocument();
  });

  test('highlights card view when viewMode is card', () => {
    render(
      <ViewToggle viewMode="card" onViewModeChange={mockOnViewModeChange} />
    );

    const cardButton = screen.getByTitle('Card View');
    const tableButton = screen.getByTitle('Table View');

    // Card button should have default variant (highlighted)
    expect(cardButton).toHaveClass('bg-primary'); // default variant styling
    // Table button should have ghost variant (not highlighted)
    expect(tableButton).not.toHaveClass('bg-primary');
  });

  test('highlights table view when viewMode is table', () => {
    render(
      <ViewToggle viewMode="table" onViewModeChange={mockOnViewModeChange} />
    );

    const cardButton = screen.getByTitle('Card View');
    const tableButton = screen.getByTitle('Table View');

    // Table button should have default variant (highlighted)
    expect(tableButton).toHaveClass('bg-primary');
    // Card button should have ghost variant (not highlighted)
    expect(cardButton).not.toHaveClass('bg-primary');
  });

  test('calls onViewModeChange when card button is clicked', () => {
    render(
      <ViewToggle viewMode="table" onViewModeChange={mockOnViewModeChange} />
    );

    const cardButton = screen.getByTitle('Card View');
    fireEvent.click(cardButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('card');
    expect(mockOnViewModeChange).toHaveBeenCalledTimes(1);
  });

  test('calls onViewModeChange when table button is clicked', () => {
    render(
      <ViewToggle viewMode="card" onViewModeChange={mockOnViewModeChange} />
    );

    const tableButton = screen.getByTitle('Table View');
    fireEvent.click(tableButton);

    expect(mockOnViewModeChange).toHaveBeenCalledWith('table');
    expect(mockOnViewModeChange).toHaveBeenCalledTimes(1);
  });

  test('displays text labels on larger screens', () => {
    render(
      <ViewToggle viewMode="card" onViewModeChange={mockOnViewModeChange} />
    );

    // Text labels should be present but hidden on small screens
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();

    // Check that they have the responsive classes
    expect(screen.getByText('Cards')).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByText('Table')).toHaveClass('hidden', 'sm:inline');
  });
});
