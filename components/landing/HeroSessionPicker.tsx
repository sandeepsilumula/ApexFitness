'use client'

import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { ChartIcon, DumbbellIcon, SparklesIcon } from '@/components/ui/Icon'
import type { IconProps } from '@/components/ui/Icon'

type Pane = {
  id: string
  tab: string
  title: string
  body: string
  metric: string
  metricLabel: string
  barWidth: string
  icon: ComponentType<IconProps>
}

const PANES: Pane[] = [
  {
    id: 'workout',
    tab: 'Workout',
    title: 'Upper Body Push',
    body: 'Bench press, overhead press, incline dumbbell press. Every set logged against your target load.',
    metric: '4',
    metricLabel: 'working sets today',
    barWidth: 'w-2/3',
    icon: DumbbellIcon,
  },
  {
    id: 'coach',
    tab: 'Coach',
    title: 'Ask about your last session',
    body: 'The coach reads your logged volume and weight trend, so answers reference your training, not generic advice.',
    metric: '10',
    metricLabel: 'turns remembered',
    barWidth: 'w-full',
    icon: SparklesIcon,
  },
  {
    id: 'progress',
    tab: 'Progress',
    title: 'Weekly volume trend',
    body: 'Volume, session frequency and body weight bucketed by week, so a good month never hides behind a bad one.',
    metric: '+12%',
    metricLabel: 'volume vs last week',
    barWidth: 'w-4/5',
    icon: ChartIcon,
  },
]

export function HeroSessionPicker() {
  const [activeId, setActiveId] = useState(PANES[0].id)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = PANES.findIndex((pane) => pane.id === activeId)
    const lastIndex = PANES.length - 1
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1
    if (event.key === 'ArrowLeft') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = lastIndex
    if (nextIndex === null) return

    event.preventDefault()
    setActiveId(PANES[nextIndex].id)
    document.getElementById(`hero-tab-${PANES[nextIndex].id}`)?.focus()
  }

  return (
    <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-navy-800 bg-navy-900/80 p-6 text-left backdrop-blur-sm">
      <div role="tablist" aria-label="Sample session views" className="flex gap-2">
        {PANES.map((pane) => {
          const isActive = pane.id === activeId
          return (
            <button
              key={pane.id}
              type="button"
              role="tab"
              id={`hero-tab-${pane.id}`}
              aria-selected={isActive}
              aria-controls={`hero-panel-${pane.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(pane.id)}
              onKeyDown={handleKeyDown}
              className={
                isActive
                  ? 'focus-ring min-tap flex items-center gap-2 rounded-md bg-gold-600 px-4 py-2.5 text-caption font-medium text-navy-950 transition-colors'
                  : 'focus-ring min-tap flex items-center gap-2 rounded-md border border-navy-800 px-4 py-2.5 text-caption text-slate-300 transition-colors hover:border-gold-600 hover:text-white'
              }
            >
              <pane.icon className="size-4" />
              {pane.tab}
            </button>
          )
        })}
      </div>

      {PANES.map((pane) => {
        const isActive = pane.id === activeId
        return (
          <div
            key={pane.id}
            role="tabpanel"
            id={`hero-panel-${pane.id}`}
            aria-labelledby={`hero-tab-${pane.id}`}
            hidden={!isActive}
            tabIndex={0}
            className="focus-ring mt-6 rounded-md"
          >
            <h3 className="font-display text-section text-white">{pane.title}</h3>
            <p className="mt-2 text-caption text-slate-300">{pane.body}</p>
            <div className="mt-6 flex items-end justify-between">
              <p className="font-display text-display text-emerald-500">{pane.metric}</p>
              <p className="text-caption text-slate-400">{pane.metricLabel}</p>
            </div>
            <div aria-hidden="true" className="mt-4 h-2 w-full rounded-full bg-navy-950">
              <div className={`h-2 rounded-full bg-emerald-600 ${pane.barWidth}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
