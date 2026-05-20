'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { clsxm } from '~/lib/helper'

export type LoadingProps = {
  loadingText?: string
  useDefaultLoadingText?: boolean
}

export const Loading: Component<LoadingProps> = ({
  loadingText,
  className,
  useDefaultLoadingText = false,
}) => {
  const t = useTranslations('common')
  const loadingDefaultArray = t.raw('loading_default') as string[]
  const defaultLoadingText = useMemo(() => {
    if (Array.isArray(loadingDefaultArray) && loadingDefaultArray.length > 0) {
      const randomIndex = Math.floor(Math.random() * loadingDefaultArray.length)
      return loadingDefaultArray[randomIndex]
    }
    return ''
  }, [loadingDefaultArray])
  const nextLoadingText = useDefaultLoadingText
    ? defaultLoadingText
    : loadingText
  return (
    <div
      data-hide-print
      className={clsxm('my-20 flex flex-col center', className)}
    >
      <span className="loading loading-ball loading-lg" />
      {!!nextLoadingText && (
        <span className="mt-6 block">{nextLoadingText}</span>
      )}
    </div>
  )
}

export const FullPageLoading = () => (
  <Loading useDefaultLoadingText className="h-[calc(100vh-6.5rem-10rem)]" />
)
