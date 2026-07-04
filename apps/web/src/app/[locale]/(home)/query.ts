import type { AggregateTop } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'

export const queryKey = (locale: string) => ['home', locale]

export const useHomeQueryData = (locale: string) =>
  useQuery({
    queryKey: queryKey(locale),
    queryFn: async () => null! as AggregateTop,
    enabled: false,
  }).data!
