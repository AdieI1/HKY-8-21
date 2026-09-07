import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login form', async () => {
  render(<App />);

  expect(await screen.findByRole('button', { name: /login account/i }, { timeout: 5000 })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /submit/i })).toBeInTheDocument();
});

test('includes accessible image markup for the truck illustration', async () => {
  const { container } = render(<App />);
  await screen.findByRole('button', { name: /login account/i }, { timeout: 5000 });
  const truckImage = container.querySelector('img[src$="truck kun 1.png"]');

  expect(truckImage).toBeTruthy();
  expect(truckImage.getAttribute('alt')).not.toBeNull();
});
