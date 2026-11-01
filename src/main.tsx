import { Toast } from '@base-ui/react/toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/Toaster.tsx'
import { AzureDevOpsError } from './lib/azure-devops.ts'
import { toasts } from './lib/toasts.ts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        const denied = error instanceof AzureDevOpsError && (error.status === 401 || error.status === 403)
        return !denied && failureCount < 3
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={300}>
        <Toast.Provider toastManager={toasts}>
          <App />
          <Toaster />
        </Toast.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
