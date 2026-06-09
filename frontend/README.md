# Spectra Frontend

This directory contains the frontend application for Spectra.

## Testing Setup

Jest and React Testing Library have been configured for testing React components.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Configuration

The project uses:
- **Jest** for running tests
- **React Testing Library** for testing React components
- **@testing-library/jest-dom** for extended DOM assertions
- **@babel/preset-react** for JSX transformation

### Writing Tests

Create test files in the `src/__tests__` directory or alongside your component files (e.g., `Component.test.jsx`).

Example test structure:
```jsx
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

### Mocking

For components that use lazy loading or dynamic imports, mock them in your test file:

```jsx
jest.mock('./LazyComponent.jsx', () => ({
  __esModule: true,
  default: () => <div>Mock Component</div>
}));
```

## Project Structure

```
src/
├── App.jsx                # Main application component
├── main.jsx               # Application entry point
├── theme.js               # Theme configuration
├── userSession.js         # User session management
├── api/                   # API client
│   └── client.js          # HTTP client
├── components/            # React components
├── hooks/                 # Custom hooks
└── __tests__/             # Test files
```

## Dependencies

Key testing dependencies:
- `@testing-library/react` - React DOM testing utilities
- `@testing-library/jest-dom` - Extended DOM assertions
- `jest` - JavaScript testing framework
- `babel-jest` - Jest transformer for Babel