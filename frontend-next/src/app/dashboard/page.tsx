"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Star, Send, GraduationCap } from 'lucide-react';
import API_BASE_URL from '@/config';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

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
        comments: string;
    };
}

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



export default function DashboardPage() {
    const router = useRouter();
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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

                // Initialize feedback state for unsubmitted teachers
                const initialFeedback: FeedbackState = {};
                flatTeachers.forEach(t => {
                    if (!t.is_submitted) {
                        initialFeedback[t.allocation_id] = {
                            ratings: {
                                q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
                                q6: 0, q7: 0, q8: 0, q9: 0, q10: 0
                            },
                            comments: ""
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

    const handleCommentChange = (allocationId: number, comments: string) => {
        setFeedbacks(prev => ({
            ...prev,
            [allocationId]: {
                ...prev[allocationId],
                comments
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
                ...feedbacks[t.allocation_id].ratings,
                comments: feedbacks[t.allocation_id].comments
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
            } catch (error) {
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
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                </div>
                <p className="text-gray-600 font-medium">Loading your assigned teachers...</p>
            </div>
        );
    }
    const pendingTeachers = allTeachers.filter(t => !t.is_submitted);
    const noTeachersAssigned = !allTeachers?.length;
    const isEvaluationComplete =
        allTeachers?.length > 0 && !pendingTeachers?.length;


    return (
        <div className="min-h-screen bg-[#F8F9FF]">
            <Toast
                message={toast.msg}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <div className="text-center space-y-2 pt-12 mb-10">
                <h2 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                    Rate Your Teachers
                </h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Share your feedback for all assigned lecturers below.</p>
            </div>

            <div className="max-w-6xl mx-2 px-2 space-y-6">
                {noTeachersAssigned || isEvaluationComplete ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-gray-100 shadow-xl text-center">

                        <div
                            className={`h-16 w-16 rounded-full flex items-center justify-center mb-6 ${noTeachersAssigned ? "bg-gray-100" : "bg-green-50"
                                }`}
                        >
                            {noTeachersAssigned ? (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            ) : (
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {noTeachersAssigned ? "No Records Found" : "Evaluations Complete"}
                        </h3>

                        <p className="text-gray-500 max-w-md px-6 text-sm font-medium">
                            {noTeachersAssigned
                                ? "There are no teachers available for evaluation."
                                : "Thank you for your valuable feedback. It helps us improve the academic experience."}
                        </p>

                    </div>
                ) : (
                    <div className="space-y-6">
                        {pendingTeachers.map((teacher, idx) => (
                            <motion.div
                                key={teacher.allocation_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className="bg-white rounded-[32px] overflow-hidden shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col lg:flex-row min-h-[160px]"
                            >
                                {/* Left Section: Teacher Identity */}
                                <div className="w-full lg:w-[240px] p-2 lg:bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-gray-100 flex items-center lg:items-center lg:flex-col gap-5 flex-shrink-0 text-center lg:text-left">
                                    <div className="h-16 w-16 rounded-2xl bg-white border border-indigo-50 flex items-center justify-center font-black text-2xl text-indigo-600 shadow-sm mx-auto lg:mx-0">
                                        {teacher.teacher_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-black text-[#1e1b4b] truncate leading-tight mb-1" title={teacher.teacher_name}>
                                            {teacher.teacher_name}
                                        </h3>
                                        <div className="flex items-center gap-2 justify-center lg:justify-start">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                                                {teacher.subject_code}
                                            </span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                                                Lecturer
                                            </span>
                                        </div>
                                        <p className="mt-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">{teacher.subject_name}</p>
                                    </div>
                                </div>

                                {/* Right Section: Ratings Area */}
                                <div className="flex-1 flex flex-col min-w-0 bg-white">
                                    {/* Progress Header */}
                                    <div className="px-3 py-2 border-b border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 bg-indigo-50/50 px-2 py-1 rounded-full border border-indigo-100/30">
                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.1em] whitespace-nowrap">
                                                {getProgress(teacher.allocation_id)}/10 Complete
                                            </span>
                                            <div className="w-14 h-1.5 bg-indigo-100/50 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-indigo-600"
                                                    animate={{ width: `${(getProgress(teacher.allocation_id) / 10) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Evaluation Grid - HORIZONTAL SCROLL FIX */}
                                    <div className="flex-1 min-w-0 overflow-hidden relative">
                                        <div className="overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-indigo-100 scrollbar-track-transparent h-full">
                                            <div className="flex items-center gap-4 min-w-max px-2">
                                                {QUESTION_LABELS.map((q, qIdx) => (
                                                    <div key={q.key} className="flex flex-col items-center gap-3 p-5 rounded-[24px] bg-slate-50/20 border border-gray-100/50 hover:bg-white hover:border-indigo-100 transition-all group/q w-[130px] flex-shrink-0">
                                                        <span className="text-[15px] font-black text-blue-600/60 uppercase">Q{qIdx + 1}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => {
                                                                const currentVal = feedbacks[teacher.allocation_id]?.ratings[q.key] || 0;
                                                                return (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => handleRatingChange(teacher.allocation_id, q.key, star)}
                                                                        className={cn(
                                                                            "p-0.5 transition-all focus:outline-none",
                                                                            currentVal >= star
                                                                                ? "text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]"
                                                                                : "text-gray-100 hover:text-gray-200"
                                                                        )}
                                                                    >
                                                                        <Star
                                                                            size={20}
                                                                            fill={currentVal >= star ? "currentColor" : "none"}
                                                                            strokeWidth={currentVal >= star ? 0 : 2}
                                                                        />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-700 text-center leading-tight tracking-tighter truncate ">
                                                            {q.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Scroll Indicator */}
                                        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-20" />
                                    </div>

                                    {/* Note Section */}
                                    <div className="px-4 pb-4 pt-2">
                                        <div className="relative group/note">
                                            <input
                                                type="text"
                                                value={feedbacks[teacher.allocation_id]?.comments || ""}
                                                onChange={(e) => handleCommentChange(teacher.allocation_id, e.target.value)}
                                                maxLength={20}
                                                placeholder={`A quick note about ${teacher.teacher_name.split(' ')[0]}...`}
                                                className="w-full bg-slate-50 border border-gray-100 focus:bg-white rounded-2xl px-6 py-3.5 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-100 transition-all font-bold text-[#1e1b4b] placeholder:text-gray-300"
                                            />
                                            <span className={cn(
                                                "absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-tighter tabular-nums",
                                                (feedbacks[teacher.allocation_id]?.comments.length || 0) >= 20 ? "text-red-500" : "text-gray-300"
                                            )}>
                                                {(feedbacks[teacher.allocation_id]?.comments.length || 0)}/20
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Bar */}
            <AnimatePresence>
                {pendingTeachers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className=" bottom-8 left-0 right-0 z-50 flex justify-center px-4 my-10"
                    >
                        <button
                            onClick={handleSubmitAll}
                            disabled={submitting}
                            className="bg-[#1e1b4b] hover:bg-black disabled:bg-gray-400 text-white px-5 py-4 rounded-[22px] font-black text-base shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 group"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    SUBMITTING...
                                </>
                            ) : (
                                <>
                                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    SUBMIT ALL FEEDBACK
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
