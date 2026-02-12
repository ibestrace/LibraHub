import { LibraryProvider } from '@/hooks/useLibrary';
import { Toaster } from '@/components/ui/sonner';
import LibraryDashboard from '@/sections/LibraryDashboard';

function App() {
  return (
    <LibraryProvider>
      <div className="min-h-screen bg-gray-50">
        <LibraryDashboard />
        <Toaster position="top-center" richColors />
      </div>
    </LibraryProvider>
  );
}

export default App;
