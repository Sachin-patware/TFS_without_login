"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, MessageSquare, Star, Loader2, AlertCircle, History } from 'lucide-react';
import API_BASE_URL from '@/config';
import { apiFetch } from '@/lib/api';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface FeedbackHistory {
    log_id: number;
    timestamp: string;
    teacher_name: string;
    subject_name: string;
    subject_code: string;
    ratings: Record<string, number>;
    comments: string | null;
}

export default function MyFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
        msg: '',
        type: 'info',
        visible: false,
    });

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type, visible: true });
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await apiFetch('/my-feedbacks/');
            const data = await res.json();
            if (data.status === "ok") {
                setFeedbacks(data.feedbacks);
            } else {
                showToast(data.error || "Failed to load history", "error");
            }
        } catch (error) {
            console.error("Fetch history error:", error);
            showToast("Error connecting to server.", "error");
        } finally {
            setLoading(false);
        }
    };

    const getAverageRating = (ratings: Record<string, number>) => {
        const values = Object.values(ratings);
        const sum = values.reduce((a, b) => a + b, 0);
        return (sum / values.length).toFixed(1);
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <p>Loading your feedback history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <History className="text-blue-600" />
                    My Feedback History
                </h2>
                <p className="text-gray-500 text-sm">A record of your constructive contributions to institutional excellence.</p>
            </div>

            {feedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-sm text-center">
                    <AlertCircle className="w-16 h-16 text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">No Feedback Submitted Yet</h3>
                    <p className="text-gray-500 max-w-sm mt-2">
                        Your submissions will appear here once you start providing feedback for your teachers.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {feedbacks.map((fb, idx) => (
                        <motion.div
                            key={fb.log_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-all group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                                            {fb.teacher_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{fb.teacher_name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{fb.subject_name} ({fb.subject_code})</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <Calendar size={14} className="text-blue-500" />
                                            {new Date(fb.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                                            <Star size={14} fill="currentColor" />
                                            {getAverageRating(fb.ratings)} Avg Rating
                                        </div>
                                    </div>

                                    {fb.comments && (
                                        <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-50 italic text-sm text-gray-600 flex gap-3">
                                            <MessageSquare size={16} className="text-blue-400 mt-0.5 shrink-0" />
                                            "{fb.comments}"
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-5 gap-2 md:w-64">
                                    {Object.entries(fb.ratings).map(([q, val]) => (
                                        <div key={q} className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                "w-full h-1.5 rounded-full overflow-hidden bg-gray-100",
                                                val >= 4 ? "bg-green-100" : val >= 3 ? "bg-yellow-100" : "bg-red-100"
                                            )}>
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        val >= 4 ? "bg-green-500" : val >= 3 ? "bg-yellow-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${(val / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{q}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
