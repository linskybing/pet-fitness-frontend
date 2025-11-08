import { useState, useCallback, useRef } from 'react';

/**
 * Extended Window interface for TownPass bridge methods
 */
interface TownPassWindow extends Window {
  TownPass?: {
    getUser?: () => TownPassUser;
  };
  webkit?: {
    messageHandlers?: {
      TownPass?: {
        postMessage: (data: { action: string }) => void;
      };
    };
  };
  ReactNativeWebView?: {
    postMessage: (data: string) => void;
  };
  __onTownPassUser?: (user: TownPassUser) => void;
}

/**
 * TownPass User data structure
 * This should match the data format provided by the TownPass native app
 */
export interface TownPassUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  token?: string;
  signature?: string;
  timestamp?: number;
  [key: string]: unknown; // Allow additional fields from TownPass
}

/**
 * Options for the useTownPassAuth hook
 */
export interface UseTownPassAuthOptions {
  /**
   * Enable debug logging to console
   * Can also be enabled via DEBUG environment variable
   */
  debug?: boolean;

  /**
   * Timeout in milliseconds for waiting for TownPass response
   * Default: 3000ms (3 seconds)
   */
  timeout?: number;

  /**
   * Backend endpoint for TownPass authentication
   * Default: '/api/auth/townpass'
   */
  authEndpoint?: string;
}

/**
 * State of the TownPass authentication process
 */
export interface TownPassAuthState {
  user: TownPassUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Hook for TownPass WebView authentication
 * 
 * This hook attempts to communicate with TownPass native app using multiple bridge strategies:
 * 1. window.TownPass.getUser() - Direct method call
 * 2. webkit.messageHandlers.TownPass.postMessage() - iOS WKWebView
 * 3. window.postMessage() - Standard web messaging
 * 4. window.ReactNativeWebView.postMessage() - React Native WebView
 * 5. window.__onTownPassUser - Callback registration for async response
 * 
 * Usage:
 * ```tsx
 * const { requestTownPassUser, loginWithTownPass, user, isLoading, error } = useTownPassAuth({ debug: true });
 * 
 * useEffect(() => {
 *   requestTownPassUser();
 * }, []);
 * 
 * useEffect(() => {
 *   if (user) {
 *     loginWithTownPass(user);
 *   }
 * }, [user]);
 * ```
 * 
 * To simulate TownPass messages in desktop browser for testing:
 * 
 * Method 1 - TownPass message channel (recommended for real TownPass app):
 * ```javascript
 * // In browser console, simulate TownPass message channel:
 * window.townpass_message_channel = {
 *   postMessage: function(msg) { console.log('Sent to TownPass:', msg); },
 *   addEventListener: function(event, handler) {
 *     setTimeout(() => {
 *       handler({
 *         data: JSON.stringify({
 *           name: 'userinfo',
 *           data: JSON.stringify({
 *             id: 'test-user-123',
 *             name: 'Test User',
 *             email: 'test@example.com'
 *           })
 *         })
 *       });
 *     }, 100);
 *   }
 * };
 * // Then call requestTownPassUser()
 * ```
 * 
 * Method 2 - Direct callback:
 * ```javascript
 * // In browser console after page loads:
 * if (window.__onTownPassUser) {
 *   window.__onTownPassUser({
 *     id: 'test-user-123',
 *     name: 'Test User',
 *     email: 'test@example.com',
 *     token: 'mock-jwt-token',
 *     signature: 'mock-signature',
 *     timestamp: Date.now()
 *   });
 * }
 * ```
 * 
 * Method 3 - Mock TownPass object:
 * ```javascript
 * window.TownPass = {
 *   getUser: () => ({
 *     id: 'test-user-123',
 *     name: 'Test User',
 *     token: 'mock-jwt-token'
 *   })
 * };
 * // Then trigger requestTownPassUser()
 * ```
 * 
 * Backend Integration:
 * The backend endpoint should:
 * 1. Receive POST request to /api/auth/townpass with body: { townpass_user: TownPassUser }
 * 2. Verify the signature/token with TownPass API
 * 3. Create or update user session
 * 4. Return authentication status and user data
 * 
 * Example backend verification (Node.js/Express):
 * ```javascript
 * app.post('/api/auth/townpass', async (req, res) => {
 *   const { townpass_user } = req.body;
 *   
 *   // Verify signature with TownPass public key or API
 *   const isValid = await verifyTownPassSignature(
 *     townpass_user.signature,
 *     townpass_user.token,
 *     townpass_user.timestamp
 *   );
 *   
 *   if (!isValid) {
 *     return res.status(401).json({ error: 'Invalid TownPass signature' });
 *   }
 *   
 *   // Create/update user session
 *   req.session.userId = townpass_user.id;
 *   req.session.townpass = townpass_user;
 *   
 *   res.json({ success: true, user: townpass_user });
 * });
 * ```
 */
export function useTownPassAuth(options: UseTownPassAuthOptions = {}) {
  const {
    debug = false,
    timeout = 3000,
    authEndpoint = '/api/auth/townpass'
  } = options;

  const [state, setState] = useState<TownPassAuthState>({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Check if debug mode is enabled via environment or option
  const isDebugEnabled = debug || (typeof process !== 'undefined' && process.env?.DEBUG === 'true');

  const log = useCallback((...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log('[TownPassAuth]', ...args);
    }
  }, [isDebugEnabled]);

  const logError = useCallback((...args: unknown[]) => {
    if (isDebugEnabled) {
      console.error('[TownPassAuth]', ...args);
    }
  }, [isDebugEnabled]);

  /**
   * Clear timeout and event listeners
   */
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (listenerRef.current) {
      const win = window as any;
      if (win.townpass_message_channel?.removeEventListener) {
        win.townpass_message_channel.removeEventListener('message', listenerRef.current);
      }
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = null;
    }
  }, []);

