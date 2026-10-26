import useSWR from 'swr'
import type { IStaticLwpSubject } from '@/types/entities/IStaticLwpSubject'

export function useSubjects() {
  const { data, error, isLoading } = useSWR<IStaticLwpSubject[]>('/api/subjects', {
    revalidateOnMount: true,
    dedupingInterval: 300000,
  })

  return {
    subjects: data ?? [],
    error,
    isLoading,
  }
}
