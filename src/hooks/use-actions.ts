import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi, postApi, putApi, patchApi, deleteApi } from '@/lib/api'
import type { Decision, Intention, Energy, EnergyActivity, EnergyDiscomfort, EnergyMode, EnergyProfileItem, ReflectionDraft, Reflection, UsageSummary, CompletedExercise } from '@/lib/types'

export const useExercises = () => useQuery({ queryKey: ['exercises'], queryFn: () => fetchApi<CompletedExercise[]>('/exercises') })

export const useUsageSummary = () => useQuery({ queryKey: ['usage-summary'], queryFn: () => fetchApi<UsageSummary[]>('/usage/summary') })

// ── decisions ──
export const useDecisions = () => useQuery({ queryKey: ['decisions'], queryFn: () => fetchApi<Decision[]>('/decisions') })
export function useDecide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { question: string; options: string[] }) => postApi<Decision>('/decide', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
}
export function useResolveDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, chosen, next_action, review_on }: { id: string; chosen: string; next_action?: string; review_on?: string }) => patchApi(`/decisions/${id}`, { status: 'decided', chosen, next_action: next_action ?? '', review_on: review_on || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
}
export function useReopenDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patchApi(`/decisions/${id}`, { status: 'open', chosen: '', next_action: '', review_on: null, decided_at: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
}
export function useDeleteDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteApi<{ ok: true }>(`/decisions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
}

// ── intention ──
export const useTodayIntention = () => useQuery({ queryKey: ['intention', 'today'], queryFn: () => fetchApi<Intention | null>('/intention/today') })
export function useGenerateIntention() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postApi<Intention>('/intention', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intention', 'today'] }),
  })
}
export function useSaveIntention() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { top_focus: { item: string; serves: string }[]; drop_list: string[]; note: string }) =>
      putApi<Intention>('/intention', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intention', 'today'] }),
  })
}

// ── energy ──
export const useRecentEnergy = () => useQuery({ queryKey: ['energy'], queryFn: () => fetchApi<Energy[]>('/energy/recent') })
export function useLogEnergy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { energy: number; gave_energy?: string; drained_energy?: string }) => postApi<Energy>('/energy', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['energy'] }),
  })
}
export const useEnergyProfile = () => useQuery({ queryKey: ['energy-profile'], queryFn: () => fetchApi<EnergyProfileItem[]>('/energy/profile') })
export const useEnergyActivities = () => useQuery({ queryKey: ['energy-activities'], queryFn: () => fetchApi<EnergyActivity[]>('/energy/activities') })
export function useLogEnergyActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      activity: string
      context: string
      mode: EnergyMode
      energy_before: number
      energy_after: number
      engagement: number
      discomfort: EnergyDiscomfort
      wanted_to_continue: boolean | null
      want_more_if_successful: boolean | null
      notes?: string
    }) => postApi<EnergyActivity>('/energy/activities', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['energy-activities'] }),
  })
}

// ── reflection ──
export const useReflections = () => useQuery({ queryKey: ['reflections'], queryFn: () => fetchApi<Reflection[]>('/reflections') })
export function useDraftReflection() {
  return useMutation({ mutationFn: (period: string) => postApi<ReflectionDraft>('/reflect', { period }) })
}
export function useSaveReflection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => postApi<Reflection>('/reflections', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reflections'] }),
  })
}
export function useUpdateReflection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; summary?: string; energy?: number }) => patchApi(`/reflections/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reflections'] }),
  })
}
export function useDeleteReflection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/reflections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reflections'] }),
  })
}
