# TownPass WebView Authentication

This project includes a reusable React + TypeScript hook for authenticating users via the TownPass app's WebView bridge. The implementation supports multiple bridge communication strategies to ensure compatibility across different native platforms (iOS WKWebView, Android WebView, React Native WebView).

## Overview

The TownPass authentication system consists of:

1. **`useTownPassAuth` hook** - A React hook that handles communication with the TownPass native app
2. **`TownPassDemo` component** - A demonstration component showing the hook in action
3. **Backend integration** - API endpoint for verifying and authenticating TownPass users

## Quick Start

### 1. Using the Hook

```tsx
import { useTownPassAuth } from '@/hooks/useTownPassAuth';

function LoginPage() {
  const { 
    user, 
    isLoading, 
    error, 
    isAuthenticated,
    requestTownPassUser,
    loginWithTownPass 
  } = useTownPassAuth({
    debug: true, // Enable console logging
    timeout: 3000 // 3-second timeout
  });

  useEffect(() => {
    // Request user info when component mounts
    requestTownPassUser();
  }, [requestTownPassUser]);

  useEffect(() => {
    // Login when user data is received
    if (user && !isAuthenticated) {
      loginWithTownPass(user).catch(console.error);
    }
  }, [user, isAuthenticated, loginWithTownPass]);

  return (
    <div>
      {isLoading && <p>Connecting to TownPass...</p>}
      {error && <p>Error: {error}</p>}
      {isAuthenticated && <p>Welcome, {user?.name}!</p>}
    </div>
  );
}
```

### 2. Integration Points

#### Option A: Login Page

Add the hook to your existing login page:

```tsx
import { useTownPassAuth } from '@/hooks/useTownPassAuth';

function LoginPage() {
  const { requestTownPassUser, user, isAuthenticated } = useTownPassAuth();

  const handleTownPassLogin = () => {
    requestTownPassUser();
  };

  return (
    <div>
      <button onClick={handleTownPassLogin}>
        Login with TownPass
      </button>
      {/* Rest of your login UI */}
    </div>
  );
}
```

#### Option B: App Root (Auto-detect)

Attempt TownPass authentication automatically when app loads:

```tsx
import { useTownPassAuth } from '@/hooks/useTownPassAuth';

function App() {
  const { requestTownPassUser, isAuthenticated } = useTownPassAuth();

  useEffect(() => {
    // Try TownPass auth on app load
    requestTownPassUser();
  }, []);

  return (
    <Router>
      {/* Your routes */}
    </Router>
  );
}
```

### 3. Demo Component

To see the hook in action, import and use the demo component:

```tsx
import { TownPassDemo } from '@/examples/TownPassDemo';

function App() {
  return (
    <div>
      <TownPassDemo />
    </div>
  );
}
```

## Testing in Desktop Browser

Since TownPass native bridges are not available in desktop browsers, you can simulate the native responses for testing:

### Method 1: Direct Callback (Recommended)

Open your browser's developer console and paste:

```javascript
if (window.__onTownPassUser) {
  window.__onTownPassUser({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+886912345678',
    token: 'mock-jwt-token-here',
    signature: 'mock-signature-here',
    timestamp: Date.now()
  });
}
```

### Method 2: PostMessage Event

```javascript
window.postMessage({
  type: 'TOWNPASS_USER',
  user: {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    token: 'mock-jwt-token'
  }
}, '*');
```

### Method 3: Mock TownPass Object

```javascript
window.TownPass = {
  getUser: () => ({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    token: 'mock-jwt-token'
  })
};

// Then click "Request TownPass User" in the UI
```

## Bridge Communication Strategies

The hook attempts multiple communication strategies in order:

1. **Direct Method Call** - `window.TownPass.getUser()`
2. **iOS WKWebView** - `webkit.messageHandlers.TownPass.postMessage()`
3. **React Native WebView** - `window.ReactNativeWebView.postMessage()`
4. **Standard PostMessage** - `window.postMessage()`
5. **Callback Registration** - `window.__onTownPassUser()`

This ensures compatibility across different native WebView implementations.

## Backend Integration

### API Endpoint

The hook sends a POST request to `/api/auth/townpass` with the following payload:

```json
{
  "townpass_user": {
    "id": "user-unique-id",
    "name": "User Name",
    "email": "user@example.com",
    "token": "jwt-token-from-townpass",
    "signature": "signature-for-verification",
    "timestamp": 1699999999999
  }
}
```

