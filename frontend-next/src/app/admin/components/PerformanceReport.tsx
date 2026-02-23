"use client"
import React, { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { apiFetch } from '@/lib/api';
import {
    TrendingUp, Users, Award, AlertCircle,
    Search, Download, Filter, RefreshCw, X, ChevronRight,
    Star, MessageSquare, BookOpen, Clock, Target, FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherStat {
    teacher_id: string;
    full_name: string;
    average_rating: number;
    response_count: number;
    category: string;
    question_stats: {
        q1: number; q2: number; q3: number; q4: number; q5: number;
        q6: number; q7: number; q8: number; q9: number; q10: number;
    };
}

const QUESTION_LABELS: Record<string, string> = {
    q1: "Content Clarity",
    q2: "Teaching Style",
    q3: "Interaction",
    q4: "Punctuality",
    q5: "Assessment",
    q6: "Support",
    q7: "Resources",
    q8: "Atmosphere",
    q9: "Innovation",
    q10: "Inspiration"
};

interface Summary {
    excellent: number;
    good: number;
    needs_improvement: number;
    total_teachers: number;
}

const COLORS = {
    Excellent: '#10b981', // green-500
    Good: '#3b82f6',      // blue-500
    'Need Improvement': '#ef4444' // red-500
};

export default function PerformanceReport() {
    const [data, setData] = useState<TeacherStat[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherStat | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/dashboard-admin/reports/teacher-performance/');
            const result = await res.json();
            if (result.status === 'ok') {
                setData(result.data);
                setSummary(result.summary);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(t => {
        const matchesSearch = t.full_name.toLowerCase().includes(search.toLowerCase()) ||
            t.teacher_id.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
        return matchesSearch && matchesCategory;
    });

    const pieData = summary ? [
        { name: 'Excellent', value: summary.excellent },
        { name: 'Good', value: summary.good },
        { name: 'Need Improvement', value: summary.needs_improvement }
    ].filter(v => v.value > 0) : [];

    const topPerformers = [...data].sort((a, b) => b.average_rating - a.average_rating).slice(0, 5);

    const getRadarData = (teacher: TeacherStat) => {
        return Object.entries(teacher.question_stats).map(([key, value]) => ({
            subject: QUESTION_LABELS[key] || key,
            A: value,
            fullMark: 5,
        }));
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(20);
        doc.setTextColor(67, 56, 202); // indigo-700
        doc.text("Faculty Performance Report", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

        // Final Summary
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Executive Summary", 14, 40);

        autoTable(doc, {
            startY: 45,
            head: [['Total Faculty', 'Excellent', 'Good', 'Need Improvement']],
            body: [[
                summary?.total_teachers || 0,
                summary?.excellent || 0,
                summary?.good || 0,
                summary?.needs_improvement || 0
            ]],
            theme: 'grid',
            headStyles: { fillColor: [67, 56, 202] }
        });

        // Detail Table
        doc.text("Detailed Scorecard", 14, (doc as any).lastAutoTable.finalY + 15);

        const tableBody = filteredData.map(t => [
            t.teacher_id,
            t.full_name,
            t.average_rating.toString(),
            t.response_count.toString(),
            t.category
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['ID', 'Full Name', 'Rating', 'Responses', 'Status']],
            body: tableBody,
            headStyles: { fillColor: [67, 56, 202] },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`Faculty_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 h-5 w-5" />
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Analyzing faculty performance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { id: 'all', label: 'Total Teachers', value: summary?.total_teachers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', category: null },
                    { id: 'Excellent', label: 'Excellent', value: summary?.excellent, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', category: 'Excellent' },
                    { id: 'Good', label: 'Good', value: summary?.good, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', category: 'Good' },
                    { id: 'Need Improvement', label: 'Need Improvement', value: summary?.needs_improvement, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', category: 'Need Improvement' },
                ].map((stat, i) => (
                    <button
                        key={i}
                        onClick={() => setCategoryFilter(stat.category === categoryFilter ? null : stat.category)}
                        className={cn(
                            "bg-white p-6 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left group hover:-translate-y-1 hover:shadow-lg",
                            categoryFilter === stat.category && stat.category !== null
                                ? "ring-2 ring-offset-2 ring-indigo-500 border-indigo-200 shadow-xl shadow-indigo-100/60 scale-[1.02]"
                                : "border-slate-200 shadow-sm hover:border-indigo-200"
                        )}
                    >
                        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
                        </div>
                        {categoryFilter === stat.category && stat.category !== null && (
                            <div className="ml-auto">
                                <Filter size={14} className="text-indigo-500 animate-pulse" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <Award className="text-indigo-600" size={20} />
                        Performance Distribution
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[entry.name as keyof typeof COLORS]}
                                            style={{ cursor: 'pointer', outline: 'none' }}
                                            onClick={() => setCategoryFilter(entry.name === categoryFilter ? null : entry.name)}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    onClick={(e) => setCategoryFilter(e.value === categoryFilter ? null : (e.value ?? null))}
                                    style={{ cursor: 'pointer' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers Bar Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <TrendingUp className="text-indigo-600" size={20} />
                        Top Rated Faculty
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPerformers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 5]} hide />
                                <YAxis
                                    dataKey="full_name"
                                    type="category"
                                    tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="average_rating" radius={[0, 4, 4, 0]}>
                                    {topPerformers.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[entry.category as keyof typeof COLORS] || '#818cf8'}
                                            onClick={() => setSelectedTeacher(entry)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Faculty Scorecard</h3>
                            <p className="text-xs text-slate-500 font-medium">Categorized listing of all evaluated teachers</p>
                        </div>
                        {categoryFilter && (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => setCategoryFilter(null)}
                                className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100 hover:bg-indigo-100 transition-all"
                            >
                                <X size={12} />
                                Category: {categoryFilter}
                            </motion.button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search teacher..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-bold text-sm active:scale-95"
                        >
                            <FileDown size={18} />
                            Export PDF
                        </button>
                        <button
                            onClick={fetchReports}
                            className="p-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Teacher ID</th>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4 text-center">Avg Rating</th>
                                <th className="px-6 py-4 text-center">Responses</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((teacher) => (
                                <tr key={teacher.teacher_id} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{teacher.teacher_id}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-900">{teacher.full_name}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={cn(
                                                "text-lg font-black",
                                                teacher.category === 'Excellent' ? "text-emerald-600" :
                                                    teacher.category === 'Good' ? "text-blue-600" : "text-rose-600"
                                            )}>
                                                {teacher.average_rating}
                                            </span>
                                            <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={cn("h-full",
                                                        teacher.category === 'Excellent' ? "bg-emerald-500" :
                                                            teacher.category === 'Good' ? "bg-blue-500" : "bg-rose-500"
                                                    )}
                                                    style={{ width: `${(teacher.average_rating / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                            {teacher.response_count}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                            teacher.category === 'Excellent' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                teacher.category === 'Good' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full",
                                                teacher.category === 'Excellent' ? "bg-emerald-500" :
                                                    teacher.category === 'Good' ? "bg-blue-500" : "bg-rose-500"
                                            )} />
                                            {teacher.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setSelectedTeacher(teacher)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 hover:gap-2"
                                        >
                                            View Profile
                                            <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="py-12 flex flex-col items-center text-slate-400">
                            <TrendingUp size={48} className="opacity-10 mb-4" />
                            <p className="font-medium text-sm">No analytics data found for this selection.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Teacher Profile Modal */}
            <AnimatePresence>
                {selectedTeacher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTeacher(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border-t-4 border-t-indigo-500"
                        >
                            {/* Left Sidebar: Profile Summary */}
                            <div className="md:w-1/3 bg-gradient-to-b from-slate-50 to-white p-8 border-r border-slate-100">
                                <div className="flex flex-col items-center text-center">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black mb-4 border-4",
                                        selectedTeacher.category === 'Excellent' ? "bg-emerald-100 text-emerald-600 border-emerald-200" :
                                            selectedTeacher.category === 'Good' ? "bg-blue-100 text-blue-600 border-blue-200" :
                                                "bg-rose-100 text-rose-600 border-rose-200"
                                    )}>
                                        {selectedTeacher.full_name.charAt(0)}
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedTeacher.full_name}</h2>
                                    <p className="text-sm font-mono text-slate-500 mb-6">{selectedTeacher.teacher_id}</p>

                                    <div className="w-full space-y-4">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Overall Rating</p>
                                            <div className="flex items-end gap-2">
                                                <span className="text-4xl font-black text-slate-900">{selectedTeacher.average_rating}</span>
                                                <span className="text-slate-400 font-bold mb-1">/ 5.0</span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Feedbacks</p>
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="text-indigo-500" size={20} />
                                                <span className="text-xl font-black text-slate-900">{selectedTeacher.response_count}</span>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "p-4 rounded-2xl border font-black uppercase tracking-widest text-xs text-center",
                                            selectedTeacher.category === 'Excellent' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                selectedTeacher.category === 'Good' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>
                                            {selectedTeacher.category}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Content: Detailed Stats */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Performance Breakdown</h3>
                                        <p className="text-sm text-slate-500">Detailed scores across 10 evaluation parameters</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTeacher(null)}
                                        className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Radar Chart for Parameters */}
                                <div className="h-[400px] w-full mb-8 bg-gradient-to-br from-slate-50/50 to-indigo-50/20 rounded-3xl p-4 border border-slate-100 shadow-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(selectedTeacher)}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis
                                                dataKey="subject"
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <PolarRadiusAxis angle={30} domain={[0, 5]} hide />
                                            <Radar
                                                name={selectedTeacher.full_name}
                                                dataKey="A"
                                                stroke={COLORS[selectedTeacher.category as keyof typeof COLORS]}
                                                fill={COLORS[selectedTeacher.category as keyof typeof COLORS]}
                                                fillOpacity={0.6}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Parameter List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(selectedTeacher.question_stats).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 group/card">
                                            <span className="text-xs font-bold text-slate-600">{QUESTION_LABELS[key]}</span>
                                            <span className={cn(
                                                "text-sm font-black",
                                                value >= 4 ? "text-emerald-600" : value >= 2 ? "text-blue-600" : "text-rose-600"
                                            )}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
