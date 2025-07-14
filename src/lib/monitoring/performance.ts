import * as Sentry from '@sentry/nextjs';
import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Initialize performance monitoring
  init() {
    if (typeof window === 'undefined') return;

    this.observeWebVitals();
    this.observeResourceTiming();
    this.observeNavigationTiming();
  }

  // Monitor Core Web Vitals
  private observeWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      this.reportMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName || 'unknown',
        url: lastEntry.url || window.location.href,
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.reportMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target?.tagName || 'unknown',
        });
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.reportMetric('CLS', clsValue);
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  // Monitor resource loading times
  private observeResourceTiming() {
    if (!('PerformanceObserver' in window)) return;

    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        // Only monitor critical resources
        if (entry.initiatorType === 'script' || 
            entry.initiatorType === 'css' || 
            entry.initiatorType === 'img') {
          
          const duration = entry.responseEnd - entry.startTime;
          
          // Report slow resources (> 1 second)
          if (duration > 1000) {
            this.reportMetric('Slow Resource', duration, {
              type: entry.initiatorType,
              name: entry.name,
              size: entry.transferSize || 0,
            });
          }
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      console.warn('Resource observer not supported');
    }
  }

  // Monitor navigation timing
  private observeNavigationTiming() {
    if (!('PerformanceObserver' in window)) return;

    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const metrics = {
          'DNS Lookup': entry.domainLookupEnd - entry.domainLookupStart,
          'TCP Connection': entry.connectEnd - entry.connectStart,
          'Request': entry.responseStart - entry.requestStart,
          'Response': entry.responseEnd - entry.responseStart,
          'DOM Processing': entry.domComplete - entry.responseEnd,
          'Total Load Time': entry.loadEventEnd - entry.navigationStart,
        };

        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            this.reportMetric(`Navigation: ${name}`, value);
          }
        });
      });
    });

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    } catch (e) {
      console.warn('Navigation observer not supported');
    }
  }

  // Report metric to monitoring service
  private reportMetric(name: string, value: number, tags?: Record<string, any>) {
    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${Math.round(value)}ms`,
      level: 'info',
      data: {
        metric: name,
        value: Math.round(value),
        ...tags,
      },
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${Math.round(value)}ms`, tags);
    }

    // Report to analytics service (could be Google Analytics, custom endpoint, etc.)
    this.reportToAnalytics(name, value, tags);
  }

  // Report to analytics service
  private reportToAnalytics(name: string, value: number, tags?: Record<string, any>) {
    // This could be implemented to send to your analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name: name,
        value: Math.round(value),
        ...tags,
      });
    }
  }

  // Manual timing functions
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.reportMetric(`Custom: ${name}`, duration);
    };
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const endTiming = this.startTiming(name);
    try {
      const result = fn();
      endTiming();
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTiming = this.startTiming(name);
    try {
      const result = await fn();
      endTiming();
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  }

  // Clean up observers
  destroy() {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  React.useEffect(() => {
    performanceMonitor.init();
    
    return () => {
      performanceMonitor.destroy();
    };
  }, []);

  return {
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureAsyncFunction: performanceMonitor.measureAsyncFunction.bind(performanceMonitor),
  };
}

// Higher-order component for page performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string
) {
  const WrappedComponent = (props: P) => {
    React.useEffect(() => {
      const endTiming = performanceMonitor.startTiming(`Page Render: ${pageName}`);
      return endTiming;
    }, []);

    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 