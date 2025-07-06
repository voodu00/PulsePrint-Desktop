import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PrintPulse dashboard', () => {
  render(<App />);
  const loadingElement = screen.getByText(/loading dashboard/i);
  expect(loadingElement).toBeInTheDocument();
});

test('renders initialization message', () => {
  render(<App />);
  const initElement = screen.getByText(/initializing printer connections/i);
  expect(initElement).toBeInTheDocument();
});
