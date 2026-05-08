import React, { createContext, useContext, useState, useCallback } from 'react';

export type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'processing' | 'finalizing' | 'completed' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  message: string;
  error?: string;
}

interface UploadContextType extends UploadState {
  startUpload: (message: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  updateStatus: (status: UploadStatus, message?: string) => void;
  setUploadError: (error: string) => void;
  resetUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const startUpload = useCallback((message: string) => {
    setState({
      status: 'preparing',
      progress: 0,
      message,
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress,
      status: 'uploading',
      message: message || prev.message,
    }));
  }, []);

  const updateStatus = useCallback((status: UploadStatus, message?: string) => {
    setState(prev => ({
      ...prev,
      status,
      message: message || prev.message,
      // If completed or error, keep the progress at last state or reset
      progress: status === 'completed' ? 100 : prev.progress,
    }));
  }, []);

  const setUploadError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      error,
      message: 'Erro no upload',
    }));
  }, []);

  const resetUpload = useCallback(() => {
    // Small delay to let the UI show completion before disappearing
    setTimeout(() => {
      setState({
        status: 'idle',
        progress: 0,
        message: '',
      });
    }, 3000);
  }, []);

  return (
    <UploadContext.Provider value={{ 
      ...state, 
      startUpload, 
      updateProgress, 
      updateStatus, 
      setUploadError, 
      resetUpload 
    }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};
