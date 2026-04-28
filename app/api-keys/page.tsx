"use client"

import * as React from "react"
import { useCallback, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Key, Copy, Trash2, CheckCircle, AlertTriangle, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ")
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
      default: "bg-[#FF7A00] text-white hover:bg-[#E66D00]",
      outline: "bg-[#FFF4E2] text-black hover:bg-gray-50",
      ghost: "bg-transparent border-transparent shadow-none hover:bg-gray-100 hover:shadow-none",
      danger: "bg-[#FF9AA2] text-black hover:bg-[#FF8A92]"
    }

    const sizes = {
      default: "px-6 py-3 text-base",
      sm: "px-4 py-2 text-sm",
      lg: "px-8 py-4 text-lg"
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[#FFF4E2] border-[3px] border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

interface ApiKeyResponse extends ApiKey {
  apiKey?: string | null
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [fullApiKeys, setFullApiKeys] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState("")
  const [copyError, setCopyError] = useState("")

  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/api-keys', { headers })
      const data = await response.json()

      if (response.ok) {
        const keys: ApiKeyResponse[] = data.apiKeys || []
        setFullApiKeys(
          keys.reduce((currentKeys: Record<string, string>, key) => {
            if (key.apiKey) {
              currentKeys[key.id] = key.apiKey
            }
            return currentKeys
          }, {})
        )
        setApiKeys(keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPreview: key.keyPreview,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt
        })))
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!authLoading && user) {
      fetchApiKeys()
    }
  }, [authLoading, user, fetchApiKeys])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    setIsCreating(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newKeyName })
      })

      const data = await response.json()

      if (response.ok) {
        setNewlyCreatedKey(data.apiKey)
        setNewKeyName("")
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setRevokeError("")
    setRevokingKeyId(id)

    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setApiKeys((currentKeys) => currentKeys.filter((key) => key.id !== id))
        setFullApiKeys((currentKeys) => {
          const remainingKeys = { ...currentKeys }
          delete remainingKeys[id]
          return remainingKeys
        })
      } else {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to revoke API key')
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setRevokeError(error instanceof Error ? error.message : 'Failed to revoke API key')
    } finally {
      setRevokingKeyId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyApiKey = async (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    setCopyError("")

    const apiKey = fullApiKeys[id]
    if (!apiKey) return

    try {
      await navigator.clipboard.writeText(apiKey)
      setCopiedKeyId(id)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (error) {
      console.error('Failed to copy API key:', error)
      setCopyError("Could not copy the API key. Please try again.")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="h-screen bg-[#FDF3B1] flex items-center justify-center">
        <div className="text-2xl font-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF3B1]">
      <header className="bg-[#FFF4E2] border-b-[3px] border-black p-4 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </a>
            <h1 className="text-2xl font-black">API Keys</h1>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Key
          </Button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-6">
        <Card className="mb-6 bg-[#5CC8FF]">
          <div className="flex items-start gap-4">
            <Key className="w-8 h-8 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-black mb-2">Secure API Access</h2>
              <p className="text-sm">
                API keys allow you to authenticate requests to your agents. Keep your keys secure and never share them publicly.
              </p>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-xl font-bold">Loading API keys...</div>
            </div>
          </Card>
        ) : apiKeys.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-black mb-2">No API Keys Found</h3>
              <p className="text-gray-600 mb-6">You have not generated any API keys yet. Create one when you are ready to connect external apps to your agents.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {revokeError && (
              <div className="p-3 bg-white border-[3px] border-red-500 rounded-lg font-bold text-red-600">
                {revokeError}
              </div>
            )}
            {copyError && (
              <div className="p-3 bg-white border-[3px] border-red-500 rounded-lg font-bold text-red-600">
                {copyError}
              </div>
            )}
            {apiKeys.map((key) => {
              const canCopyFullKey = Boolean(fullApiKeys[key.id])

              return (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:translate-y-[-2px] transition-transform">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-black">{key.name}</h3>
                          <span className={cn(
                            "px-2 py-1 text-xs font-bold rounded border-[2px] border-black",
                            key.isActive ? "bg-[#86EFAC]" : "bg-gray-300"
                          )}>
                            {key.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="font-mono text-sm text-gray-600 break-all">{key.keyPreview}</div>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <div>
                            <span className="font-bold">Created:</span> {new Date(key.createdAt).toLocaleDateString()}
                          </div>
                          {key.lastUsedAt && (
                            <div>
                              <span className="font-bold">Last used:</span> {new Date(key.lastUsedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={revokingKeyId === key.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {revokingKeyId === key.id ? "Revoking..." : "Revoke"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFF4E2] border-[3px] border-black p-6 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Create API Key</h2>
                <button onClick={() => setShowCreateModal(false)} className="hover:bg-black/5 p-1 rounded">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-2">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    className="w-full px-4 py-3 text-base border-[3px] border-black rounded-lg bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7A00]/30 transition-all"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create API Key"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show New Key Modal */}
      <AnimatePresence>
        {newlyCreatedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFF4E2] border-[3px] border-black p-6 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">API Key Created!</h2>
              </div>

              <div className="bg-[#FFE8B1] p-4 border-[3px] border-black rounded-lg mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Keep this key secure.</p>
                    <p className="text-xs">Do not share it publicly or commit it to your codebase.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 border-[3px] border-black rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600">YOUR API KEY</span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="px-3 py-1 text-xs font-bold bg-[#86EFAC] border-[2px] border-black rounded hover:translate-y-[-1px] transition-transform"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 inline mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded">
                  {newlyCreatedKey}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setNewlyCreatedKey(null)
                  setShowCreateModal(false)
                }}
              >
                I&apos;ve Saved My Key
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
