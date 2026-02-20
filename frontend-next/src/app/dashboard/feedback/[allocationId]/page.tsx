"use client"
import React, { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import API_BASE_URL from '@/config';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const QUESTION_LABELS = [
    { key: 'q1', label: 'Subject Knowledge' },
    { key: 'q6', label: 'Communication' },
    { key: 'q2', label: 'Punctuality' },
    { key: 'q7', label: 'Mentoring' },
    { key: 'q3', label: 'Syllabus Coverage' },
    { key: 'q8', label: 'Class Control' },
    { key: 'q4', label: 'Doubt Clearing' },
    { key: 'q9', label: 'Teaching Aids' },
    { key: 'q5', label: 'Interaction' },
    { key: 'q10', label: 'Overall Rating' },
];

export default function FeedbackPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    // Get params
    const allocationId = params.allocationId as string;
    const teacherName = searchParams.get('teacherName') || 'Teacher';
    const subjectCode = searchParams.get('subjectCode') || 'Subject';

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
        msg: '',
        type: 'info',
        visible: false,
    });

    const [feedback, setFeedback] = useState<Record<string, number | string>>({
        q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
        q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
        comments: ''
    });

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type, visible: true });
    };

    const handleRatingChange = (qKey: string, rating: number) => {
        setFeedback(prev => ({
            ...prev,
            [qKey]: rating
        }));
    };

    const getProgress = () => {
        return Object.keys(feedback).filter(key => key.startsWith('q') && (feedback[key] as number) > 0).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const allRated = getProgress() === 10;
        if (!allRated) {
            showToast("Please rate all categories before submitting.", "error");
            return;
        }

        setLoading(true);

        const feedbackData = {
            subject_code: subjectCode,
            allocation_id: parseInt(allocationId),
            ...feedback
        };

        try {
            const res = await apiFetch('/submit-feedback/', {
                method: "POST",
                body: JSON.stringify(feedbackData)
            });

            const data = await res.json();

            if (data.status === "ok") {
                showToast("Feedback submitted successfully!", "success");
                setTimeout(() => router.push('/dashboard'), 1500);
            } else {
                if (data.error === "feedback already submitted") {
                    showToast("You have already submitted feedback for this teacher.", "error");
                } else {
                    showToast(data.error || "Submission failed.", "error");
                }
            }
        } catch (error) {
            console.error("Submit error:", error);
            showToast("Error connecting to server.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 bg-[#F8F9FF] relative">
            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
                {/* Header Navigation */}
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.back()}
                        className="p-4 bg-white hover:bg-gray-50 rounded-2xl transition-all text-gray-500 border border-gray-100 shadow-sm flex items-center justify-center"
                    >
                        <ArrowLeft size={20} />
                    </motion.button>
                    <div>
                        <h1 className="text-3xl font-black text-[#1e1b4b] tracking-tight">Teacher Evaluation</h1>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Detailed Analysis • Academic Context</p>
                    </div>
                </div>

                {/* Main Card */}
                <form onSubmit={handleSubmit} className="bg-white rounded-[40px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
                    {/* Header: Identity + Progress */}
                    <div className="px-10 py-10 bg-slate-50/50 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-8">
                            <div className="h-20 w-20 rounded-[28px] bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-3xl text-indigo-600">
                                {teacherName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight mb-1">{teacherName}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-[#1e1b4b] text-white rounded-lg text-[10px] font-black uppercase tracking-wider">{subjectCode}</span>
                                    <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Faculty Member</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm min-w-[200px]">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Status</span>
                                <span className="text-sm font-black text-indigo-600">{getProgress()}/10 Rated</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-indigo-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(getProgress() / 10) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rating Grid */}
                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                        {QUESTION_LABELS.map((q, idx) => (
                            <div key={q.key} className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[#1e1b4b] font-black text-xs uppercase tracking-wider opacity-80">{q.label}</span>
                                    <span className="text-[10px] font-black text-indigo-400">Q{idx + 1}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const currentVal = feedback[q.key] as number;
                                        return (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => handleRatingChange(q.key, star)}
                                                className={cn(
                                                    "p-1 transition-all focus:outline-none",
                                                    currentVal >= star
                                                        ? "text-yellow-400 scale-125 drop-shadow-sm"
                                                        : "text-slate-100 hover:text-slate-200 hover:scale-110"
                                                )}
                                            >
                                                <Star
                                                    size={24}
                                                    fill={currentVal >= star ? "currentColor" : "none"}
                                                    strokeWidth={2}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Note & Action */}
                    <div className="p-10 bg-slate-50/50 border-t border-gray-100 space-y-8">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Constructive Feedback</label>
                                <span className={cn(
                                    "text-[10px] font-black tabular-nums",
                                    (feedback.comments as string).length >= 20 ? "text-red-500" : "text-gray-400"
                                )}>
                                    {(feedback.comments as string).length}/20
                                </span>
                            </div>
                            <textarea
                                rows={2}
                                maxLength={20}
                                className="w-full p-6 rounded-3xl border border-gray-100 bg-white text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-100 transition-all resize-none shadow-sm placeholder:text-gray-300 font-bold text-[#1e1b4b]"
                                placeholder={`Type your brief assessment here...`}
                                value={feedback.comments as string}
                                onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-16 py-5 bg-[#1e1b4b] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#1e1b4b]/20 flex items-center justify-center gap-4 disabled:bg-gray-400"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        SUBMITTING...
                                    </>
                                ) : (
                                    <>
                                        SUBMIT EVALUATION
                                        <Send size={18} />
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
