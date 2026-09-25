import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const onboardingSchema = z.object({
  goal: z.enum(['cut', 'maintain', 'bulk']),
  weightKg: z.number().positive().max(400),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export const logWorkoutSchema = z.object({
  durationMin: z.number().int().positive().max(600),
  notes: z.string().max(2000).optional(),
})

export const logSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().max(1000),
  weightKg: z.number().nonnegative().max(1000).optional(),
})

export const bodyMetricSchema = z.object({
  weightKg: z.number().positive().max(400).optional(),
  bodyFatPct: z.number().min(1).max(70).optional(),
})

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

export const checkoutSchema = z.object({
  tier: z.enum(['premium']),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>
export type LogSetInput = z.infer<typeof logSetSchema>
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>
export type ChatInput = z.infer<typeof chatSchema>
