"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Database,
    LogOut,
    Shield,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [admin, setAdmin] = useState<{ username: string } | null>(null);

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

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" /> */}
            </div>

            {/* Top Navbar */}
            <nav className="sticky top-0 z-[100] bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-18 py-3">
                        {/* Logo and Brand */}
                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/admin')}>
                            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-all duration-500 ring-2 ring-white/10 group-hover:ring-white/20">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black tracking-tighter text-slate-100 group-hover:text-white transition-colors">
                                    SYSTEM<span className="text-indigo-400">COMMAND</span>
                                </h1>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-black group-hover:text-slate-400 transition-colors">Operational Portal</p>
                            </div>
                        </div>

                        {/* Admin Menu */}
                        <div className="relative user-menu-container">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 group ring-1 ring-white/5"
                            >
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors shadow-lg shadow-black/20">
                                    <Shield className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-xs font-black text-slate-100 tracking-tight group-hover:text-white transition-colors">{admin?.username}</p>
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Root Authority</p>
                                </div>
                                <ChevronDown className={cn(
                                    "h-3.5 w-3.5 text-slate-500 transition-transform duration-500 group-hover:text-slate-300 hidden sm:block",
                                    isUserMenuOpen && "rotate-180"
                                )} />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-4 w-64 bg-slate-900/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-300">
                                    <div className="p-6 bg-gradient-to-br from-indigo-900/90 to-slate-900/90 border-b border-white/10 relative overflow-hidden group/header">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover/header:bg-indigo-500/20 transition-colors duration-700" />
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center shadow-xl border border-white/20 group-hover/header:rotate-6 transition-transform">
                                                <Shield className="h-6 w-6 text-indigo-300" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-white tracking-tight">{admin?.username}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master User</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                            Account Actions
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-2xl transition-all duration-200 group/item"
                                        >
                                            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                                <LogOut size={16} />
                                            </div>
                                            Sign Out of Console
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
