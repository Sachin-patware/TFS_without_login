"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Calendar, ShieldCheck, ArrowRight, Laptop, GraduationCap, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Toast, ToastType } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);

  // Student Fields
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');

  // Year to Semester mapping
  const YEAR_SEMESTER_MAP: Record<string, number[]> = {
    '1': [1, 2],
    '2': [3, 4],
    '3': [5, 6],
    '4': [7, 8]
  };

  const handleYearChange = (val: string) => {
    setYear(val);
    // If current semester is not in the new year's semesters, reset it
    const validSems = YEAR_SEMESTER_MAP[val] || [];
    if (!validSems.includes(parseInt(semester))) {
      setSemester('');
    }
  };

  const handleSemesterChange = (val: string) => {
    setSemester(val);
    const sem = parseInt(val);
    // Automatically set logical year
    if ([1, 2].includes(sem)) setYear('1');
    else if ([3, 4].includes(sem)) setYear('2');
    else if ([5, 6].includes(sem)) setYear('3');
    else if ([7, 8].includes(sem)) setYear('4');
  };

  // Admin Fields
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');

  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  // URL Pre-set Parameters
  const branchFromUrl = searchParams.get('branch');
  const yearFromUrl = searchParams.get('year');
  const semesterFromUrl = searchParams.get('semester');
  const sectionFromUrl = searchParams.get('section');

  // Persistent Device Fingerprinting
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    setMounted(true);

    // Auto-fill from URL if present
    if (branchFromUrl) setBranch(branchFromUrl);
    if (yearFromUrl) setYear(yearFromUrl);
    if (semesterFromUrl) setSemester(semesterFromUrl);
    if (sectionFromUrl) setSection(sectionFromUrl);

    // Persistent Student ID (Fingerprint) with 15-minute expiry
    if (typeof window !== 'undefined') {
      let stuId = localStorage.getItem('persistent_stu_id');
      let timestamp = localStorage.getItem('persistent_stu_timestamp');
      const now = Date.now();
      const expiryTime = 15 * 60 * 1000; // 15 minutes

      if (!stuId || !timestamp || (now - parseInt(timestamp) > expiryTime)) {
        // Generate new ID if missing or expired (older than 15 mins)
        stuId = 'STU-' + Math.random().toString(36).substring(2, 11).toUpperCase() +
          Date.now().toString(36).toUpperCase();
        localStorage.setItem('persistent_stu_id', stuId);
        localStorage.setItem('persistent_stu_timestamp', now.toString());
      }
      setFingerprint(stuId);
    }
  }, []);

  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
    msg: '',
    type: 'info',
    visible: false,
  });

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type, visible: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Admin login
    if (role === 'admin') {
      if (!email || !dob) {
        showToast("Please fill in all fields.", "error");
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch('/dashboard-admin/login/', {
          method: "POST",
          body: JSON.stringify({ username: email, password: dob }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          if (typeof window !== 'undefined') {
            localStorage.setItem("access_token", data.access);
            localStorage.setItem("admin_username", data.username);
            localStorage.setItem("is_admin", "true");
          }
          showToast("Admin Login Successful! Redirecting...", "success");
          setTimeout(() => router.push('/admin'), 1500);
        } else {
          showToast(data.error || "Invalid credentials.", "error");
        }
      } catch (error) {
        showToast("Server connection failed. Is backend running?", "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Student login
    if (!branch || !year || !semester || !section) {
      showToast("Please select all class details.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/login/', {
        method: "POST",
        body: JSON.stringify({
          branch,
          year: parseInt(year),
          semester: parseInt(semester),
          section: parseInt(section),
          token: tokenFromUrl,
          sig: searchParams.get('sig') || '',
          fingerprint: fingerprint
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        if (typeof window !== 'undefined') {
          localStorage.setItem("access_token", data.access);
          localStorage.setItem("enrollment", data.EnrollmentNo);
          localStorage.setItem("fullName", data.FullName);
          localStorage.setItem("branch", data.branch);
          localStorage.setItem("year", data.year.toString());
          localStorage.setItem("semester", data.semester.toString());
          localStorage.setItem("section", data.section.toString());
        }
        showToast("Welcome! Redirecting to dashboard...", "success");
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        const firstError = data.errors ? Object.values(data.errors).flat()[0] as string : data.error;
        showToast(firstError || "Could not verify class details.", "error");
      }
    } catch (error) {
      showToast("Server connection failed. Is backend running?", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#020617] text-slate-50 overflow-hidden font-sans">
      <Toast
        message={toast.msg}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      {/* Left Section - Hero/Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative lg:w-1/2 flex flex-col justify-center px-8 lg:px-24 pb-28 pt-24 z-10"
      >
        <div className="mb-12 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-2">
            <Image src="/images/IT dept.png" alt="Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">IT Department</h3>
            <p className="text-sm text-slate-400 font-medium">ACROPOLIS INSTITUTE OF TECHNOLOGY & RESEARCH</p>
          </div>
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold mb-8 leading-tight">
          Shape the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Future</span> of Education.
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-lg leading-relaxed">
          The Teacher Feedback System empowers students to provide constructive insights, helping our institution achieve excellence in teaching and learning.
        </p>

        <div className="grid grid-cols-2 gap-6 max-w-md">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="text-blue-400 mb-3" size={24} />
            <h4 className="font-bold text-white mb-1">Secure</h4>
            <p className="text-xs text-slate-400">Your feedback is anonymous and encrypted.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Laptop className="text-indigo-400 mb-3" size={24} />
            <h4 className="font-bold text-white mb-1">Easy Access</h4>
            <p className="text-xs text-slate-400">Provide feedback anytime, anywhere.</p>
          </div>
        </div>
      </motion.div>

      {/* Right Section - Login Card */}
      <div className="lg:w-1/2 flex items-start justify-center p-12 lg:pb-28 pt-24  z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-10 lg:p-10 shadow-2xl relative"
        >
          {/* Subtle reflection effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Login</h2>
            {role === 'student' && !tokenFromUrl ? (
              <p className="text-red-400 font-medium">Access token required. Please use the link provided by admin.</p>
            ) : (
              <p className="text-slate-400">Sign in to share your valuable feedback</p>
            )}
          </div>

          <div className="flex mb-8 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setRole('student')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                role === 'student'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <GraduationCap size={20} />
              Student
            </button>
            <button
              onClick={() => setRole('admin')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                role === 'admin'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <ShieldCheck size={20} />
              Admin
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <div className="space-y-5">
                {role === 'student' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Branch</label>
                        <Select value={branch} onValueChange={setBranch} disabled={!!branchFromUrl}>
                          <SelectTrigger className="bg-white/5 border-white/12 text-white focus:ring-blue-500/50">
                            <SelectValue placeholder="Select Branch" />
                          </SelectTrigger>
                          <SelectContent>
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
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Year</label>
                        <Select value={year} onValueChange={handleYearChange} disabled={!!yearFromUrl}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-blue-500/50">
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Semester</label>
                        <Select value={semester} onValueChange={handleSemesterChange} disabled={!!semesterFromUrl}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-blue-500/50">
                            <SelectValue placeholder="Select Semester" />
                          </SelectTrigger>
                          <SelectContent>
                            {(year ? YEAR_SEMESTER_MAP[year] : [1, 2, 3, 4, 5, 6, 7, 8]).map(s => (
                              <SelectItem key={s} value={s.toString()}>{s}th Semester</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Section</label>
                        <Select value={section} onValueChange={setSection} disabled={!!sectionFromUrl}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-blue-500/50">
                            <SelectValue placeholder="Select Section" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(s => (
                              <SelectItem key={s} value={s.toString()}>Section {s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300 ml-1">Admin Username</label>
                      <Input
                        type="text"
                        placeholder="Enter Admin Username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<ShieldCheck size={18} />}
                        className="focus:border-blue-500/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300 ml-1">Password</label>
                      <Input
                        type="password"
                        placeholder="Enter Password"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        icon={<Lock size={18} />}
                        className="focus:border-blue-500/50"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none group"
                isLoading={loading}
              >
                <span className="flex items-center justify-center gap-2">
                  {role === 'student' ? 'Sign In as Student' : 'Sign In as Admin'}
                  {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </span>
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-slate-500 text-xs mt-10">
            &copy; {new Date().getFullYear()} IT Department Portal. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
