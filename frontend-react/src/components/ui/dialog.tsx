import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	children: React.ReactNode
	className?: string
}

interface DialogContentProps {
	className?: string
	children: React.ReactNode
}

interface DialogHeaderProps {
	children: React.ReactNode
}

interface DialogTitleProps {
	children: React.ReactNode
}

interface DialogFooterProps {
	children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({
	open,
	onOpenChange,
	children,
	className = ''
}) => {
	const dialogRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && open) {
				onOpenChange(false)
			}
		}

		if (open) {
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = 'unset'
		}
	}, [open, onOpenChange])

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onOpenChange(false)
		}
	}

	if (!open) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
			onClick={handleBackdropClick}
		>
			<div
				ref={dialogRef}
				className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl mx-4 ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	)
}

export const DialogContent: React.FC<DialogContentProps> = ({
	className = '',
	children
}) => {
	return <div className={className}>{children}</div>
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
	return (
		<div className="flex items-center pt-6 pb-6 pr-6 border-b border-gray-200 dark:border-gray-700">
			{children}
		</div>
	)
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children }) => {
	return (
		<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
			{children}
		</h2>
	)
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children }) => {
	return (
		<div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
			{children}
		</div>
	)
}

export const DialogClose: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	return (
		<button
			onClick={onClose}
			className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
		>
			<X className="w-4 h-4" />
		</button>
	)
}
