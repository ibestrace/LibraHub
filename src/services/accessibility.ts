// 无障碍性服务
// 提供键盘导航、屏幕阅读器支持等功能

class AccessibilityService {
  // 初始化无障碍性功能
  static init(): void {
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.setupHighContrastSupport();
    console.log('无障碍性服务初始化完成');
  }

  // 设置键盘导航
  private static setupKeyboardNavigation(): void {
    // 确保所有可交互元素都可以通过键盘访问
    document.addEventListener('keydown', (e) => {
      // 支持 ESC 键关闭模态框
      if (e.key === 'Escape') {
        const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (modal) {
          const closeButton = modal.querySelector('[aria-label="Close"]') || 
                           modal.querySelector('button[type="button"]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        }
      }
    });

    // 支持 Tab 键导航
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // 确保焦点在可见元素上
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (activeElement) {
            (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 0);
      }
    });
  }

  // 设置焦点管理
  private static setupFocusManagement(): void {
    // 为所有交互元素添加焦点样式
    const style = document.createElement('style');
    style.textContent = `
      *:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
      
      /* 高对比度模式焦点样式 */
      @media (prefers-contrast: high) {
        *:focus-visible {
          outline: 3px solid #000;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 设置屏幕阅读器支持
  private static setupScreenReaderSupport(): void {
    // 为动态内容添加 aria-live 区域
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'a11y-live-region';
    document.body.appendChild(liveRegion);
  }

  // 设置高对比度支持
  private static setupHighContrastSupport(): void {
    // 监听系统高对比度设置
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleContrastChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };

    // 初始检查
    handleContrastChange({ matches: mediaQuery.matches } as MediaQueryListEvent);
    
    // 监听变化
    mediaQuery.addEventListener('change', handleContrastChange);
  }

  // 发送屏幕阅读器通知
  static announce(message: string): void {
    const liveRegion = document.getElementById('a11y-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      // 清空内容以允许重复通知
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  // 检查无障碍性
  static audit(): void {
    // @ts-ignore - AxeCore 可能不存在于全局 window 对象上
    if (typeof window.AxeCore !== 'undefined') {
      // @ts-ignore - AxeCore 可能不存在于全局 window 对象上
      window.AxeCore.run(document, {
        rules: {
          'color-contrast': { enabled: true },
          'label': { enabled: true },
          'tabindex': { enabled: true },
          'aria-required-attr': { enabled: true }
        }
      }).then((results: any) => {
        if (results.violations.length > 0) {
          console.warn('无障碍性问题:', results.violations);
        } else {
          console.log('无障碍性检查通过');
        }
      });
    }
  }

  // 为元素添加无障碍性属性
  static enhanceElement(element: HTMLElement, options: {
    label?: string;
    description?: string;
    role?: string;
    state?: string;
  }): void {
    if (options.label) {
      element.setAttribute('aria-label', options.label);
    }
    if (options.description) {
      const descId = `desc-${Date.now()}`;
      const description = document.createElement('div');
      description.id = descId;
      description.className = 'sr-only';
      description.textContent = options.description;
      element.appendChild(description);
      element.setAttribute('aria-describedby', descId);
    }
    if (options.role) {
      element.setAttribute('role', options.role);
    }
    if (options.state) {
      element.setAttribute('aria-state', options.state);
    }
  }

  // 启用减少动画模式
  static setupReducedMotionSupport(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    // 初始检查
    handleMotionChange({ matches: mediaQuery.matches } as MediaQueryListEvent);
    
    // 监听变化
    mediaQuery.addEventListener('change', handleMotionChange);
  }
}

export { AccessibilityService };
