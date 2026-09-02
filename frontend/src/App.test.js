import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login form', () => {
  render(<App />);

  expect(screen.getByRole('button', { name: /login account/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
});

test('includes accessible image markup for the truck illustration', () => {
  const { container } = render(<App />);
  const truckImage = container.querySelector('img[src$="truck kun 1.png"]');

  expect(truckImage).toBeTruthy();
  expect(truckImage.getAttribute('alt')).not.toBeNull();
});
