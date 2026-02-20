"use client"
import React, { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const variants = {
        initial: { opacity: 0, y: 50, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.9 },
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <AlertCircle className="w-5 h-5 text-blue-500" />,
    };

    const bgColors = {
        success: "bg-white border-green-200",
        error: "bg-white border-red-200",
        info: "bg-white border-blue-200",
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-5 right-5 z-50">
                    <motion.div
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border",
                            bgColors[type]
                        )}
                    >
                        {icons[type]}
                        <span className="text-sm font-medium text-gray-700">{message}</span>
                        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
