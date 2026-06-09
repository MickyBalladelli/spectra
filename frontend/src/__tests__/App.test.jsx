// Test for App component
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock environment variables for Vite
beforeAll(() => {
  window.importMetaEnv = {
    VITE_API_URL: 'http://localhost:4000',
  };
});

// Mock lazy-loaded components to avoid dynamic imports in tests
jest.mock('../components/ClusterOverview.jsx', () => ({
  __esModule: true,
  default: () => <div>Mock Cluster Overview</div>
}));

jest.mock('../components/DataExplorer.jsx', () => ({
  __esModule: true,
  default: () => <div>Mock Data Explorer</div>
}));

jest.mock('../components/IngestionPanel.jsx', () => ({
  __esModule: true,
  default: () => <div>Mock Ingestion Panel</div>
}));

jest.mock('../components/SearchView.jsx', () => ({
  __esModule: true,
  default: () => <div>Mock Search View</div>
}));

describe('App Component', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('Spectra')).toBeInTheDocument();
  });

  it('has a sign in button', () => {
    render(<App />);
    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    expect(signInButton).toBeInTheDocument();
  });
});
