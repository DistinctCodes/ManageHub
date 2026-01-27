# ManageHub Error Codes - Frontend Integration Guide

This document provides complete error code mappings for frontend applications integrating with ManageHub smart contracts.

## Error Code Structure

All ManageHub contracts return error codes in the range 1-50, organized by category:

```typescript
interface ContractError {
  code: number;           // Soroban error code
  category: string;       // Error category for UI handling
  recoverable: boolean;   // Can user retry this operation?
  critical: boolean;      // Requires immediate attention?
  message: string;        // User-friendly error message
  suggestedAction?: string; // What user should do next
}
```



## Frontend Implementation Examples

### **React/TypeScript Implementation**

```typescript
// Error mapping utility
export enum ManageHubErrorCode {
  // Critical Errors
  CONTRACT_INITIALIZATION_FAILED = 1,
  STORAGE_CORRUPTION = 2,
  SYSTEM_MAINTENANCE_MODE = 3,
  
  // Authentication
  AUTHENTICATION_REQUIRED = 6,
  INSUFFICIENT_PERMISSIONS = 7,
  ADMIN_PRIVILEGES_REQUIRED = 8,
  ACCOUNT_LOCKED = 9,
  SESSION_EXPIRED = 10,
  
  // Subscription
  SUBSCRIPTION_NOT_FOUND = 11,
  SUBSCRIPTION_ALREADY_EXISTS = 12,
  SUBSCRIPTION_EXPIRED = 13,
  SUBSCRIPTION_INACTIVE = 14,
  SUBSCRIPTION_RENEWAL_FAILED = 15,
  
  // Payment
  INVALID_PAYMENT_AMOUNT = 16,
  INVALID_PAYMENT_TOKEN = 17,
  INSUFFICIENT_BALANCE = 18,
  PAYMENT_TRANSACTION_FAILED = 19,
  USDC_CONTRACT_NOT_SET = 20,
  
  // Token
  TOKEN_NOT_FOUND = 21,
  TOKEN_ALREADY_ISSUED = 22,
  TOKEN_EXPIRED = 23,
  INVALID_EXPIRY_DATE = 24,
  TOKEN_METADATA_VALIDATION_FAILED = 25,
  METADATA_NOT_FOUND = 26,
  
  // Attendance
  ATTENDANCE_LOG_FAILED = 27,
  INVALID_EVENT_DETAILS = 28,
  ATTENDANCE_VALIDATION_FAILED = 29,
  
  // Tier
  TIER_NOT_FOUND = 30,
  TIER_ALREADY_EXISTS = 31,
  TIER_NOT_ACTIVE = 32,
  FEATURE_NOT_AVAILABLE = 33,
  
  // Access Control
  ACCESS_CONTROL_VALIDATION_FAILED = 34,
  ROLE_NOT_FOUND = 35,
  PERMISSION_DENIED = 36,
  ROLE_HIERARCHY_VIOLATION = 37,
  
  // Validation
  INPUT_VALIDATION_FAILED = 38,
  INVALID_STRING_FORMAT = 39,
  TIMESTAMP_OVERFLOW = 40,
  INVALID_ADDRESS_FORMAT = 41,
  
  // Storage
  STORAGE_OPERATION_FAILED = 42,
  DATA_NOT_FOUND = 43,
  NETWORK_COMMUNICATION_FAILED = 44,
  EXTERNAL_SERVICE_UNAVAILABLE = 45,
  BUSINESS_RULE_VIOLATION = 46,
  OPERATION_NOT_PERMITTED_IN_CURRENT_STATE = 47,
  CONFIGURATION_ERROR = 48,
  OPERATION_FAILED = 49,
  TEMPORARY_SERVICE_UNAVAILABLE = 50,
}

export interface ManageHubError {
  code: ManageHubErrorCode;
  category: string;
  recoverable: boolean;
  critical: boolean;
  message: string;
  suggestedAction?: string;
}

// Error handling utility
export class ManageHubErrorHandler {
  private static errorMap: Map<ManageHubErrorCode, ManageHubError> = new Map([
    [ManageHubErrorCode.AUTHENTICATION_REQUIRED, {
      code: ManageHubErrorCode.AUTHENTICATION_REQUIRED,
      category: 'Authentication',
      recoverable: true,
      critical: false,
      message: 'Please connect your wallet to continue',
      suggestedAction: 'Click "Connect Wallet" to authenticate'
    }],
    [ManageHubErrorCode.INSUFFICIENT_BALANCE, {
      code: ManageHubErrorCode.INSUFFICIENT_BALANCE,
      category: 'Payment',
      recoverable: true,
      critical: false,
      message: 'Insufficient balance for this transaction',
      suggestedAction: 'Add funds to your wallet and try again'
    }],
    [ManageHubErrorCode.SUBSCRIPTION_EXPIRED, {
      code: ManageHubErrorCode.SUBSCRIPTION_EXPIRED,
      category: 'Subscription',
      recoverable: true,
      critical: false,
      message: 'Your subscription has expired',
      suggestedAction: 'Renew your subscription to continue'
    }],
    // ... add all error mappings
  ]);

  static getError(code: number): ManageHubError | null {
    return this.errorMap.get(code as ManageHubErrorCode) || null;
  }

  static isRecoverable(code: number): boolean {
    const error = this.getError(code);
    return error?.recoverable || false;
  }

  static isCritical(code: number): boolean {
    const error = this.getError(code);
    return error?.critical || false;
  }

  static getUserMessage(code: number): string {
    const error = this.getError(code);
    return error?.message || 'An unexpected error occurred';
  }

  static getSuggestedAction(code: number): string | undefined {
    const error = this.getError(code);
    return error?.suggestedAction;
  }
}
```