  /**
   * Handle successful user retrieval
   */
  const handleUserReceived = useCallback((user: TownPassUser) => {
    log('User received:', user);
    cleanup();
    setState(prev => ({
      ...prev,
      user,
      isLoading: false,
      error: null
    }));
  }, [cleanup, log]);

  /**
   * Handle timeout - no response from TownPass
   */
  const handleTimeout = useCallback(() => {
    logError('Timeout: No response from TownPass within', timeout, 'ms');
    cleanup();
    setState(prev => ({
      ...prev,
      user: null,
      isLoading: false,
      error: 'TownPass authentication timeout'
    }));
  }, [cleanup, logError, timeout]);

  /**
   * Request TownPass user information using multiple bridge strategies
   * Returns null if no response within timeout period
   */
  const requestTownPassUser = useCallback(async () => {
    log('Requesting TownPass user...');

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Clear any existing listeners/timeouts
    cleanup();

    // Set timeout
    timeoutRef.current = setTimeout(handleTimeout, timeout);

    // Check if TownPass message channel exists
    const win = window as any;
    const hasTownPassChannel = win.townpass_message_channel;

    if (hasTownPassChannel) {
      log('TownPass message channel detected');

      // Set up listener for TownPass response
      const messageHandler = (event: MessageEvent) => {
        try {
          log('Received message:', event.data);

          // TownPass sends messages in format: { name: 'userinfo', data: '...' }
          let messageData = event.data;
          if (typeof messageData === 'string') {
            messageData = JSON.parse(messageData);
          }

          if (messageData.name === 'userinfo' && messageData.data) {
            const userData = typeof messageData.data === 'string'
              ? JSON.parse(messageData.data)
              : messageData.data;

            log('Parsed user data:', userData);
            handleUserReceived(userData);
          }
        } catch (err) {
          logError('Error parsing TownPass message:', err);
        }
      };

      // Listen for messages from TownPass
      if (win.townpass_message_channel.addEventListener) {
        win.townpass_message_channel.addEventListener('message', messageHandler);
        listenerRef.current = messageHandler;
      } else if (win.townpass_message_channel.onmessage) {
        win.townpass_message_channel.onmessage = messageHandler;
      }

      // Request user info from TownPass
      try {
        const requestMessage = JSON.stringify({ name: 'userinfo', data: null });
        log('Sending request to TownPass:', requestMessage);
        win.townpass_message_channel.postMessage(requestMessage);
      } catch (err) {
        logError('Failed to send message to TownPass:', err);
      }
    } else {
      log('TownPass message channel not found, trying fallback methods');

      // Strategy 1: Try direct TownPass.getUser() method
      try {
        if (win.TownPass && typeof win.TownPass.getUser === 'function') {
          log('Attempting Strategy 1: window.TownPass.getUser()');
          const user = win.TownPass.getUser();
          if (user) {
            handleUserReceived(user);
            return;
          }
        }
      } catch (err) {
        logError('Strategy 1 failed:', err);
      }

      // Strategy 2: Try iOS WKWebView message handler
      try {
        if (win.webkit?.messageHandlers?.TownPass) {
          log('Attempting Strategy 2: webkit.messageHandlers.TownPass');
          win.webkit.messageHandlers.TownPass.postMessage({ action: 'getUser' });
        }
      } catch (err) {
        logError('Strategy 2 failed:', err);
      }

      // Strategy 3: Try React Native WebView postMessage
      try {
        if (win.ReactNativeWebView?.postMessage) {
          log('Attempting Strategy 3: ReactNativeWebView.postMessage');
          win.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TOWNPASS_GET_USER'
          }));
        }
      } catch (err) {
        logError('Strategy 3 failed:', err);
      }
    }

    // Strategy 4: Try standard window.postMessage
    try {
      log('Attempting Strategy 4: window.postMessage');
      window.postMessage({ type: 'TOWNPASS_GET_USER' }, '*');
    } catch (err) {
      logError('Strategy 4 failed:', err);
    }

    // Strategy 5: Register callback for async response
    try {
      const win = window as TownPassWindow;
      log('Attempting Strategy 5: Registering __onTownPassUser callback');
      win.__onTownPassUser = (user: TownPassUser) => {
        handleUserReceived(user);
      };
    } catch (err) {
      logError('Strategy 5 failed:', err);
    }

    // Listen for postMessage responses
    const messageListener = (event: MessageEvent) => {
      log('Received message event:', event.data);

      // Check if this is a TownPass user message
      if (event.data?.type === 'TOWNPASS_USER' && event.data?.user) {
        handleUserReceived(event.data.user);
      } else if (event.data?.townpass_user) {
        // Alternative format
        handleUserReceived(event.data.townpass_user);
      }
    };

    listenerRef.current = messageListener;
    window.addEventListener('message', messageListener);

    log('All strategies initiated, waiting for response...');
  }, [cleanup, handleTimeout, handleUserReceived, log, logError, timeout]);

  /**
   * Login with TownPass user by posting to backend
   * 
   * @param user - TownPass user object to authenticate
   * @returns Promise that resolves with the backend response
   */
  const loginWithTownPass = useCallback(async (user: TownPassUser) => {
    log('Logging in with TownPass user:', user.id);

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important: include cookies for session
        body: JSON.stringify({
          townpass_user: user
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      log('Login successful:', data);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: true,
        error: null
      }));

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during login';
      logError('Login failed:', errorMessage);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        error: errorMessage
      }));

      throw err;
    }
  }, [authEndpoint, log, logError]);

  /**
   * Reset authentication state
   */
  const reset = useCallback(() => {
    log('Resetting authentication state');
    cleanup();
    setState({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    });
  }, [cleanup, log]);

  return {
    // State
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,

    // Actions
    requestTownPassUser,
    loginWithTownPass,
    reset
  };
}
