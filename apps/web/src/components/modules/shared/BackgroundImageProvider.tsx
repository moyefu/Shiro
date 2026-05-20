'use client'

import { useEffect, useState } from 'react'

import { useIsClient } from '~/hooks/common/use-is-client'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

export const BackgroundImageProvider = () => {
  const isClient = useIsClient()
  const bgConfig = useAppConfigSelector((config) => config.bg)
  const bgImages = bgConfig?.images || []
  const [currentBg, setCurrentBg] = useState<string>('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scrollBlur, setScrollBlur] = useState(0)
  const [scrollOpacity, setScrollOpacity] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [fadeInProgress, setFadeInProgress] = useState(0)

  // 从配置读取基础参数，提供默认值
  const baseBlur = bgConfig?.blur ?? 5
  const baseOpacity = bgConfig?.opacity ?? 0.65

  // 加载动画效果
  useEffect(() => {
    if (!imageLoaded || !isClient) return

    setIsAnimating(true)
    const duration = 1200 // 动画持续时间 1.2 秒
    const fadeInDuration = 100 // 淡入动画持续时间
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const fadeInProgressRaw = Math.min(elapsed / fadeInDuration, 1)

      // 使用 easeOutCubic 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      // 淡入使用 easeOutQuad 更柔和
      const fadeEaseProgress = 1 - Math.pow(1 - fadeInProgressRaw, 2)

      // 根据动画进度设置模糊度和透明度
      setScrollBlur(baseBlur * easeProgress)
      setScrollOpacity(baseOpacity * easeProgress)
      setFadeInProgress(fadeEaseProgress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        setFadeInProgress(1)
      }
    }

    requestAnimationFrame(animate)
  }, [imageLoaded, isClient, baseBlur, baseOpacity])

  useEffect(() => {
    if (!isClient || bgImages.length === 0) return

    // 随机选择一张背景图片
    const randomIndex = Math.floor(Math.random() * bgImages.length)
    const selectedImage = bgImages[randomIndex]

    // 预加载图片
    const img = new Image()
    img.onload = () => {
      setCurrentBg(selectedImage)
      setImageLoaded(true)
    }
    img.onerror = () => {
      console.warn('Failed to load background image:', selectedImage)
    }
    img.src = selectedImage
  }, [bgImages, isClient])

  useEffect(() => {
    if (!isClient || !imageLoaded || isAnimating) return

    const handleScroll = () => {
      const { scrollY } = window
      const windowHeight = window.innerHeight

      // 计算滚动进度：滚动50%屏幕高度后达到最大效果
      const maxScrollDistance = windowHeight * 0.5
      const progress = Math.min(scrollY / maxScrollDistance, 1)

      // 计算模糊度：从配置的baseBlur到最大模糊值20px
      const maxBlur = 20 // 固定最大模糊半径为20px
      const newBlur = baseBlur + (maxBlur - baseBlur) * progress

      // 计算透明度：从配置的baseOpacity逐渐减少到0（完全透明）
      const newOpacity = baseOpacity * (1 - progress)

      setScrollBlur(newBlur)
      setScrollOpacity(Math.min(newOpacity, 1))
    }

    // 初始化滚动位置
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isClient, imageLoaded, isAnimating, baseBlur, baseOpacity])

  if (!isClient || !currentBg) return null

  return (
    <style
      id="background-image-style"
      dangerouslySetInnerHTML={{
        __html: `
          .home-background::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-image: url('${currentBg}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            opacity: ${scrollOpacity * fadeInProgress};
            filter: blur(${scrollBlur}px);
            z-index: -2;
            pointer-events: none;
            will-change: transform, opacity, filter;
            transform: translateZ(0) scale(${1 + (1 - fadeInProgress) * 0.05});
            transition: ${isAnimating ? 'none' : 'opacity 0.2s ease-out, filter 0.2s ease-out, transform 0.2s ease-out'};
          }
          
          /* 确保容器有相对定位 */
          .home-background {
            position: relative;
          }
          
          @media (max-width: 768px) {
            .home-background::before {
              opacity: ${scrollOpacity * 0.8};
              filter: blur(${scrollBlur * 0.8}px);
            }
          }
          
          /* 确保在深色模式下也有适当的透明度 */
          html[data-theme='dark'] .home-background::before {
            opacity: ${scrollOpacity * 0.7};
          }
          
          /* 渐变遮罩，让文字更易读 - 绝对定位 */
          .home-background::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: linear-gradient(
              180deg,
              rgba(255, 255, 255, ${scrollOpacity * 0.3 * fadeInProgress}) 0%,
              rgba(255, 255, 255, ${scrollOpacity * 0.1 * fadeInProgress}) 50%,
              rgba(255, 255, 255, ${scrollOpacity * 0.3 * fadeInProgress}) 100%
            );
            z-index: -1;
            pointer-events: none;
            will-change: transform, opacity;
            transform: translateZ(0);
            transition: ${isAnimating ? 'none' : 'opacity 0.2s ease-out'};
          }
          
          html[data-theme='dark'] .home-background::after {
            background: linear-gradient(
              180deg,
              rgba(0, 0, 0, ${scrollOpacity * 0.4 * fadeInProgress}) 0%,
              rgba(0, 0, 0, ${scrollOpacity * 0.2 * fadeInProgress}) 50%,
              rgba(0, 0, 0, ${scrollOpacity * 0.4 * fadeInProgress}) 100%
            );
          }
          
          /* 减少动画对性能的影响 */
          @media (prefers-reduced-motion: reduce) {
            .home-background::before,
            .home-background::after {
              transition: none;
            }
          }
        `,
      }}
    />
  )
}
