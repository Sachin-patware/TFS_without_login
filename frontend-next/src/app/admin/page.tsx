"use client"
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Database, Loader2, AlertCircle, Edit, Trash2, ChevronLeft, ChevronRight, Search, X, Save, ArrowUpDown, ArrowUp, ArrowDown, Copy, RefreshCw, Key, Link, BarChart3, TableProperties, Plus, Shield, User, BookText, Briefcase, Calendar, School, Hash, GraduationCap, ClipboardEdit } from 'lucide-react';
import API_BASE_URL from '@/config';
import { apiFetch } from '@/lib/api';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import PerformanceReport from './components/PerformanceReport';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";

interface Table {
    table_name: string;
    model_name: string;
    row_count: number;
}

interface TableData {
    model_name: string;
    table_name: string;
    pk_field: string;
    fields: string[];
    field_meta?: Record<string, { type: string; required: boolean; is_auto?: boolean; choices?: { value: any; label: string }[] }>;
    data: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

const formatLabel = (label: string) => {
    return label
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
        .replace(/\s+/g, ' ');
};

const getFieldIcon = (field: string) => {
    const f = field.toLowerCase();
    if (f.includes('teacher') || f.includes('faculty')) return <User size={16} className="text-indigo-500" />;
    if (f.includes('subject') || f.includes('code')) return <BookText size={16} className="text-violet-500" />;
    if (f.includes('branch')) return <Briefcase size={16} className="text-blue-500" />;
    if (f.includes('year')) return <Calendar size={16} className="text-amber-500" />;
    if (f.includes('semester')) return <School size={16} className="text-emerald-500" />;
    if (f.includes('section')) return <Hash size={16} className="text-rose-500" />;
    if (f.includes('name')) return <GraduationCap size={16} className="text-cyan-500" />;
    return <ClipboardEdit size={16} className="text-slate-400" />;
};

const renderInput = (
    field: string,
    value: any,
    onChange: (val: any) => void,
    isPk: boolean,
    tableData: TableData | null,
    allData: any = {}
) => {
    if (!tableData) return null;

    const meta = tableData.field_meta?.[field] || { type: 'text', required: false, is_auto: false, choices: [] };

    // Smart Year/Semester Filtering
    let choices = meta.choices || [];
    if (field.toLowerCase().includes('semester')) {
        const yearField = tableData.fields.find(f => f.toLowerCase().includes('year'));
        if (yearField) {
            const currentYear = Number(allData[yearField]);
            if (currentYear) {
                const startSem = (currentYear - 1) * 2 + 1;
                const endSem = currentYear * 2;
                choices = (meta.choices || []).filter(c => {
                    const v = Number(c.value);
                    return v >= startSem && v <= endSem;
                });
            }
        }
    }

    if (meta.type === 'select' && choices.length > 0) {
        return (
            <Select
                value={String(value ?? '')}
                onValueChange={(val) => {
                    const choice = meta.choices?.find(c => String(c.value) === val);
                    onChange(choice ? choice.value : val);
                }}
            >
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-colors group-focus-within:text-indigo-600">
                        {getFieldIcon(field)}
                    </div>
                    <SelectTrigger className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm shadow-sm hover:border-slate-300 h-auto">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                </div>
                <SelectContent>
                    {choices.map((c: any) => (
                        <SelectItem
                            key={String(c.value)}
                            value={String(c.value)}
                            className="font-medium text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer"
                        >
                            {c.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (meta.type === 'boolean') {
        const boolChoices = [
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' }
        ];
        return (
            <Select
                value={value === true ? 'true' : value === false ? 'false' : ''}
                onValueChange={(val) => onChange(val === 'true')}
            >
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-colors group-focus-within:text-indigo-600">
                        <Shield size={16} className="text-emerald-500" />
                    </div>
                    <SelectTrigger className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm shadow-sm hover:border-slate-300 h-auto">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                </div>
                <SelectContent>
                    {boolChoices.map((c) => (
                        <SelectItem
                            key={c.value}
                            value={c.value}
                            className="font-medium text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer"
                        >
                            {c.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-indigo-600">
                {getFieldIcon(field)}
            </div>
            <input
                type={meta.type === 'number' ? 'number' : meta.type === 'date' ? 'date' : 'text'}
                value={value ?? ''}
                onChange={(e) => {
                    const val = e.target.value;
                    onChange(meta.type === 'number' ? (val === '' ? '' : Number(val)) : val);
                }}
                disabled={isPk && (meta.is_auto ?? false)}
                placeholder={isPk && (meta.is_auto ?? false) ? '(Auto)' : meta.type === 'date' ? "YYYY-MM-DD" : `Enter ${formatLabel(field)}...`}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all font-semibold text-sm placeholder:text-slate-400 placeholder:font-medium shadow-sm hover:border-slate-300"
            />
        </div>
    );
};

export default function AdminDashboard() {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [sortBy, setSortBy] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [isPaginated, setIsPaginated] = useState(true);

    // Horizontal scroll shadow indicators
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [scrollShadow, setScrollShadow] = useState({ left: false, right: false });

    const updateScrollShadow = useCallback(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setScrollShadow({
            left: scrollLeft > 5,
            right: scrollLeft + clientWidth < scrollWidth - 5,
        });
    }, []);

    useEffect(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        updateScrollShadow();
        el.addEventListener('scroll', updateScrollShadow, { passive: true });
        const ro = new ResizeObserver(updateScrollShadow);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', updateScrollShadow);
            ro.disconnect();
        };
    }, [updateScrollShadow, tableData]);

    const READ_ONLY_TABLES = ['feedback_response', 'feedback_submissionlog'];

    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newRowData, setNewRowData] = useState<any>({});
    const [filterTables, setFilterTables] = useState('');
    const [activeTab, setActiveTab] = useState<'access' | 'tables' | 'reports'>('tables');

    // Access Token & Link Generator State
    const [studentToken, setStudentToken] = useState('AITR0827');
    const [isUpdatingToken, setIsUpdatingToken] = useState(false);

    // Advanced Link Gen
    const [genBranch, setGenBranch] = useState('');
    const [genYear, setGenYear] = useState('');
    const [genSem, setGenSem] = useState('');
    const [genSection, setGenSection] = useState('');

    const YEAR_SEMESTER_MAP: Record<string, number[]> = {
        '1': [1, 2],
        '2': [3, 4],
        '3': [5, 6],
        '4': [7, 8]
    };

    const handleGenYearChange = (val: string) => {
        setGenYear(val);
        const validSems = YEAR_SEMESTER_MAP[val] || [];
        if (!validSems.includes(parseInt(genSem))) {
            setGenSem('');
        }
    };

    const handleGenSemChange = (val: string) => {
        setGenSem(val);
        const sem = parseInt(val);
        if ([1, 2].includes(sem)) setGenYear('1');
        else if ([3, 4].includes(sem)) setGenYear('2');
        else if ([5, 6].includes(sem)) setGenYear('3');
        else if ([7, 8].includes(sem)) setGenYear('4');
    };

    const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
        msg: '',
        type: 'info',
        visible: false,
    });

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type, visible: true });
    };

    useEffect(() => {
        fetchTables();
        fetchAccessToken();
    }, []);

    const fetchAccessToken = async () => {
        try {
            const res = await apiFetch('/dashboard-admin/access-token/');
            const data = await res.json();
            if (data.status === 'ok') {
                setStudentToken(data.token);
            }
        } catch (error) {
            console.error("Failed to fetch access token:", error);
        }
    };

    const updateAccessToken = async (newToken?: string) => {
        const tokenToSet = newToken || studentToken;
        if (!tokenToSet) return;

        setIsUpdatingToken(true);
        try {
            const res = await apiFetch('/dashboard-admin/access-token/update/', {
                method: 'POST',
                body: JSON.stringify({ token: tokenToSet })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                setStudentToken(data.token);
                showToast("Access token updated successfully", "success");
            } else {
                showToast(data.error || "Failed to update token", "error");
            }
        } catch (error) {
            showToast("Server error updating token", "error");
        } finally {
            setIsUpdatingToken(false);
        }
    };

    const generateRandomToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randomStr = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        setStudentToken(randomStr);
        updateAccessToken(randomStr);
    };

    const copyStudentLink = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${baseUrl}/?token=${studentToken}`;
        navigator.clipboard.writeText(link);
        showToast("Student login link copied!", "info");
    };

    const copyAdvancedLink = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        let link = `${baseUrl}/?token=${studentToken}`;
        if (genBranch) link += `&branch=${genBranch}`;
        if (genYear) link += `&year=${genYear}`;
        if (genSem) link += `&semester=${genSem}`;
        if (genSection) link += `&section=${genSection}`;

        navigator.clipboard.writeText(link);
        showToast("Advanced class link copied!", "info");
    };

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedTable) {
                fetchTableData(1); // Reset to page 1 on search
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (selectedTable) {
            fetchTableData(currentPage);
        }
    }, [selectedTable, currentPage, pageSize, sortBy, sortOrder, isPaginated]);

    const fetchTables = async () => {
        try {
            const res = await apiFetch('/dashboard-admin/tables/');
            const data = await res.json();
            if (data.status === 'ok') {
                setTables(data.tables);
            } else {
                showToast('Failed to load tables', 'error');
            }
        } catch (error) {
            showToast('Error connecting to server', 'error');
        }
    };

    const fetchTableData = async (page: number) => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/dashboard-admin/table/${selectedTable}/?`;

            if (isPaginated) {
                url += `page=${page}&page_size=${pageSize}`;
            } else {
                url += `nopaginate=true`;
            }

            if (sortBy) {
                url += `&sort_by=${sortBy}&order=${sortOrder}`;
            }

            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }

            const res = await apiFetch(url.replace(API_BASE_URL || '', ''));
            const data = await res.json();
            if (data.status === 'ok') {
                setTableData(data);
                setCurrentPage(data.page); // Update current page from server response
            } else {
                showToast(data.error || 'Failed to load table data', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error loading table data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleEdit = (row: any) => {
        setEditingRow({ ...row });
    };

    const handleAddRow = async () => {
        if (!tableData) return;

        try {
            const res = await apiFetch(`/dashboard-admin/table/${selectedTable}/add/`, {
                method: 'POST',
                body: JSON.stringify(newRowData),
            });
            const data = await res.json();
            if (data.status === 'ok') {
                showToast('Record added successfully', 'success');
                setAddModalOpen(false);
                setNewRowData({});
                fetchTableData(currentPage);
            } else {
                showToast(data.error || 'Failed to add record', 'error');
            }
        } catch (error) {
            showToast('Error adding record', 'error');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingRow || !tableData) return;

        try {
            const pkValue = editingRow[tableData.pk_field];
            const res = await apiFetch(`/dashboard-admin/table/${selectedTable}/${pkValue}/update/`, {
                method: 'POST',
                body: JSON.stringify(editingRow),
            });
            const data = await res.json();
            if (data.status === 'ok') {
                showToast('Row updated successfully', 'success');
                setEditingRow(null);
                fetchTableData(currentPage);
            } else {
                showToast(data.error || 'Failed to update row', 'error');
            }
        } catch (error) {
            showToast('Error updating row', 'error');
        }
    };

    const handleDelete = async (row: any) => {
        if (!tableData) return;

        try {
            const pkValue = row[tableData.pk_field];
            const res = await apiFetch(`/dashboard-admin/table/${selectedTable}/${pkValue}/delete/`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.status === 'ok') {
                showToast('Row deleted successfully', 'success');
                setDeleteConfirm(null);
                fetchTableData(currentPage);
            } else {
                showToast(data.error || 'Failed to delete row', 'error');
            }
        } catch (error) {
            showToast('Error deleting row', 'error');
        }
    };

    const filteredTableList = tables.filter(t =>
        t.model_name.toLowerCase().includes(filterTables.toLowerCase()) ||
        t.table_name.toLowerCase().includes(filterTables.toLowerCase())
    );

    return (
        <div className="min-h-screen text-slate-900 font-sans">
            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Top Navigation / Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Admin <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Console</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {activeTab === 'access' ? 'Manage tokens and generate student links' : activeTab === 'tables' ? 'Manage system database and records' : 'Analyze faculty performance and ratings'}
                    </p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('access')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                            activeTab === 'access' ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200/60" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                    >
                        <Shield size={18} />
                        Access Control
                    </button>
                    <button
                        onClick={() => setActiveTab('tables')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                            activeTab === 'tables' ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200/60" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                    >
                        <TableProperties size={18} />
                        Tables
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                            activeTab === 'reports' ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200/60" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                    >
                        <BarChart3 size={18} />
                        Analytics
                    </button>
                </div>
            </div>

            {/* ── Access Control Tab ── */}
            {activeTab === 'access' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Student Access Token Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50/50 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                                <Key size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Student Access Token</h2>
                                <p className="text-xs text-slate-500">Manage the token students use to log in</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Token</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={studentToken}
                                            onChange={(e) => setStudentToken(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        />
                                        {isUpdatingToken && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                                    </div>
                                    <button
                                        onClick={generateRandomToken}
                                        className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm hover:shadow-md"
                                        title="Generate Random"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => updateAccessToken()}
                                disabled={isUpdatingToken}
                                className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isUpdatingToken ? 'Saving...' : 'Save Token'}
                            </button>
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Copy — Basic Link</label>
                                <button
                                    onClick={copyStudentLink}
                                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-50 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200 hover:border-slate-300"
                                >
                                    <Copy size={16} />
                                    Copy Student Login Link
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Link Builder Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 flex items-center gap-3">
                            <div className="p-2 bg-violet-100 rounded-xl">
                                <Link size={18} className="text-violet-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Advanced Link Builder</h2>
                                <p className="text-xs text-slate-500">Generate pre-filled student login links</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-black text-slate-400 ml-1 uppercase">Branch</span>
                                    <Select value={genBranch} onValueChange={setGenBranch}>
                                        <SelectTrigger className="h-11 text-sm font-bold bg-slate-50 border-slate-200 text-slate-600 rounded-xl">
                                            <SelectValue placeholder="Branch" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                                            <SelectItem value="CS">CS</SelectItem>
                                            <SelectItem value="IT">IT</SelectItem>
                                            <SelectItem value="DS">DS</SelectItem>
                                            <SelectItem value="AIML">AIML</SelectItem>
                                            <SelectItem value="CY">CY</SelectItem>
                                            <SelectItem value="CSIT">CSIT</SelectItem>
                                            <SelectItem value="EC">EC</SelectItem>
                                            <SelectItem value="CIVIL">CIVIL</SelectItem>
                                            <SelectItem value="MECHANICAL">MECHANICAL</SelectItem>

                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-black text-slate-400 ml-1 uppercase">Year</span>
                                    <Select value={genYear} onValueChange={handleGenYearChange}>
                                        <SelectTrigger className="h-11 text-sm font-bold bg-slate-50 border-slate-200 text-slate-600 rounded-xl">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                                            <SelectItem value="1">1st Year</SelectItem>
                                            <SelectItem value="2">2nd Year</SelectItem>
                                            <SelectItem value="3">3rd Year</SelectItem>
                                            <SelectItem value="4">4th Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-black text-slate-400 ml-1 uppercase">Semester</span>
                                    <Select value={genSem} onValueChange={handleGenSemChange}>
                                        <SelectTrigger className="h-11 text-sm font-bold bg-slate-50 border-slate-200 text-slate-600 rounded-xl">
                                            <SelectValue placeholder="Semester" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                                            {(genYear ? YEAR_SEMESTER_MAP[genYear] : [1, 2, 3, 4, 5, 6, 7, 8]).map(s => (
                                                <SelectItem key={s} value={s.toString()}>{s}th Sem</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-black text-slate-400 ml-1 uppercase">Section</span>
                                    <Select value={genSection} onValueChange={setGenSection}>
                                        <SelectTrigger className="h-11 text-sm font-bold bg-slate-50 border-slate-200 text-slate-600 rounded-xl">
                                            <SelectValue placeholder="Section" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <SelectItem key={s} value={s.toString()}>Sec {s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <button
                                onClick={copyAdvancedLink}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200/50 active:scale-[0.98] transition-all group"
                            >
                                <Copy size={18} className="group-hover:scale-110 transition-transform" />
                                Copy Advanced Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === 'reports' && (
                <PerformanceReport />
            )}

            {/* ── Tables Tab ── */}
            {activeTab === 'tables' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar: Table Selection (no more Access Control) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 hover:shadow-md transition-shadow duration-300">
                            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 flex items-center gap-2.5">
                                <div className="p-1.5 bg-slate-200/70 rounded-lg">
                                    <Database size={14} className="text-slate-600" />
                                </div>
                                <h2 className="font-bold text-slate-800 text-sm">Database Tables</h2>
                            </div>
                            <div className="p-3">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="Filter tables..."
                                        value={filterTables}
                                        onChange={(e) => setFilterTables(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {filteredTableList.map((table) => (
                                        <button
                                            key={table.table_name}
                                            onClick={() => {
                                                setSelectedTable(table.table_name);
                                                setCurrentPage(1);
                                                setSortBy('');
                                                setSearchQuery('');
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex justify-between items-center group",
                                                selectedTable === table.table_name
                                                    ? "bg-indigo-50 text-indigo-700 border-l-[3px] border-l-indigo-500 shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-50 border-l-[3px] border-l-transparent"
                                            )}
                                        >
                                            <span className="truncate">{table.model_name}</span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-bold min-w-[28px] text-center",
                                                selectedTable === table.table_name ? "bg-indigo-200 text-indigo-800" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                            )}>
                                                {table.row_count}
                                            </span>
                                        </button>
                                    ))}
                                    {filteredTableList.length === 0 && (
                                        <div className="text-center py-4 text-slate-400 text-sm">No tables found</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Table View */}
                    <div className="lg:col-span-9">
                        {selectedTable ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden">
                                {/* Toolbar */}
                                <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 p-2.5 rounded-xl text-indigo-600 shadow-sm">
                                            <Database size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900">{tableData?.model_name || 'Loading...'}</h2>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span className="font-medium">{tableData?.total || 0} records</span>
                                                {loading && <Loader2 className="h-3 w-3 animate-spin ml-2 text-indigo-500" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {!READ_ONLY_TABLES.some(t => t.toLowerCase() === selectedTable.toLowerCase()) && (
                                            <button
                                                onClick={() => {
                                                    setNewRowData({});
                                                    setAddModalOpen(true);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all active:scale-95 hover:from-indigo-700 hover:to-indigo-800"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Record
                                            </button>
                                        )}
                                        <div className="h-8 w-[1px] bg-slate-300 mx-1 hidden md:block"></div>
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={`Search in ${tableData?.model_name}...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="h-8 w-[1px] bg-slate-300 mx-1 hidden md:block"></div>

                                        <div className="flex bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                                            <button
                                                onClick={() => setIsPaginated(true)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded text-xs font-semibold transition-all",
                                                    isPaginated ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                Paged
                                            </button>
                                            <button
                                                onClick={() => setIsPaginated(false)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded text-xs font-semibold transition-all",
                                                    !isPaginated ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Data */}
                                <div className="flex-1 w-full relative">
                                    {/* Scroll shadow indicators */}
                                    {scrollShadow.left && (
                                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
                                    )}
                                    {scrollShadow.right && (
                                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
                                    )}
                                    <div ref={tableScrollRef} className="overflow-x-auto overflow-y-auto w-full h-full relative">
                                        {loading && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                            </div>
                                        )}

                                        {tableData && tableData.data.length > 0 ? (
                                            <table className="w-full min-w-max text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                                                        <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 w-10 text-center">#</th>
                                                        {tableData.fields.map((field) => (
                                                            <th
                                                                key={field}
                                                                onClick={() => handleSort(field)}
                                                                className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors select-none group whitespace-nowrap"
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    {field.replace(/_/g, ' ')}
                                                                    {sortBy === field ? (
                                                                        sortOrder === 'asc' ? <ArrowUp size={11} className="text-indigo-500" /> : <ArrowDown size={11} className="text-indigo-500" />
                                                                    ) : (
                                                                        <ArrowUpDown size={11} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                        {!READ_ONLY_TABLES.some(t => t.toLowerCase() === selectedTable.toLowerCase()) && (
                                                            <th className="px-4 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.04)] z-20">
                                                                Actions
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableData.data.map((row, idx) => (
                                                        <tr key={idx} className={cn(
                                                            "border-b border-slate-100 hover:bg-indigo-50/50 transition-colors duration-150 group",
                                                            idx % 2 === 1 && "bg-slate-50/40"
                                                        )}>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="text-[11px] font-bold text-slate-300">{(isPaginated ? (currentPage - 1) * pageSize : 0) + idx + 1}</span>
                                                            </td>
                                                            {tableData.fields.map((field) => {
                                                                const meta = tableData.field_meta?.[field];
                                                                const value = row[field];

                                                                let content;
                                                                if (meta?.type === 'boolean') {
                                                                    content = value ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                            Active
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                                            Inactive
                                                                        </span>
                                                                    );
                                                                } else if (field.toLowerCase().includes('id') || field.toLowerCase().includes('code')) {
                                                                    content = <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{String(value ?? '-')}</span>;
                                                                } else {
                                                                    content = <span className="text-slate-600">{String(value ?? '-')}</span>;
                                                                }

                                                                return (
                                                                    <td key={field} className="px-4 py-3 text-sm align-middle max-w-[200px] truncate">
                                                                        {content}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-indigo-50/50 group-even:bg-slate-50/40 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.04)] align-middle z-10 transition-colors duration-150">
                                                                {!READ_ONLY_TABLES.some(t => t.toLowerCase() === selectedTable.toLowerCase()) && (
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button
                                                                            onClick={() => handleEdit(row)}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 transition-all active:scale-95"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit size={12} />
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setDeleteConfirm(row)}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 transition-all active:scale-95"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : !loading && (
                                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                                <Database size={48} className="mb-4 opacity-20" />
                                                <p className="font-medium">No records found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: Pagination */}
                                {isPaginated && tableData && tableData.data.length > 0 && (
                                    <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-slate-500 font-medium">Rows per page:</span>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => {
                                                    setPageSize(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="bg-white border border-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                                            >
                                                {[10, 25, 50, 100].map(size => (
                                                    <option key={size} value={size}>{size}</option>
                                                ))}
                                            </select>
                                            <span className="text-sm text-slate-500 border-l border-slate-300 pl-4 font-medium">
                                                Page <strong className="text-slate-700">{tableData.page}</strong> of <strong className="text-slate-700">{tableData.total_pages}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            {(() => {
                                                const total = tableData.total_pages;
                                                const current = tableData.page;
                                                const pages: (number | string)[] = [];
                                                if (total <= 7) {
                                                    for (let i = 1; i <= total; i++) pages.push(i);
                                                } else {
                                                    pages.push(1);
                                                    if (current > 3) pages.push('...');
                                                    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
                                                    if (current < total - 2) pages.push('...');
                                                    pages.push(total);
                                                }
                                                return pages.map((p, i) => (
                                                    typeof p === 'string' ? (
                                                        <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm">…</span>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            onClick={() => setCurrentPage(p)}
                                                            className={cn(
                                                                "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold transition-all",
                                                                current === p
                                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/60"
                                                                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200"
                                                            )}
                                                        >
                                                            {p}
                                                        </button>
                                                    )
                                                ));
                                            })()}
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(tableData.total_pages, p + 1))}
                                                disabled={currentPage === tableData.total_pages}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border-2 border-slate-200 border-dashed p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                <div className="h-24 w-24 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm animate-pulse">
                                    <Database size={40} className="text-indigo-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Select a Table</h3>
                                <p className="text-slate-500 max-w-sm text-sm">
                                    Choose a database table from the sidebar to view, search, and manage records.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {editingRow && tableData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Edit Record</h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    {tableData.model_name} • {formatLabel(tableData.pk_field)}: <span className="text-indigo-600 font-bold">{editingRow[tableData.pk_field]}</span>
                                </p>
                            </div>
                            <button onClick={() => setEditingRow(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tableData.fields
                                    .filter(field => !tableData.field_meta?.[field]?.is_auto)
                                    .map((field) => (
                                        <div key={field} className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">{formatLabel(field)}</label>
                                            {renderInput(
                                                field,
                                                editingRow[field],
                                                (val) => setEditingRow({ ...editingRow, [field]: val }),
                                                field === tableData.pk_field,
                                                tableData,
                                                editingRow
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setEditingRow(null)}
                                className="px-5 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-200/50 transition-all flex items-center gap-2 active:scale-[0.98]"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Add Record Modal */}
            {addModalOpen && tableData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Add New Record</h3>
                                <p className="text-sm text-slate-500 font-medium">Insert row into {tableData.model_name}</p>
                            </div>
                            <button onClick={() => setAddModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tableData.fields
                                    .filter(field => !tableData.field_meta?.[field]?.is_auto)
                                    .map((field) => (
                                        <div key={field} className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">{formatLabel(field)}</label>
                                            {renderInput(
                                                field,
                                                newRowData[field],
                                                (val) => setNewRowData({ ...newRowData, [field]: val }),
                                                field === tableData.pk_field,
                                                tableData,
                                                newRowData
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setAddModalOpen(false)}
                                className="px-5 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddRow}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-200/50 transition-all flex items-center gap-2 active:scale-[0.98]"
                            >
                                <Save size={18} />
                                Save Record
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
                    >
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="text-red-600 h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Record?</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            This action cannot be undone. This will permanently delete the selected record from the database.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}

// Helper Style
const customScrollbarStyle = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;
