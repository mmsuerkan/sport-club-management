import { onSnapshot, Query, DocumentReference, Unsubscribe, QuerySnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';

/**
 * Creates a Firestore listener with proper error handling
 * Silences permission-denied errors during logout
 */
export function createListener<T>(
  query: Query | DocumentReference,
  onData: (data: T) => void,
  options?: {
    onError?: (error: Error) => void;
    transform?: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => T;
  }
): Unsubscribe {
  return onSnapshot(
    query,
    (snapshot) => {
      try {
        if (options?.transform) {
          const data = options.transform(snapshot);
          onData(data);
        } else {
          // Default behavior for QuerySnapshot
          onData(snapshot as T);
        }
      } catch (error) {
        console.error('Error processing snapshot:', error);
      }
    },
    (error) => {
      // Check if it's a permission error during logout
      if (error.code === 'permission-denied') {
        // Silently ignore permission errors - these happen during logout
        return;
      }
      
      // Call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      } else {
        console.error('Firestore listener error:', error);
      }
    }
  );
}