### **Error Handling Hook**

```typescript
// React hook for error handling
export const useManageHubError = () => {
  const [error, setError] = useState<ManageHubError | null>(null);

  const handleContractError = useCallback((contractError: any) => {
    const errorCode = contractError?.code || contractError?.message?.match(/Error\(Contract, #(\d+)\)/)?.[1];
    
    if (errorCode) {
      const managedError = ManageHubErrorHandler.getError(parseInt(errorCode));
      setError(managedError);
      
      // Auto-clear recoverable errors after delay
      if (managedError?.recoverable) {
        setTimeout(() => setError(null), 5000);
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleContractError,
    clearError,
    isRecoverable: error?.recoverable || false,
    isCritical: error?.critical || false,
    userMessage: error?.message || '',
    suggestedAction: error?.suggestedAction,
  };
};
```

### **Error Display Component**

```tsx
interface ErrorDisplayProps {
  error: ManageHubError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  onDismiss 
}) => {
  const getErrorColor = () => {
    if (error.critical) return 'red';
    if (error.recoverable) return 'orange';
    return 'gray';
  };

  return (
    <div className={`error-display error-${getErrorColor()}`}>
      <div className="error-content">
        <h3>Error {error.code}</h3>
        <p>{error.message}</p>
        {error.suggestedAction && (
          <p className="suggested-action">{error.suggestedAction}</p>
        )}
      </div>
      
      <div className="error-actions">
        {error.recoverable && onRetry && (
          <button onClick={onRetry} className="retry-button">
            Try Again
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-button">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
```

### **Usage Example**

```tsx
export const SubscriptionPage: React.FC = () => {
  const { error, handleContractError, clearError } = useManageHubError();
  const [loading, setLoading] = useState(false);

  const handleCreateSubscription = async () => {
    try {
      setLoading(true);
      await contractClient.createSubscription({
        id: 'sub-001',
        amount: 1000,
        duration: 2592000 // 30 days
      });
    } catch (contractError) {
      handleContractError(contractError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-page">
      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={error.recoverable ? handleCreateSubscription : undefined}
          onDismiss={clearError}
        />
      )}
      
      <button 
        onClick={handleCreateSubscription}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Subscription'}
      </button>
    </div>
  );
};
```

## Testing Error Handling

### **Unit Tests**

```typescript
describe('ManageHub Error Handling', () => {
  test('should handle authentication errors', () => {
    const error = ManageHubErrorHandler.getError(ManageHubErrorCode.AUTHENTICATION_REQUIRED);
    expect(error?.recoverable).toBe(true);
    expect(error?.category).toBe('Authentication');
  });

  test('should handle payment errors', () => {
    const error = ManageHubErrorHandler.getError(ManageHubErrorCode.INSUFFICIENT_BALANCE);
    expect(error?.message).toContain('balance');
    expect(error?.suggestedAction).toContain('Add funds');
  });

  test('should identify critical errors', () => {
    expect(ManageHubErrorHandler.isCritical(ManageHubErrorCode.STORAGE_CORRUPTION)).toBe(true);
    expect(ManageHubErrorHandler.isCritical(ManageHubErrorCode.INSUFFICIENT_BALANCE)).toBe(false);
  });
});
```

### **Integration Testing**

```typescript
describe('Contract Integration', () => {
  test('should handle subscription creation errors', async () => {
    const { handleContractError } = useManageHubError();
    
    try {
      await contractClient.createSubscription({ id: '', amount: 0 });
    } catch (error) {
      handleContractError(error);
      // Verify error is properly categorized and handled
    }
  });
});
```

## Error Monitoring & Analytics

### **Error Tracking**

```typescript
// Track errors for analytics
export const trackError = (error: ManageHubError, context?: any) => {
  // Send to analytics service
  analytics.track('Contract Error', {
    errorCode: error.code,
    category: error.category,
    recoverable: error.recoverable,
    critical: error.critical,
    context
  });

  // Log critical errors immediately
  if (error.critical) {
    console.error('Critical ManageHub Error:', error);
    // Send to monitoring service
  }
};
```

### **Error Rate Monitoring**

```typescript
// Monitor error rates by category
export class ErrorMetrics {
  private static errorCounts = new Map<string, number>();

  static recordError(category: string) {
    const current = this.errorCounts.get(category) || 0;
    this.errorCounts.set(category, current + 1);
  }

  static getErrorRate(category: string): number {
    return this.errorCounts.get(category) || 0;
  }

  static getTopErrors(): Array<{ category: string; count: number }> {
    return Array.from(this.errorCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
```