"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Save, Mail, Server, Shield, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ")
}

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline"; size?: "default" | "sm" }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
    const variants = {
      default: "bg-[#FF7A00] text-white hover:bg-[#E66D00]",
      outline: "bg-[#FFF4E2] text-black hover:bg-gray-50",
    }
    const sizes = {
      default: "px-6 py-3 text-base",
      sm: "px-4 py-2 text-sm",
    }
    return <button ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props} />
  }
)
Button.displayName = "Button"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("bg-[#FFF4E2] border-[3px] border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8", className)} {...props} />
  )
)
Card.displayName = "Card"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-white border-[3px] border-black rounded-lg px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00] transition-all",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

export default function SettingsPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 465,
    user: "",
    pass: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else if (!token) {
        // User is logged in but token isn't ready or missing, stop spinning
        setIsLoading(false)
      } else {
        fetchSettings()
      }
    }
  }, [user, authLoading, token])

  const fetchSettings = async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout

    try {
      const res = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })
      clearTimeout(id);
      const data = await res.json()
      if (data.success) {
        setSmtpConfig(data.smtpConfig)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ smtpConfig })
      })
      
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "Settings saved successfully!" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while saving." })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="h-screen bg-[#FDF3B1] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FF7A00] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF3B1] p-4 md:p-8 font-mono">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 font-bold hover:underline group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Settings</h1>
            <div className="bg-black text-white px-2 py-1 text-xs font-bold uppercase rotate-2">Beta</div>
          </div>
        </div>

        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase">Email Configuration</h2>
              <p className="text-sm font-bold text-gray-600">Connect your personal SMTP for agent emails</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase flex items-center gap-2">
                  <Server className="w-4 h-4" /> SMTP Host
                </label>
                <Input 
                  placeholder="e.g. smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Port
                </label>
                <Input 
                  type="number"
                  placeholder="e.g. 465 or 587"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" /> SMTP User (Email)
              </label>
              <Input 
                type="email"
                placeholder="your-email@example.com"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" /> SMTP Password
              </label>
              <Input 
                type="password"
                placeholder="••••••••••••••••"
                value={smtpConfig.pass}
                onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                required
              />
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                Note: For Gmail, use an "App Password" from your Google Account settings.
              </p>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-lg border-2 border-black flex items-center gap-3 font-bold",
                  message.type === "success" ? "bg-green-100" : "bg-red-100"
                )}
              >
                {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                {message.text}
              </motion.div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Settings
              </Button>
            </div>
          </form>
        </Card>

        <Card className="bg-yellow-50 border-dashed">
          <h3 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" /> Need Help?
          </h3>
          <p className="text-xs font-bold leading-relaxed">
            If you are using Gmail, make sure you have 2-Step Verification enabled. 
            Then, go to <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-[#FF7A00] underline">App Passwords</a> and generate a new password specifically for this application.
          </p>
        </Card>
      </div>
    </div>
  )
}
