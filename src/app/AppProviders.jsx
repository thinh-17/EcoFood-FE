import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/app/queryClient';

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}