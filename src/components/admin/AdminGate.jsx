import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, AlertTriangle, Loader2, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Inactivity timeout in milliseconds (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; 
const SESSION_KEY = 'admin_auth_session';

export default function AdminGate({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [keyInput, setKeyInput] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [attempts, setAttempts] = useState(0);

    // Check session validity
    const checkSession = useCallback(() => {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (!session) {
            setIsAuthorized(false);
            setIsLoading(false);
            return;
        }

        try {
            const { timestamp } = JSON.parse(session);
            const now = Date.now();
            
            if (now - timestamp > INACTIVITY_TIMEOUT) {
                handleLogout("Session expired due to inactivity");
            } else {
                // Update timestamp on activity
                updateActivity();
                setIsAuthorized(true);
            }
        } catch (e) {
            handleLogout();
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        checkSession();
        
        // Setup activity listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const resetTimer = () => updateActivity();
        
        events.forEach(e => document.addEventListener(e, resetTimer));
        
        // Periodic check for expiry
        const interval = setInterval(checkSession, 60000); // Check every minute

        return () => {
            events.forEach(e => document.removeEventListener(e, resetTimer));
            clearInterval(interval);
        };
    }, [checkSession]);

    const updateActivity = () => {
        if (sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
        }
    };

    const handleLogout = (reason = null) => {
        sessionStorage.removeItem(SESSION_KEY);
        setIsAuthorized(false);
        if (reason) {
            toast.warning(reason);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!keyInput.trim()) return;

        setIsVerifying(true);
        try {
            const response = await base44.functions.invoke('adminAuth', {
                action: 'verify',
                key: keyInput
            });

            if (response.data.success) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
                setIsAuthorized(true);
                toast.success("Access Granted");
                setAttempts(0);
            } else {
                throw new Error('Invalid Key');
            }
        } catch (error) {
            setAttempts(prev => prev + 1);
            toast.error("Invalid Key. Access Denied.");
            setKeyInput("");
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-cyan-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 blur-[100px] rounded-full animate-pulse" />
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <Card className="bg-gray-900/90 backdrop-blur-xl border-red-500/30 shadow-2xl shadow-red-900/20">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                <Shield className="w-8 h-8 text-red-500" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-white tracking-wider">
                                RESTRICTED AREA
                            </CardTitle>
                            <CardDescription className="text-red-400/80 font-mono text-xs mt-2">
                                SECURE AUTHORIZATION REQUIRED
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleVerify} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                        <Input
                                            type="password"
                                            placeholder="Enter Master Key"
                                            value={keyInput}
                                            onChange={(e) => setKeyInput(e.target.value)}
                                            className="bg-black/50 border-red-500/20 text-white pl-10 h-12 focus:border-red-500/50 focus:ring-red-500/20 transition-all font-mono text-center tracking-[0.5em]"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 tracking-wide shadow-lg shadow-red-900/50 transition-all duration-300"
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            AUTHORIZE ACCESS
                                        </div>
                                    )}
                                </Button>

                                {attempts > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-center gap-2 text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-900/50"
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        Failed attempts logged: {attempts}
                                    </motion.div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                <div className="absolute bottom-8 text-gray-600 text-xs font-mono text-center">
                    <p>SESSION ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                    <p>UNAUTHORIZED ACCESS IS PROHIBITED AND LOGGED</p>
                </div>
            </div>
        );
    }

    return children;
}