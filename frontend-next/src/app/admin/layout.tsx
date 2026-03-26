"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Database,
    LogOut,
    Shield,
    ChevronDown,
    Key,
    Lock,
    ShieldCheck,
    Eye,
    EyeOff,
    Loader2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { Toast, ToastType } from '@/components/ui/Toast';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [admin, setAdmin] = useState<{ username: string } | null>(null);

    // Password change states
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
        msg: '',
        type: 'info',
        visible: false,
    });

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type, visible: true });
    };

    useEffect(() => {
        // Check admin auth
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            const isAdmin = localStorage.getItem('is_admin');
            const username = localStorage.getItem('admin_username');

            if (!token || isAdmin !== 'true') {
                router.push('/');
            } else {
                setAdmin({ username: username || 'Admin' });
            }
        }
    }, [router]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.user-menu-container')) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    const handleLogout = () => {
        // Selective removal to preserve persistent_stu_id
        const itemsToRemove = [
            'access_token', 'enrollment', 'fullName', 'branch',
            'year', 'semester', 'section', 'admin_username', 'is_admin'
        ];
        itemsToRemove.forEach(item => localStorage.removeItem(item));
        router.push('/');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            showToast("Passwords do not match", "error");
            return;
        }
        if (passwordData.new.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await apiFetch('/dashboard-admin/change-password/', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: passwordData.old,
                    password: passwordData.new
                })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                showToast("Password updated successfully", "success");
                setTimeout(() => setChangePasswordModalOpen(false), 1500);
                setPasswordData({ old: '', new: '', confirm: '' });
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (error) {
            showToast("Server error updating password", "error");
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/[0.04] rounded-full blur-[100px]" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-violet-500/[0.04] rounded-full blur-[100px]" />
                <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-blue-500/[0.03] rounded-full blur-[120px]" />
            </div>

            {/* Top Navbar */}
            <nav className="sticky top-0 z-[100] bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo and Brand */}
                        <div className="flex items-center group cursor-pointer" onClick={() => router.push('/admin')}>
                            <img src="/images/AITR-logo.jpg" alt="AITR Logo" className="h-[46px] w-auto object-contain" />
                        </div>

                        {/* Admin Menu */}
                        <div className="relative user-menu-container">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-200 group"
                            >
                                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold text-slate-700 tracking-tight group-hover:text-slate-900 transition-colors">{admin?.username}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Root Authority</p>
                                </div>
                                <ChevronDown className={cn(
                                    "h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:text-slate-600 hidden sm:block",
                                    isUserMenuOpen && "rotate-180"
                                )} />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200">
                                    <div className="p-5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-slate-900 tracking-tight">{admin?.username}</p>
                                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">College Admin</p>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-white">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                            Account Actions
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                setChangePasswordModalOpen(true);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-200 mb-1"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Key size={16} />
                                            </div>
                                            Change Password
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
                                                <LogOut size={16} />
                                            </div>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 py-6 relative z-10">
                {children}
            </main>

            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Change Password Modal */}
            <AnimatePresence>
                {changePasswordModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 max-w-[380px] w-full overflow-hidden border border-slate-200"
                        >
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-indigo-600">
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-slate-900">Change Password</h3>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">create strong password</p>
                                    </div>
                                </div>
                                <button onClick={() => setChangePasswordModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleChangePassword} className="p-6 space-y-5 bg-white">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Current Password</label>
                                        <div className="relative group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={passwordData.old}
                                                onChange={(e) => setPasswordData({ ...passwordData, old: e.target.value })}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-900 text-sm placeholder:text-slate-400"
                                                placeholder="••••••••••"
                                            />
                                            <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">New Password</label>
                                        <div className="relative group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={passwordData.new}
                                                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-900 text-sm placeholder:text-slate-400"
                                                placeholder="••••••••••"
                                            />
                                            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Confirm Identity</label>
                                        <div className="relative group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={passwordData.confirm}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-900 text-sm placeholder:text-slate-400"
                                                placeholder="••••••••••"
                                            />
                                            <ShieldCheck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isChangingPassword ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <Shield className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                
        
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 4s linear infinite;
                }
            `}</style>
        </div>
    );
}
