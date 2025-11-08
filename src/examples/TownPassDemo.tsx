import { useEffect } from 'react';
import { useTownPassAuth } from '@/hooks/useTownPassAuth';

/**
 * TownPassDemo Component
 * 
 * A demonstration component that shows how to use the useTownPassAuth hook
 * for TownPass WebView authentication.
 * 
 * This component:
 * 1. Automatically requests TownPass user info on mount
 * 2. Attempts to login with the backend when user data is received
 * 3. Displays loading, success, and error states
 * 
 * Usage:
 * ```tsx
 * import { TownPassDemo } from '@/examples/TownPassDemo';
 * 
 * // Add to your app for testing
 * function App() {
 *   return (
 *     <div>
 *       <TownPassDemo />
 *     </div>
 *   );
 * }
 * ```
 * 
 * Note: This is a demo component and does not modify existing app routing.
 * To integrate TownPass auth into your app:
 * 1. Import useTownPassAuth in your login page or App root
 * 2. Call requestTownPassUser() when appropriate (e.g., on mount or button click)
 * 3. Handle the user data and call loginWithTownPass()
 * 4. Update your app's authentication state accordingly
 */
export function TownPassDemo() {
  const {
    user,
    isLoading,
    error,
    isAuthenticated,
    requestTownPassUser,
    loginWithTownPass,
    reset
  } = useTownPassAuth({
    debug: true, // Enable debug logging for demo
    timeout: 3000
  });

  // Request TownPass user on component mount
  useEffect(() => {
    console.log('[TownPassDemo] Component mounted, requesting TownPass user...');
    requestTownPassUser();
  }, [requestTownPassUser]);

  // Attempt login when user data is received
  useEffect(() => {
    if (user && !isAuthenticated && !isLoading) {
      console.log('[TownPassDemo] User received, attempting login...');
      loginWithTownPass(user).catch((err) => {
        console.error('[TownPassDemo] Login failed:', err);
      });
    }
  }, [user, isAuthenticated, isLoading, loginWithTownPass]);

  return (
    <div className="townpass-demo-container p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            TownPass Authentication Demo
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Demonstrating TownPass WebView authentication
          </p>
        </div>

        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Status:</span>
            {isLoading && (
              <span className="flex items-center text-blue-600">
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            )}
            {!isLoading && !user && !error && (
              <span className="text-gray-500">Waiting for TownPass...</span>
            )}
            {!isLoading && isAuthenticated && (
              <span className="text-green-600 font-semibold">✓ Authenticated</span>
            )}
            {!isLoading && error && (
              <span className="text-red-600 font-semibold">✗ Error</span>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Data Display */}
        {user && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">
              TownPass User Data Received
            </h3>
            <pre className="text-xs bg-white p-3 rounded border border-green-100 overflow-x-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Authentication Status */}
        {isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Success</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Successfully authenticated with backend
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Testing in Desktop Browser
          </h3>
          <p className="text-xs text-gray-600 mb-2">
            Open browser console and paste one of these commands:
          </p>
          
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Method 1: Direct callback</p>
              <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
{`if (window.__onTownPassUser) {
  window.__onTownPassUser({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    token: 'mock-jwt-token'
  });
}`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Method 2: postMessage event</p>
              <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
{`window.postMessage({
  type: 'TOWNPASS_USER',
  user: {
    id: 'test-user-123',
    name: 'Test User'
  }
}, '*');`}
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          <button
            onClick={requestTownPassUser}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Request TownPass User
          </button>
          <button
            onClick={reset}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Reset
          </button>
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 pt-4 border-t">
          <p>
            This component demonstrates the useTownPassAuth hook.
            Check the browser console for debug logs.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TownPassDemo;
