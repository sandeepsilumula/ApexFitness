import { useCallback, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export default function CoachPage() {
  return (
    <AppShell>
      <CoachContent />
    </AppShell>
  )
}

function CoachContent() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // The coach API is premium-only. A free member must get a real upsell
  // screen, not a transient toast: otherwise they type a message, it is
  // appended to the transcript, and nothing ever replies to it.
  const [isPremiumLocked, setIsPremiumLocked] = useState(false)
  // A scripted answer is indistinguishable from a real one by its text, so the
  // transcript would read as a working coach while answering from a script.
  // The API flags every fallback and the notice below says so out loud.
  const [degraded, setDegraded] = useState(false)
  const { notify } = useToast()

  const send = useCallback(async () => {
    const message = text.trim()
    if (!message || sending) return
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: message }
    setMsgs((current) => [...current, userMsg])
    setText('')
    setSending(true)
    try {
      const res = await apiFetch<{ reply: string; degraded: boolean }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
      setMsgs((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', text: res.reply },
      ])
      if (res.degraded) setDegraded(true)
    } catch (e: unknown) {
      // Branch on the API's error CODE. Matching on the message text would
      // silently un-gate the paywall the moment the copy is reworded.
      if (e instanceof ApiError && e.code === 'PREMIUM_REQUIRED') {
        setIsPremiumLocked(true)
        // Drop the message that will never be answered so the upsell screen
        // does not render an orphaned question above it.
        setMsgs((current) => current.filter((m) => m.id !== userMsg.id))
        return
      }
      notify(e instanceof ApiError ? e.message : 'Failed to get reply from the coach.', 'error')
    } finally {
      setSending(false)
    }
  }, [notify, sending, text])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') void send()
    },
    [send],
  )

  if (isPremiumLocked) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-page text-white">AI Coach</h1>
        <Card>
          <CardBody>
            <p className="text-slate-300">The AI coach is part of the Premium plan.</p>
            <Link href="/checkout" className="focus-ring mt-4 block rounded-md">
              <Button>Upgrade to Premium</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-page text-white">AI Coach</h1>

      {degraded ? (
        <p className="rounded-lg border border-gold-600/60 bg-navy-900 px-4 py-3 text-caption text-slate-300">
          <span className="font-medium text-gold-400">Offline coach.</span>{' '}
          No language model is reachable, so these replies are scripted from your logged
          sessions, volume and weight trend. They cover common questions only. Set{' '}
          <code className="font-mono text-slate-200">ANTHROPIC_API_KEY</code> and restart the
          server for full answers.
        </p>
      ) : null}

      {msgs.length === 0 ? (
        <p className="text-slate-400">
          Start a conversation with your coach. Ask about training, nutrition or your week.
        </p>
      ) : null}

      <div className="space-y-3">
        {msgs.map((m) => (
          <Card key={m.id} className={m.role === 'assistant' ? 'border-emerald-600' : ''}>
            <p className="text-caption font-semibold uppercase tracking-wide text-slate-400">{m.role}</p>
            <CardBody>{m.text}</CardBody>
          </Card>
        ))}
        {sending ? <p className="text-caption text-slate-400">Coach is thinking…</p> : null}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Ask your coach"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach…"
            disabled={sending}
          />
        </div>
        <Button onClick={() => void send()} disabled={sending || text.trim().length === 0}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
