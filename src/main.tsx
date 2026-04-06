import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PrecacheService } from '@/services/precache'
import { ImageService } from '@/services/image'
import { AccessibilityService } from '@/services/accessibility'

// 预缓存数据
PrecacheService.precache().catch(console.error)

// 初始化图像懒加载
ImageService.initLazyLoading()

// 初始化无障碍性服务
AccessibilityService.init()
AccessibilityService.setupReducedMotionSupport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
