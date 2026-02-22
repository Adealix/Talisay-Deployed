/**
 * Talisay AI — Auth Context
 * Real authentication with Express backend + JWT + email verification.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true on boot to check token
  const [pendingVerification, setPendingVerification] = useState(null); // { email } awaiting OTP
  const [profileImage, setProfileImageState] = useState(null); // URI of locally stored profile image

  const isAuthenticated = !!user && !!user.isVerified;

  // ─── On mount, try to restore session + profile image ───
  useEffect(() => {
    (async () => {
      try {
        const token = await authService.getToken();
        if (token) {
          const data = await authService.getMe();
          if (data.ok && data.user) {
            setUser(data.user);
            // Load profile image from backend user.avatar
            if (data.user.avatar) {
              setProfileImageState(data.user.avatar);
            }
          } else {
            await authService.setToken(null);
          }
        }
      } catch {
        await authService.setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      if (data.ok) {
        setUser(data.user);
        // Load profile image from user.avatar
        if (data.user.avatar) {
          setProfileImageState(data.user.avatar);
        }
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch (e) {
      // If email not verified, the backend returns 403
      if (e.status === 403 && e.data?.error === 'email_not_verified') {
        setPendingVerification({ email });
        return { ok: false, error: 'email_not_verified' };
      }
      // If account deactivated, return with reason
      if (e.status === 403 && e.data?.error === 'account_deactivated') {
        return { ok: false, error: 'account_deactivated', reason: e.data?.reason };
      }
      return { ok: false, error: e.data?.error || e.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async ({ firstName, lastName, email, password }) => {
    setIsLoading(true);
    try {
      const data = await authService.register({ email, password, firstName, lastName });
      if (data.ok) {
        setPendingVerification({ email });
        return { ok: true, message: 'verify_email' };
      }
      return { ok: false, error: data.error };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    setIsLoading(true);
    try {
      const data = await authService.verifyEmail(email, otp);
      if (data.ok && data.user) {
        setUser(data.user);
        setPendingVerification(null);
        // Load profile image from user.avatar
        if (data.user.avatar) {
          setProfileImageState(data.user.avatar);
        }
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async (email) => {
    try {
      return await authService.resendOtp(email);
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }, []);

  const updateProfile = useCallback(async (fields) => {
    try {
      const data = await authService.updateProfile(fields);
      if (data.ok && data.user) {
        setUser(data.user);
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }, []);

  const requestPasswordOtp = useCallback(async () => {
    try {
      return await authService.requestPasswordOtp();
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }, []);

  const changePassword = useCallback(async (otp, newPassword) => {
    try {
      return await authService.changePassword(otp, newPassword);
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }, []);

  const getUserStats = useCallback(async () => {
    try {
      return await authService.getUserStats();
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message };
    }
  }, []);

  const setProfileImage = useCallback(async (imageUri) => {
    try {
      if (imageUri) {
        // Upload to Cloudinary via API
        const data = await authService.uploadAvatar(imageUri);
        if (data.ok && data.avatar) {
          setProfileImageState(data.avatar);
          // Update user state with new avatar
          if (data.user) {
            setUser(data.user);
          }
          return { ok: true, avatar: data.avatar };
        }
        return { ok: false, error: data.error || 'Upload failed' };
      } else {
        // Clear avatar (optional: implement delete endpoint)
        setProfileImageState(null);
        return { ok: true };
      }
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await authService.logoutUser();
    setUser(null);
    setPendingVerification(null);
    setIsLoading(false);
    // Don't clear profile image on logout - keep it for next login
  }, []);

  const clearPendingVerification = useCallback(() => {
    setPendingVerification(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    pendingVerification,
    profileImage,
    setProfileImage,
    login,
    register,
    verifyEmail,
    resendOtp,
    updateProfile,
    requestPasswordOtp,
    changePassword,
    getUserStats,
    logout,
    clearPendingVerification,
  }), [user, isAuthenticated, isLoading, pendingVerification, profileImage, setProfileImage, login, register, verifyEmail, resendOtp, updateProfile, requestPasswordOtp, changePassword, getUserStats, logout, clearPendingVerification]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
