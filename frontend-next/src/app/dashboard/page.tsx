"use client"
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Loader2, CheckCircle2, Star, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { FEEDBACK_QUESTIONS } from '@/app/dashboard/feedbackQuestions';

interface Teacher {
    allocation_id: number;
    teacher_name: string;
    is_submitted: boolean;
    subject_code: string;
    subject_name: string;
}

interface Subject {
    subject_code: string;
    subject_name: string;
    teachers: Teacher[];
}

interface FeedbackState {
    [allocationId: string]: {
        ratings: { [q: string]: number };
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
        msg: '',
        type: 'info',
        visible: false,
    });

    const [feedbacks, setFeedbacks] = useState<FeedbackState>({});

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type, visible: true });
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        // Small delay so DOM paints first
        setTimeout(checkScroll, 100);
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [allTeachers]);

    const scrollBy = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'right' ? 380 : -380, behavior: 'smooth' });
    };

    const fetchTeachers = async () => {
        try {
            const res = await apiFetch('/my-teachers/');
            const data = await res.json();

            if (data.status === "ok") {
                const flatTeachers: Teacher[] = [];
                data.subjects.forEach((subj: Subject) => {
                    subj.teachers.forEach(t => {
                        flatTeachers.push({
                            ...t,
                            subject_code: subj.subject_code,
                            subject_name: subj.subject_name
                        });
                    });
                });
                setAllTeachers(flatTeachers);

                const initialFeedback: FeedbackState = {};
                flatTeachers.forEach(t => {
                    if (!t.is_submitted) {
                        initialFeedback[t.allocation_id] = {
                            ratings: {
                                q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
                                q6: 0, q7: 0, q8: 0, q9: 0, q10: 0
                            }
                        };
                    }
                });
                setFeedbacks(initialFeedback);
            } else {
                showToast("Session expired or invalid. Please login again.", "error");
                router.push('/');
            }
        } catch (error) {
            console.error("Fetch teachers error:", error);
            showToast("Error connecting to server. Is backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (allocationId: number, qKey: string, rating: number) => {
        setFeedbacks(prev => ({
            ...prev,
            [allocationId]: {
                ...prev[allocationId],
                ratings: {
                    ...prev[allocationId].ratings,
                    [qKey]: rating
                }
            }
        }));
    };

    const getProgress = (allocationId: number) => {
        const f = feedbacks[allocationId];
        if (!f) return 0;
        return Object.values(f.ratings).filter(val => val > 0).length;
    };

    const handleSubmitAll = async () => {
        const pendingTeachers = allTeachers.filter(t => !t.is_submitted);
        const incomplete = pendingTeachers.some(t => getProgress(t.allocation_id) < 10);

        if (incomplete) {
            showToast("Please provide all ratings for each teacher before submitting.", "error");
            return;
        }

        setSubmitting(true);
        let successCount = 0;
        let failCount = 0;

        for (const t of pendingTeachers) {
            const payload = {
                subject_code: t.subject_code,
                allocation_id: t.allocation_id,
                ...feedbacks[t.allocation_id].ratings
            };

            try {
                const res = await apiFetch('/submit-feedback/', {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.status === "ok") {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setSubmitting(false);
        if (failCount === 0) {
            showToast(`All ${successCount} feedbacks submitted successfully!`, "success");
            fetchTeachers();
        } else {
            showToast(`${successCount} submitted, ${failCount} failed. Please try again.`, "error");
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
                <p className="text-gray-500 font-semibold">Loading your assigned teachers...</p>
            </div>
        );
    }

    const pendingTeachers = allTeachers.filter(t => !t.is_submitted);
    const hasNoAssignments = allTeachers.length === 0;
    const totalRated = pendingTeachers.filter(t => getProgress(t.allocation_id) === 10).length;

    return (
        <div className="min-h-screen pb-32">
            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Header */}
            <div className="text-center space-y-3 mb-10">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                    Rate Your <span className="text-blue-600">Teachers</span>
                </h2>
                <p className="text-gray-400 font-medium">
                    Scroll through your teachers and rate each one — your feedback matters.
                </p>
            </div>

            {/* Empty / Done States */}
            {hasNoAssignments ? (
                <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xl text-center">
                    <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                        <BookOpen className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Teachers Assigned Yet</h3>
                    <p className="text-gray-400 max-w-sm text-sm">Your class has no active teacher allocations right now. Please check again later.</p>
                </div>
            ) : pendingTeachers.length === 0 ? (
                <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xl text-center">
                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">All Done! 🎉</h3>
                    <p className="text-gray-400 max-w-sm text-sm">You've submitted feedback for all your teachers. Thank you!</p>
                </div>
            ) : (
                <>
                    {/* Progress Summary Bar */}
                    <div className="max-w-5xl mx-auto mb-6 px-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-500">
                                {totalRated} / {pendingTeachers.length} teachers fully rated
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                                {Math.round((totalRated / pendingTeachers.length) * 100)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(totalRated / pendingTeachers.length) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 80 }}
                            />
                        </div>
                    </div>

                    {/* Scroll Container */}
                    <div className="relative">
                        {/* Left Arrow */}
                        <AnimatePresence>
                            {canScrollLeft && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={() => scrollBy('left')}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1 bg-white border border-gray-200 shadow-xl rounded-2xl p-3 text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all"
                                >
                                    <ChevronLeft size={22} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Right Arrow */}
                        <AnimatePresence>
                            {canScrollRight && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={() => scrollBy('right')}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1 bg-white border border-gray-200 shadow-xl rounded-2xl p-3 text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all"
                                >
                                    <ChevronRight size={22} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Fade edges */}
                        {canScrollLeft && (
                            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none rounded-l-3xl" />
                        )}
                        {canScrollRight && (
                            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none rounded-r-3xl" />
                        )}

                        {/* Scrollable Row */}
                        <div
                            ref={scrollRef}
                            className="flex gap-5 overflow-x-auto pb-4 px-2 scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {pendingTeachers.map((teacher, idx) => {
                                const progress = getProgress(teacher.allocation_id);
                                const isComplete = progress === 10;

                                return (
                                    <motion.div
                                        key={teacher.allocation_id}
                                        initial={{ opacity: 0, y: 24 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.07, type: 'spring', stiffness: 100 }}
                                        className="flex-shrink-0 w-[360px] bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
                                        style={{ minHeight: '520px' }}
                                    >
                                        {/* Card Header */}
                                        <div className={cn(
                                            "px-6 pt-6 pb-4 border-b border-gray-50",
                                            isComplete ? "bg-gradient-to-br from-blue-50 to-indigo-50" : "bg-slate-50/60"
                                        )}>
                                            <div className="flex items-start gap-4">
                                                {/* Avatar */}
                                                <div className={cn(
                                                    "h-14 w-14 rounded-2xl flex items-center justify-center font-extrabold text-xl flex-shrink-0 shadow-sm",
                                                    isComplete
                                                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200"
                                                        : "bg-white border border-gray-100 text-blue-600"
                                                )}>
                                                    {teacher.teacher_name.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base font-bold text-gray-900 leading-tight truncate">{teacher.teacher_name}</h3>
                                                    <p className="text-blue-600 font-semibold text-sm mt-0.5 truncate">{teacher.subject_name}</p>
                                                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-200/60 text-gray-500 rounded-md text-[11px] font-bold uppercase tracking-wider">{teacher.subject_code}</span>
                                                </div>
                                                {isComplete && (
                                                    <div className="flex-shrink-0">
                                                        <CheckCircle2 className="text-blue-500" size={22} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{progress}/10 Completed</span>
                                                    <span className={cn(
                                                        "text-[11px] font-black uppercase tracking-wider",
                                                        isComplete ? "text-blue-500" : "text-gray-300"
                                                    )}>
                                                        {isComplete ? "✓ Done" : `${10 - progress} left`}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={cn(
                                                            "h-full rounded-full",
                                                            isComplete
                                                                ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                                                                : "bg-blue-400"
                                                        )}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(progress / 10) * 100}%` }}
                                                        transition={{ type: 'spring', stiffness: 80 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Questions — scrollable vertically */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-2"
                                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
                                            {FEEDBACK_QUESTIONS.map((q, qIdx) => {
                                                const currentVal = feedbacks[teacher.allocation_id]?.ratings[q.key] || 0;
                                                return (
                                                    <div
                                                        key={q.key}
                                                        className={cn(
                                                            "rounded-2xl border p-3 transition-all",
                                                            currentVal > 0
                                                                ? "border-blue-100 bg-blue-50/40"
                                                                : "border-gray-100 bg-slate-50/40 hover:border-gray-200"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            {/* Question number + label */}
                                                            <div className="flex items-start gap-2 min-w-0">
                                                                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center mt-0.5">
                                                                    {qIdx + 1}
                                                                </span>
                                                                <p className="text-gray-700 text-[12px] font-semibold leading-snug break-words">
                                                                    {q.label}
                                                                </p>
                                                            </div>
                                                            {/* Stars */}
                                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => handleRatingChange(teacher.allocation_id, q.key, star)}
                                                                        className={cn(
                                                                            "transition-all focus:outline-none active:scale-90",
                                                                            currentVal >= star
                                                                                ? "text-amber-400 scale-105"
                                                                                : "text-gray-200 hover:text-amber-200"
                                                                        )}
                                                                    >
                                                                        <Star
                                                                            size={18}
                                                                            fill={currentVal >= star ? "currentColor" : "none"}
                                                                            strokeWidth={currentVal >= star ? 0 : 1.5}
                                                                        />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dot Indicators */}
                    {pendingTeachers.length > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            {pendingTeachers.map((teacher) => {
                                const prog = getProgress(teacher.allocation_id);
                                return (
                                    <div
                                        key={teacher.allocation_id}
                                        className={cn(
                                            "h-2 rounded-full transition-all",
                                            prog === 10 ? "w-6 bg-blue-500" : "w-2 bg-gray-200"
                                        )}
                                    />
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Bottom Floating Submit Bar */}
            <AnimatePresence>
                {pendingTeachers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-0 right-0 z-40 flex justify-center px-4"
                    >
                        <button
                            onClick={handleSubmitAll}
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-10 py-4 rounded-2xl font-bold text-base shadow-[0_16px_40px_-8px_rgba(37,99,235,0.45)] flex items-center gap-3 transition-all active:scale-95 group"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit All Feedback
                                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
