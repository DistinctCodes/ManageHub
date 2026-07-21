"use client";

import { useCallback } from 'react';
import { useAuthActions } from '../store/authStore';

interface ErrorHandlerReturn {
  handleError: (error: any) => void;
}

export const useErrorHandler = (): ErrorHandlerReturn => {
  const { logout } = useAuthActions();

  const handleError = useCallback((error: any) => {
    // Log all errors to the console
    console.log('Error occurred:', error);

    // Handle different error types
    if (error?.response?.status || error?.status) {
      const status = error.response?.status || error.status;
      
      switch (status) {
        case 401:
          // Unauthorized - log the user out
          console.error('Unauthorized access. Logging out user.');
          logout();
          break;
          
        case 403:
          // Forbidden
          console.warn('Forbidden access. User lacks required permissions.');
          break;
          
        case 404:
          // Not Found
          console.warn('Resource not found.');
          break;
          
        case 500:
          // Internal Server Error
          console.error('Internal server error occurred.');
          break;
          
        default:
          // Default error handler for unexpected cases
          console.error('Unexpected error occurred:', error);
          break;
      }
    } else {
      // Default error handler for unexpected cases
      console.error('Unexpected error occurred:', error);
    }
  }, [logout]);

  return {
    handleError
  };
};
