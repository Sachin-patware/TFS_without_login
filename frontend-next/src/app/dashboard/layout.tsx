"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    LogOut,
    ChevronDown,
    GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name: string; email: string; enrollment: string } | null>(null);

    useEffect(() => {
        // Check auth
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (!token) {
                router.push('/');
            } else {
                setUser({
                    name: localStorage.getItem('fullName') || 'Student',
                    email: localStorage.getItem('email') || '',
                    enrollment: localStorage.getItem('enrollment') || '',
                });
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
        localStorage.clear();
        router.push('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
        { icon: FileText, label: 'My Feedback', href: '/dashboard/feedback' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo and Brand */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Feedback System
                                </h1>
                                <p className="text-xs text-gray-500 font-medium">IT Department Portal</p>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                                        pathname === item.href
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* User Menu */}
                        <div className="relative user-menu-container">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/20">
                                    {user?.name?.[0] || 'U'}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold text-gray-900 leading-none">{user?.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{user?.enrollment}</p>
                                </div>
                                <ChevronDown className={cn(
                                    "h-4 w-4 text-gray-400 transition-transform hidden sm:block",
                                    isUserMenuOpen && "rotate-180"
                                )} />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in-0 zoom-in-95">
                                    <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-600 border-b border-blue-500">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white/30">
                                                {user?.name?.[0] || 'U'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{user?.name}</p>
                                                <p className="text-xs text-blue-100 mt-0.5">{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                                Enrollment: {user?.enrollment}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mobile Navigation Links */}
                                    <div className="md:hidden p-2 border-b border-gray-100">
                                        {navItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                                    pathname === item.href
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                )}
                                            >
                                                <item.icon size={18} />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>

                                    <div className="p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <LogOut size={18} />
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
