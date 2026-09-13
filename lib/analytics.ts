// Google Analytics event tracking helper
export const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData || {})
  }
}

// Specific user journey events
export const analytics = {
  // Form events
  formStarted: (formType: string) => trackEvent('form_started', { form_type: formType }),
  formSubmitted: (formType: string) => trackEvent('form_submitted', { form_type: formType }),
  formAbandoned: (formType: string, step: string) => trackEvent('form_abandoned', { form_type: formType, step }),

  // User actions
  userLogin: (method: string) => trackEvent('user_login', { method }),
  userSignup: () => trackEvent('user_signup', {}),
  capsulePublished: () => trackEvent('capsule_published', {}),
  capsuleViewed: (capsuleId: string) => trackEvent('capsule_viewed', { capsule_id: capsuleId }),
  itemClicked: (itemName: string) => trackEvent('item_clicked', { item_name: itemName }),

  // Navigation
  pageViewed: (pageName: string) => trackEvent('page_view', { page_name: pageName }),
  clickButton: (buttonName: string) => trackEvent('button_clicked', { button_name: buttonName }),
  clickLink: (linkName: string) => trackEvent('link_clicked', { link_name: linkName }),

  // E-commerce-like
  checkoutStarted: (budget: number) => trackEvent('checkout_started', { budget }),
  checkoutCompleted: (amount: number) => trackEvent('checkout_completed', { value: amount, currency: 'RON' }),
  checkoutAbandoned: (step: string) => trackEvent('checkout_abandoned', { step }),
}
