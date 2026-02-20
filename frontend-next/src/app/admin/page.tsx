"use client"
import React, { useEffect, useState } from 'react';
import { Database, Loader2, AlertCircle, Edit, Trash2, ChevronLeft, ChevronRight, Search, X, Save, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import API_BASE_URL from '@/config';
import { apiFetch } from '@/lib/api';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

const renderInput = (field: string, value: any, onChange: (val: any) => void, isPk: boolean, tableData: TableData | null) => {
    if (!tableData) return null;

    const meta = tableData.field_meta?.[field] || { type: 'text', required: false, is_auto: false };


    if (meta.type === 'select' && meta.choices) {
        return (
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}

                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all font-medium"
            >
                <option value="">Select...</option>
                {meta.choices.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                ))}
            </select>
        );
    }

    if (meta.type === 'boolean') {
        return (
            <select
                value={value === true ? 'true' : value === false ? 'false' : ''}
                onChange={(e) => onChange(e.target.value === 'true')}

                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all font-medium"
            >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }

    if (meta.type === 'date') {
        return (
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="YYYY-MM-DD"

                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all font-medium placeholder-slate-400"
            />
        );
    }

    return (
        <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isPk && (meta.is_auto ?? false) ? '(Auto)' : `Enter ${field.replace(/_/g, ' ')}...`}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all font-medium placeholder-slate-400"
        />
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

    const READ_ONLY_TABLES = ['feedback_response', 'feedback_submissionlog'];

    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newRowData, setNewRowData] = useState<any>({});
    const [filterTables, setFilterTables] = useState('');

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
    }, []);

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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Console</h1>
                    <p className="text-slate-500 mt-1">Manage system database and records</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-3 border border-slate-200">
                        <Database className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase">Tables</p>
                            <p className="text-lg font-bold text-slate-900 leading-none">{tables.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Sidebar: Table Selection */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-semibold text-slate-700">Database Tables</h2>
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
                                            "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex justify-between items-center group",
                                            selectedTable === table.table_name
                                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>{table.model_name}</span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
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
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[600px]">
                            {/* Toolbar */}
                            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{tableData?.model_name || 'Loading...'}</h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{tableData?.total || 0} records</span>
                                            {loading && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
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
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            <Edit className="h-4 w-4" />
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
                            <div className="flex-1 overflow-x-auto overflow-y-auto w-full relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                    </div>
                                )}

                                {tableData && tableData.data.length > 0 ? (
                                    <table className="w-full min-w-max text-left border-collapse">
                                        <thead>
                                            <tr className="bg-indigo-600 text-white sticky top-0 z-10 shadow-md">
                                                {tableData.fields.map((field) => (
                                                    <th
                                                        key={field}
                                                        onClick={() => handleSort(field)}
                                                        className="px-3 py-2 text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-indigo-700 transition-colors select-none group border-r border-indigo-700 first:rounded-tl-lg"
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {field.replace(/_/g, ' ')}
                                                            {sortBy === field ? (
                                                                sortOrder === 'asc' ? <ArrowUp size={12} className="text-indigo-200" /> : <ArrowDown size={12} className="text-indigo-200" />
                                                            ) : (
                                                                <ArrowUpDown size={12} className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                                {!READ_ONLY_TABLES.some(t => t.toLowerCase() === selectedTable.toLowerCase()) && (
                                                    <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide sticky right-0 bg-indigo-600 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.2)] z-20 last:rounded-tr-lg">
                                                        Actions
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {tableData.data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-indigo-50/50 even:bg-slate-50/50 transition-colors">
                                                    {tableData.fields.map((field) => {
                                                        const meta = tableData.field_meta?.[field];
                                                        const value = row[field];

                                                        let content;
                                                        if (meta?.type === 'boolean') {
                                                            content = value ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                                    Inactive
                                                                </span>
                                                            );
                                                        } else {
                                                            content = String(value ?? '-');
                                                        }

                                                        return (
                                                            <td key={field} className="px-3 py-2 text-sm text-slate-700 align-middle border-r border-slate-200">
                                                                {content}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2 text-right sticky right-0 group-even:bg-slate-50/50 bg-white group-hover:bg-indigo-50/50 border-l border-slate-200 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] align-middle z-10">
                                                        {!READ_ONLY_TABLES.some(t => t.toLowerCase() === selectedTable.toLowerCase()) && (
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleEdit(row)}
                                                                    className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 transition-all"
                                                                    title="Edit"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteConfirm(row)}
                                                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-100 transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} />
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
                                        <p>No records found</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer: Pagination */}
                            {isPaginated && tableData && tableData.data.length > 0 && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-slate-500">Rows per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-white border border-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                        >
                                            {[10, 25, 50, 100].map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                        <span className="text-sm text-slate-500 border-l border-slate-300 pl-4">
                                            Page <strong>{tableData.page}</strong> of <strong>{tableData.total_pages}</strong>
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(tableData.total_pages, p + 1))}
                                            disabled={currentPage === tableData.total_pages}
                                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Database size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Table</h3>
                            <p className="text-slate-500 max-w-sm">
                                Choose a database table from the sidebar to view, search, and manage records.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {editingRow && tableData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Edit Record</h3>
                                <p className="text-sm text-slate-500">{tableData.model_name} • {tableData.pk_field}: {editingRow[tableData.pk_field]}</p>
                            </div>
                            <button onClick={() => setEditingRow(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tableData.fields.map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2 capitalize">{field.replace(/_/g, ' ')}</label>
                                        {renderInput(
                                            field,
                                            editingRow[field],
                                            (val) => setEditingRow({ ...editingRow, [field]: val }),
                                            field === tableData.pk_field,
                                            tableData
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
                                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Add New Record</h3>
                                <p className="text-sm text-slate-500">Insert row into {tableData.model_name}</p>
                            </div>
                            <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tableData.fields.map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2 capitalize">{field.replace(/_/g, ' ')}</label>
                                        {renderInput(
                                            field,
                                            newRowData[field],
                                            (val) => setNewRowData({ ...newRowData, [field]: val }),
                                            field === tableData.pk_field,
                                            tableData
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
                                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                Save Record
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
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
