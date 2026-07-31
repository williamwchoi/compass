import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi, postApi, patchApi, deleteApi } from '@/lib/api'
import type { Domain, Value, Pillar, Goal, Rule, Inspiration, Strength } from '@/lib/types'

export const useDomains = () => useQuery({ queryKey: ['domains'], queryFn: () => fetchApi<Domain[]>('/domains') })
export const useValues = () => useQuery({ queryKey: ['values'], queryFn: () => fetchApi<Value[]>('/values') })
export const usePillars = () => useQuery({ queryKey: ['pillars'], queryFn: () => fetchApi<Pillar[]>('/pillars') })
export const useGoals = () => useQuery({ queryKey: ['goals'], queryFn: () => fetchApi<Goal[]>('/goals') })
export const useRules = () => useQuery({ queryKey: ['rules'], queryFn: () => fetchApi<Rule[]>('/rules') })
export const useInspirations = () => useQuery({ queryKey: ['inspirations'], queryFn: () => fetchApi<Inspiration[]>('/inspirations') })
export const useStrengths = () => useQuery({ queryKey: ['strengths'], queryFn: () => fetchApi<Strength[]>('/strengths') })

function crudMutations<T extends { id: string }>(resource: string, key: string) {
  return {
    useCreate() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (data: Partial<T>) => postApi<T>(`/${resource}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      })
    },
    useUpdate() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: ({ id, ...data }: Partial<T> & { id: string }) => patchApi(`/${resource}/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      })
    },
    useDelete() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (id: string) => deleteApi(`/${resource}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      })
    },
  }
}

export const valueM = crudMutations<Value>('values', 'values')
export const goalM = crudMutations<Goal>('goals', 'goals')
export const ruleM = crudMutations<Rule>('rules', 'rules')
export const pillarM = crudMutations<Pillar>('pillars', 'pillars')
export const inspirationM = crudMutations<Inspiration>('inspirations', 'inspirations')
