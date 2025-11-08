/**
 * Improved useTownPassAuth
 *
 * - Registers listeners BEFORE sending requests to avoid race conditions.
 * - Accepts many incoming payload shapes and tries to robustly parse them.
 * - Supports townpass_message_channel (onmessage/addEventListener), window.postMessage,
 *   window.__onTownPassUser callback and CustomEvent('townpass:user').
 * - Debug-friendly and includes test snippets below.
 */

import { useCallback, useRef, useState } from "react";

export type TownPassUser = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  token?: string;
  signature?: string;
  timestamp?: number;
  [k: string]: any;
};

export function useTownPassAuth(opts?: { debug?: boolean; timeout?: number; authEndpoint?: string }) {
  const debug = opts?.debug ?? false;
  const timeoutMs = opts?.timeout ?? 3000;
  const authEndpoint = opts?.authEndpoint ?? "/api/auth/townpass";

  const [user, setUser] = useState<TownPassUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const timerRef = useRef<number | null>(null);
  const listenerRef = useRef<(ev: MessageEvent) => void | null>(null);
  const channelListenerRef = useRef<((ev: MessageEvent) => void) | null>(null);
  const cleanedRef = useRef(false);

  const log = useCallback((...args: any[]) => {
    if (debug) console.debug("[TownPassAuth]", ...args);
  }, [debug]);

  const parseIncoming = (raw: any): TownPassUser | null => {
    if (!raw) return null;

    // If it's a string, try parse
    let payload = raw;
    if (typeof payload === "string") {
      const maybe = tryParse(payload);
      if (maybe !== null) payload = maybe;
    }

    // Known shapes (try in order)
    // { source: 'townpass', type: 'user', payload: {...} }
    if (payload?.source === "townpass" && (payload?.type === "user" || payload?.type === "user_info")) {
      return payload.payload ?? payload.user ?? null;
    }

    // { type: 'townpass:user', user: {...} }
    if (payload?.type === "townpass:user" && payload?.user) return payload.user;

    // { type: 'TOWNPASS_USER', user: {...} }
    if ((payload?.type === "TOWNPASS_USER" || payload?.type === "TOWNPASS_USER_INFO") && payload?.user) return payload.user;

    // { townpass_user: {...} }
    if (payload?.townpass_user) return payload.townpass_user;

    // { user: {...} }
    if (payload?.user && typeof payload.user === "object" && payload.user.id) return payload.user;

    // TownPass specific: { name: 'userinfo', data: JSON.stringify({...}) } or { name:'userinfo', data: {...} }
    if (payload?.name === "userinfo") {
      const d = payload.data;
      if (typeof d === "string") {
        const p = tryParse(d);
        return p ?? null;
      }
      if (typeof d === "object") return d as TownPassUser;
    }

    // CustomEvent detail: { detail: { user: {...} } }
    if (payload?.detail && (payload.detail.user || payload.detail.townpass_user)) {
      return payload.detail.user ?? payload.detail.townpass_user;
    }

    // raw looks like user object (has id)
    if (typeof payload === "object" && payload.id) {
      return payload as TownPassUser;
    }

    return null;
  };

  function tryParse(s: string) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  const cleanup = useCallback(() => {
    log("cleanup listeners");
    cleanedRef.current = true;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // remove message listener
    if (listenerRef.current) {
      window.removeEventListener("message", listenerRef.current);
      listenerRef.current = null;
    }

    // remove townpass_message_channel listener if set
    try {
      const win = window as any;
      if (channelListenerRef.current && win?.townpass_message_channel) {
        if (typeof win.townpass_message_channel.removeEventListener === "function") {
          win.townpass_message_channel.removeEventListener("message", channelListenerRef.current);
        } else {
          // fallback: unset onmessage handler if we set it earlier (we don't override host-defined ones)
          if (win.townpass_message_channel.onmessage === channelListenerRef.current) {
            win.townpass_message_channel.onmessage = null;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    channelListenerRef.current = null;

    // remove __onTownPassUser if we created it
    try {
      const win = window as any;
      if (win && win.__onTownPassUser && typeof win.__onTownPassUser === "function") {
        try { delete win.__onTownPassUser; } catch (e) { win.__onTownPassUser = undefined; }
      }
    } catch (e) {
      // ignore
    }
  }, [log]);

  const handleIncomingRaw = useCallback((raw: any) => {
    const parsed = parseIncoming(raw);
    if (parsed) {
      log("parsed TownPass user:", parsed);
      setUser(parsed);
      setIsLoading(false);
      setError(null);
      return true;
    }
    return false;
  }, [log]);

  const requestTownPassUser = useCallback(async (timeout = timeoutMs) => {
    log("requestTownPassUser start, timeout:", timeout);
    cleanedRef.current = false;
    setIsLoading(true);
    setError(null);
    setUser(null);

    // cleanup first
    cleanup();

    // register generic window.message listener FIRST
    const genericListener = (ev: MessageEvent) => {
      log("window.message event:", ev.data);
      const ok = handleIncomingRaw(ev.data);
      if (ok) {
        // successful => cleanup timer/listeners
        cleanup();
      }
    };
    listenerRef.current = genericListener;
    window.addEventListener("message", genericListener);

    // register CustomEvent 'townpass:user' listener
    const customListener = (ev: Event) => {
      log("CustomEvent townpass:user:", (ev as CustomEvent).detail);
      const ok = handleIncomingRaw((ev as CustomEvent).detail);
      if (ok) cleanup();
    };
    window.addEventListener("townpass:user", customListener as EventListener);

    // register window.__onTownPassUser callback BEFORE sending request
    const win = window as any;
    win.__onTownPassUser = (payload: any) => {
      log("__onTownPassUser called:", payload);
      const ok = handleIncomingRaw(payload);
      if (ok) cleanup();
    };

    // register flutterObject listener if present (TownPass uses this!)
    try {
      if (win?.flutterObject) {
        log("found flutterObject, attaching listener");
        const flutterHandler = (ev: any) => {
          log("flutterObject message received:", ev);
          // ev.data contains the response string
          let data = ev?.data ?? ev;
          if (typeof data === "string") {
            try {
              data = JSON.parse(data);
            } catch (e) {
              log("flutterObject data parse failed", e);
            }
          }
          log("flutterObject parsed data:", data);

          // Response format: { name: 'userinfo', data: {...} }
          if (data?.name === 'userinfo' && data?.data) {
            log("Received userinfo from flutterObject:", data.data);
            const ok = handleIncomingRaw(data.data);
            if (ok) cleanup();
          }
          // Also support userid format: { name: 'userid', data: 'user_id_value' }
          else if (data?.name === 'userid' && data?.data) {
            const userData = {
              id: data.data,
            };
            log("Converted userid to TownPassUser:", userData);
            const ok = handleIncomingRaw(userData);
            if (ok) cleanup();
          }
        };
        channelListenerRef.current = flutterHandler;
        if (typeof win.flutterObject.addEventListener === "function") {
          win.flutterObject.addEventListener("message", flutterHandler);
        } else {
          win.flutterObject.onmessage = flutterHandler;
        }
      }
    } catch (e) {
      log("error attaching flutterObject listener", e);
    }

    // register townpass_message_channel listener if present (fallback)
    try {
      if (win?.townpass_message_channel) {
        log("found townpass_message_channel, attaching listener");
        const channelHandler = (ev: any) => {
          // some hosts send event object with data property
          const data = ev?.data ?? ev;
          log("townpass_message_channel event:", data);
          let parsed = data;
          if (typeof parsed === "string") parsed = tryParse(parsed) ?? parsed;
          // also support nested message shape { name:'userinfo', data: '...' }
          const ok = handleIncomingRaw(parsed);
          if (ok) cleanup();
        };
        if (typeof win.townpass_message_channel.addEventListener === "function") {
          win.townpass_message_channel.addEventListener("message", channelHandler);
        } else {
          // fallback to onmessage
          win.townpass_message_channel.onmessage = channelHandler;
        }
      }
    } catch (e) {
      log("error attaching townpass_message_channel listener", e);
    }

    // set timeout AFTER listeners are set
    timerRef.current = window.setTimeout(() => {
      log("requestTownPassUser timed out");
      setIsLoading(false);
      setError("TownPass authentication timeout");
      cleanup();
    }, timeout);

    // Now send request through flutterObject (TownPass uses this!)
    try {
      if (win?.flutterObject && typeof win.flutterObject.postMessage === "function") {
        // Request userinfo from TownPass using correct message format
        const message = JSON.stringify({ name: 'userinfo', data: null });
        log("Sending to flutterObject.postMessage:", message);
        win.flutterObject.postMessage(message);
      } else {
        log("flutterObject.postMessage not available");
      }
    } catch (e) {
      log("flutterObject.postMessage error", e);
    }

    // Fallback: Try townpass_message_channel
    try {
      if (win?.townpass_message_channel && typeof win.townpass_message_channel.postMessage === "function") {
        // Request userid from TownPass using correct message format
        const message = JSON.stringify({ name: 'userid', data: null });
        log("Sending to townpass_message_channel.postMessage:", message);
        win.townpass_message_channel.postMessage(message);
      } else {
        log("townpass_message_channel.postMessage not available");
      }
    } catch (e) {
      log("townpass_message_channel.postMessage error", e);
    }

    // Fallback: Try other methods
    try {
      // iOS WKWebView handler
      if (win?.webkit?.messageHandlers?.TownPass) {
        try {
          log("posting to webkit.messageHandlers.TownPass.postMessage");
          win.webkit.messageHandlers.TownPass.postMessage({ action: "getUser" });
        } catch (e) {
          // try string form
          try {
            win.webkit.messageHandlers.TownPass.postMessage("getUser");
          } catch (e2) {
            log("webkit.post fallback failed", e2);
          }
        }
      }
    } catch (e) {
      log("webkit call error", e);
    }

    try {
      // ReactNativeWebView
      if (win?.ReactNativeWebView?.postMessage) {
        log("posting to ReactNativeWebView.postMessage");
        win.ReactNativeWebView.postMessage(JSON.stringify({ type: "getUser" }));
      }
    } catch (e) {
      log("ReactNativeWebView post error", e);
    }

    try {
      // Android style bridge
      if (win?.TownPass && typeof win.TownPass.postMessage === "function") {
        log("posting to TownPass.postMessage");
        win.TownPass.postMessage(JSON.stringify({ type: "getUser" }));
      }
    } catch (e) {
      log("TownPass.postMessage error", e);
    }

    try {
      // generic window.postMessage
      log("posting fallback window.postMessage");
      window.postMessage(JSON.stringify({ source: "web", type: "getUser" }), "*");
    } catch (e) {
      log("window.postMessage error", e);
    }

    // also try calling sync getUser if available (some hosts expose it)
    try {
      if (win?.TownPass && typeof win.TownPass.getUser === "function") {
        log("attempting sync TownPass.getUser()");
        const res = win.TownPass.getUser();
        if (res) {
          log("sync TownPass.getUser returned:", res);
          if (handleIncomingRaw(res)) cleanup();
        }
      }
    } catch (e) {
      log("sync getUser error", e);
    }

    log("requestTownPassUser: requests sent, waiting for host response...");
  }, [cleanup, handleIncomingRaw, log, timeoutMs]);

  const loginWithTownPass = useCallback(async (u: TownPassUser) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ townpass_user: u })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Backend auth failed ${res.status} ${txt}`);
      }
      const data = await res.json();
      setIsAuthenticated(true);
      setIsLoading(false);
      log("backend login success", data);
      return data;
    } catch (e: any) {
      setIsAuthenticated(false);
      setIsLoading(false);
      setError(e?.message ?? "Login failed");
      log("loginWithTownPass error", e);
      throw e;
    }
  }, [authEndpoint, log]);

  const reset = useCallback(() => {
    cleanup();
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    setError(null);
  }, [cleanup]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    requestTownPassUser,
    loginWithTownPass,
    reset
  };
}