### Backend Implementation Example (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.post('/api/auth/townpass', async (req, res) => {
  try {
    const { townpass_user } = req.body;

    // 1. Verify the signature with TownPass public key or API
    const isValid = await verifyTownPassSignature(
      townpass_user.signature,
      townpass_user.token,
      townpass_user.timestamp
    );

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid TownPass signature' 
      });
    }

    // 2. Check timestamp to prevent replay attacks (within 5 minutes)
    const now = Date.now();
    const timeDiff = Math.abs(now - townpass_user.timestamp);
    if (timeDiff > 5 * 60 * 1000) {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }

    // 3. Create or update user in your database
    const user = await findOrCreateUser({
      townpassId: townpass_user.id,
      email: townpass_user.email,
      name: townpass_user.name
    });

    // 4. Create session
    req.session.userId = user.id;
    req.session.townpass = townpass_user;

    // 5. Return success response
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('TownPass auth error:', error);
    res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
});

// Example signature verification function
async function verifyTownPassSignature(signature, token, timestamp) {
  // TODO: Implement actual verification with TownPass API
  // This might involve:
  // 1. Decoding the JWT token
  // 2. Verifying the signature with TownPass's public key
  // 3. Checking token claims and expiration
  
  // Placeholder implementation:
  // return await townpassAPI.verify({ signature, token, timestamp });
  
  return true; // Replace with actual verification
}
```

### Backend Implementation Example (Python/FastAPI)

```python
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import time

app = FastAPI()

class TownPassUser(BaseModel):
    id: str
    name: Optional[str]
    email: Optional[str]
    token: str
    signature: str
    timestamp: int

class TownPassAuthRequest(BaseModel):
    townpass_user: TownPassUser

@app.post("/api/auth/townpass")
async def townpass_auth(request: Request, body: TownPassAuthRequest):
    try:
        user = body.townpass_user
        
        # 1. Verify signature
        is_valid = await verify_townpass_signature(
            user.signature,
            user.token,
            user.timestamp
        )
        
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # 2. Check timestamp (within 5 minutes)
        now = int(time.time() * 1000)
        if abs(now - user.timestamp) > 5 * 60 * 1000:
            raise HTTPException(status_code=401, detail="Token expired")
        
        # 3. Create or update user in database
        db_user = await find_or_create_user(
            townpass_id=user.id,
            email=user.email,
            name=user.name
        )
        
        # 4. Create session
        request.session["user_id"] = db_user.id
        request.session["townpass"] = user.dict()
        
        # 5. Return success
        return {
            "success": True,
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "name": db_user.name
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def verify_townpass_signature(signature: str, token: str, timestamp: int) -> bool:
    # TODO: Implement actual verification with TownPass API
    return True  # Replace with actual verification
```

## Hook API Reference

### `useTownPassAuth(options?)`

#### Options

```typescript
interface UseTownPassAuthOptions {
  debug?: boolean;        // Enable debug logging (default: false)
  timeout?: number;       // Timeout in ms (default: 3000)
  authEndpoint?: string;  // Backend endpoint (default: '/api/auth/townpass')
}
```

#### Returns

```typescript
{
  // State
  user: TownPassUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  requestTownPassUser: () => void;
  loginWithTownPass: (user: TownPassUser) => Promise<any>;
  reset: () => void;
}
```

### TownPassUser Interface

```typescript
interface TownPassUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  token?: string;
  signature?: string;
  timestamp?: number;
  [key: string]: any; // Additional fields from TownPass
}
```

## Security Considerations

1. **Always verify signatures** - Never trust the client-side data without backend verification
2. **Check timestamps** - Implement replay attack protection by validating timestamps
3. **Use HTTPS** - Always use HTTPS in production to prevent man-in-the-middle attacks
4. **Session management** - Properly manage user sessions with secure cookies
5. **Token expiration** - Implement token expiration and refresh mechanisms
6. **Rate limiting** - Add rate limiting to the auth endpoint to prevent abuse

## Troubleshooting

### "Timeout: No response from TownPass"

This error occurs when:
- Not running in TownPass app WebView
- TownPass app doesn't support the bridge methods
- Network/communication issues

**Solutions:**
- Use the desktop browser testing methods shown above
- Check TownPass app version and bridge compatibility
- Enable debug mode to see which strategies were attempted

### Backend Authentication Fails

Check:
- Backend endpoint is correctly configured
- CORS is properly set up if using different domains
- Cookies/sessions are enabled (`credentials: 'include'`)
- Backend signature verification is working

### Hook Not Receiving User Data

- Enable debug mode: `useTownPassAuth({ debug: true })`
- Check browser console for detailed logs
- Verify TownPass app is sending data in expected format
- Test with simulation methods to isolate the issue

## Future Enhancements

Potential improvements for future versions:

- [ ] Add TypeScript types for backend response
- [ ] Support for token refresh mechanism
- [ ] Automatic retry logic for failed requests
- [ ] Support for additional TownPass features (e.g., permissions, profile updates)
- [ ] Unit tests for hook logic
- [ ] Integration tests with mock TownPass bridge

## License

This implementation is part of the Tamagotchi City project.

## Support

For issues or questions:
1. Check this documentation
2. Enable debug mode and check console logs
3. Open an issue on the project repository
