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
        scrollRef.current?.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
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
                    <div className="max-w-7xl mx-auto mb-8 px-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-700">
                                    {totalRated} / {pendingTeachers.length} <span className="text-gray-400 font-medium">Teachers fully rated</span>
                                </span>
                            </div>
                            <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                {Math.round((totalRated / pendingTeachers.length) * 100)}% Complete
                            </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(totalRated / pendingTeachers.length) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                            />
                        </div>
                    </div>

                    <div className="max-w-[1400px] mx-auto px-4">
                        <div className="relative bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                            {/* Left Column: Fixed Questions */}
                            <div className="w-[340px] flex-shrink-0 bg-slate-50/50 border-r border-gray-100 hidden md:flex flex-col">
                                {/* Fixed Sidebar Header Spacer */}
                                <div className="h-[180px] p-8 flex flex-col justify-end border-b border-gray-100/50">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Feedback Criteria</h4>
                                    <p className="text-[13px] text-gray-500 font-medium leading-relaxed">Please rate each teacher based on the parameters listed below.</p>
                                </div>
                                
                                {/* Question Labels */}
                                <div className="flex-1 py-4">
                                    {FEEDBACK_QUESTIONS.map((q, idx) => (
                                        <div key={q.key} className="h-16 px-8 flex items-center border-b border-transparent">
                                            <div className="flex items-start gap-4">
                                                <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-white border border-gray-200 text-blue-600 text-[11px] font-black flex items-center justify-center shadow-sm">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                                <p className="text-gray-700 text-[13px] font-semibold leading-snug line-clamp-2">
                                                    {q.label}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Scrollable Teachers */}
                            <div className="flex-1 relative overflow-hidden flex flex-col">
                                {/* Navigation Arrows (Floating) */}
                                <AnimatePresence>
                                    {canScrollLeft && (
                                        <motion.button
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 20 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            onClick={() => scrollBy('left')}
                                            className="absolute left-0 top-[90px] -translate-y-1/2 z-30 bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={24} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {canScrollRight && (
                                        <motion.button
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: -20 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            onClick={() => scrollBy('right')}
                                            className="absolute right-0 top-[90px] -translate-y-1/2 z-30 bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
                                        >
                                            <ChevronRight size={24} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                {/* Teacher Scroll Row */}
                                <div
                                    ref={scrollRef}
                                    className="flex overflow-x-auto scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {pendingTeachers.map((teacher, idx) => {
                                        const progress = getProgress(teacher.allocation_id);
                                        const isComplete = progress === 10;
                                        
                                        return (
                                            <div key={teacher.allocation_id} className="flex-shrink-0 w-[300px] border-r border-gray-100 last:border-r-0 flex flex-col group">
                                                {/* Teacher Card Header (Sticky part for this column) */}
                                                <div className={cn(
                                                    "h-[180px] p-6 flex flex-col items-center text-center transition-colors border-b border-gray-100",
                                                    isComplete ? "bg-blue-50/30" : "bg-white group-hover:bg-slate-50/50"
                                                )}>
                                                    <div className={cn(
                                                        "h-16 w-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl mb-3 shadow-md transition-transform group-hover:scale-105",
                                                        isComplete
                                                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200"
                                                            : "bg-white border-2 border-slate-100 text-blue-600"
                                                    )}>
                                                        {teacher.teacher_name.charAt(0)}
                                                    </div>
                                                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight line-clamp-1 w-full">{teacher.teacher_name}</h3>
                                                    <p className="text-blue-600 font-semibold text-[12px] mt-1 line-clamp-1 w-full px-2">{teacher.subject_name}</p>
                                                    <div className="mt-3 w-full max-w-[120px]">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{progress}/10</span>
                                                            {isComplete && <CheckCircle2 size={12} className="text-blue-600" />}
                                                        </div>
                                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn("h-full transition-all duration-500", isComplete ? "bg-blue-600" : "bg-blue-400")}
                                                                style={{ width: `${(progress / 10) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Star Ratings Column */}
                                                <div className="flex-1 py-4">
                                                    {FEEDBACK_QUESTIONS.map((q) => {
                                                        const currentVal = feedbacks[teacher.allocation_id]?.ratings[q.key] || 0;
                                                        return (
                                                            <div key={q.key} className="h-16 flex items-center justify-center border-b border-gray-50/50 last:border-b-0 px-4">
                                                                <div className="flex flex-col items-center">
                                                                    {/* Mobile Question Label (Hidden on Desktop) */}
                                                                    <p className="md:hidden text-[11px] text-gray-500 font-bold mb-2 text-center line-clamp-1">{q.label}</p>
                                                                    
                                                                    <div className="flex items-center gap-1">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <button
                                                                                key={star}
                                                                                type="button"
                                                                                onClick={() => handleRatingChange(teacher.allocation_id, q.key, star)}
                                                                                className={cn(
                                                                                    "transition-all duration-200 focus:outline-none active:scale-75",
                                                                                    currentVal >= star
                                                                                        ? "text-amber-400"
                                                                                        : "text-slate-200 hover:text-amber-200"
                                                                                )}
                                                                            >
                                                                                <Star
                                                                                    size={20}
                                                                                    fill={currentVal >= star ? "currentColor" : "none"}
                                                                                    className={cn(currentVal >= star ? "drop-shadow-sm" : "")}
                                                                                    strokeWidth={currentVal >= star ? 0.5 : 1.5}
                                                                                />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
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
