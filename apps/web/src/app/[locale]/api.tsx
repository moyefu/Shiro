import type { AggregateRoot } from '@mx-space/api-client'
import { simpleCamelcaseKeys } from '@mx-space/api-client'
import { $fetch } from 'ofetch'

import { defaultThemeConfig } from '~/app.default.theme-config'
import { appStaticConfig } from '~/app.static.config'
import { attachServerFetch } from '~/lib/attach-fetch'
import { deepMerge } from '~/lib/lodash'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'

const cacheTime = appStaticConfig.cache.enabled
  ? appStaticConfig.cache.ttl.aggregation
  : 1

const themeByLocale: Record<string, string> = {
  zh: 'shiro',
  en: 'shiro_en',
  ja: 'shiro_ja',
}

export const fetchAggregationData = async (locale?: string) => {
  await attachServerFetch()
  const queryClient = getQueryClient()
  const theme = locale ? themeByLocale[locale] || 'shiro' : 'shiro'

  const fetcher = async () => {
    let version = ''
    try {
      const versionRes = await $fetch<
        AggregateRoot & {
          theme: string
        }
      >(apiClient.aggregate.proxy.toString(true), {
        params: {
          theme: `${theme}_version`,
          timeStamp: new Date(),
        },
      })
      version = versionRes.theme || ''
      console.log(`${theme}_version`, version)
    } catch (e) {
      console.log(`${theme}_version:error`, e)
    }

    const data = (await $fetch<
      AggregateRoot & {
        theme: AppThemeConfig
      }
    >(apiClient.aggregate.proxy.toString(true), {
      params: {
        theme,
        ...(version && { now_version: version }),
      },
    }).then(simpleCamelcaseKeys)) as AggregateRoot & {
      theme: AppThemeConfig
    }

    return {
      ...data,
      theme: data.theme
        ? deepMerge(defaultThemeConfig, data.theme)
        : defaultThemeConfig,
    }
  }

  return queryClient.fetchQuery({
    queryKey: ['aggregate', theme, 'realtime'],
    queryFn: fetcher,
    staleTime: cacheTime,
    gcTime: cacheTime,
  })
}
