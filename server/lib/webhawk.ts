/**
 * WebHawk 2.0 - Browser Automation for ECHO
 * 
 * Ported from ECHOMEN with enhancements:
 * - Playwright-based browser automation
 * - AXTree (Accessibility Tree) navigation
 * - Screenshot capture with vision analysis
 * - Persistent sessions for login state
 * - Multi-step web task orchestration
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';

export interface WebHawkSession {
  id: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastUsed: number;
  url?: string;
}

export interface BrowserSnapshot {
  screenshot: string; // base64
  axtree: any; // Accessibility tree
  url: string;
  title: string;
  timestamp: number;
}

export interface AXTreeNode {
  role: string;
  name?: string;
  value?: string;
  children?: AXTreeNode[];
  selector?: string;
}

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

/**
 * WebHawk Session Manager
 * 
 * Manages browser sessions with persistent contexts
 */
export class WebHawkManager {
  private browser: Browser | null = null;
  private sessions: Map<string, WebHawkSession> = new Map();
  private maxSessions: number = 10;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  constructor() {}

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
  }

  /**
   * Get or create session
   */
  async getOrCreateSession(sessionId?: string): Promise<WebHawkSession> {
    if (!this.browser) {
      await this.initialize();
    }

    // Return existing session
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastUsed = Date.now();
      return session;
    }

    // Create new session
    if (this.sessions.size >= this.maxSessions) {
      await this.cleanupOldSessions();
    }

    const context = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    
    const session: WebHawkSession = {
      id: sessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      context,
      page,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Navigate to URL
   */
  async navigate(sessionId: string, url: string, options?: NavigateOptions): Promise<BrowserSnapshot> {
    const session = await this.getOrCreateSession(sessionId);
    
    await session.page.goto(url, {
      waitUntil: options?.waitUntil ?? 'networkidle',
      timeout: options?.timeout ?? 30000,
    });

    session.url = url;
    session.lastUsed = Date.now();

    return this.captureSnapshot(session);
  }

  /**
   * Click element
   */
  async click(sessionId: string, selector: string, options?: ClickOptions): Promise<BrowserSnapshot> {
    const session = await this.getOrCreateSession(sessionId);
    
    await session.page.click(selector, {
      button: options?.button ?? 'left',
      clickCount: options?.clickCount ?? 1,
      delay: options?.delay ?? 0,
    });

    // Wait for navigation if triggered
    try {
      await session.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Ignore timeout - page may not have navigated
    }

    session.lastUsed = Date.now();
    return this.captureSnapshot(session);
  }

  /**
   * Type text into element
   */
  async type(sessionId: string, selector: string, text: string): Promise<void> {
    const session = await this.getOrCreateSession(sessionId);
    await session.page.fill(selector, text);
    session.lastUsed = Date.now();
  }

  /**
   * Get accessibility tree
   */
  async getAXTree(sessionId: string): Promise<AXTreeNode> {
    const session = await this.getOrCreateSession(sessionId);
    
    // Use evaluate to get accessibility info since accessibility API may not be available
    const axtree = await session.page.evaluate(() => {
      // Get main content structure
      const main = document.querySelector('main') || document.body;
      
      const extractElement = (el: Element): any => {
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        const name = el.getAttribute('aria-label') || 
                    el.getAttribute('title') || 
                    el.textContent?.trim().slice(0, 50);
        
        const node: any = {
          role,
          name: name || undefined,
        };
        
        const children = Array.from(el.children)
          .filter(child => {
            const tag = child.tagName.toLowerCase();
            return ['a', 'button', 'input', 'select', 'textarea', 'div', 'span', 'nav', 'main', 'section', 'article', 'header', 'footer'].includes(tag);
          })
          .slice(0, 20) // Limit children
          .map(extractElement);
        
        if (children.length > 0) {
          node.children = children;
        }
        
        return node;
      };
      
      return extractElement(main);
    });

    return axtree as AXTreeNode;
  }

  /**
   * Capture screenshot
   */
  async screenshot(sessionId: string, fullPage: boolean = false): Promise<string> {
    const session = await this.getOrCreateSession(sessionId);
    
    const screenshot = await session.page.screenshot({
      fullPage,
      type: 'png',
    });

    // Convert Buffer to base64 string
    return screenshot.toString('base64');
  }

  /**
   * Capture full snapshot (screenshot + axtree)
   */
  async captureSnapshot(session: WebHawkSession): Promise<BrowserSnapshot> {
    const [screenshot, axtree] = await Promise.all([
      this.screenshot(session.id),
      this.getAXTree(session.id),
    ]);

    return {
      screenshot,
      axtree,
      url: session.page.url(),
      title: await session.page.title(),
      timestamp: Date.now(),
    };
  }

  /**
   * Process AXTree into usable format
   */
  private processAXTree(node: any, parentSelector?: string): AXTreeNode {
    if (!node) {
      return { role: 'unknown' };
    }

    // Generate selector if possible
    let selector = parentSelector;
    if (node.selector && typeof node.selector === 'string') {
      selector = node.selector;
    }

    const result: AXTreeNode = {
      role: node.role?.toLowerCase() || 'unknown',
      name: node.name,
      value: node.value,
      selector,
    };

    if (node.children && Array.isArray(node.children)) {
      result.children = node.children
        .filter((child: any) => child.role !== 'StaticText')
        .map((child: any) => this.processAXTree(child, selector));
    }

    return result;
  }

  /**
   * Find interactive elements
   */
  async findInteractiveElements(sessionId: string): Promise<Array<{
    selector: string;
    role: string;
    name?: string;
    type?: string;
  }>> {
    const session = await this.getOrCreateSession(sessionId);
    
    const elements = await session.page.evaluate(() => {
      const interactiveSelectors = [
        'a[href]',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[onclick]',
      ];

      const elements: Array<{ selector: string; role: string; name?: string; type?: string }> = [];
      
      interactiveSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el: any) => {
          elements.push({
            selector: el.getAttribute('data-testid') || 
                     el.id ? `#${el.id}` : 
                     el.className ? `.${el.className.split(' ').join('.')}` : 
                     selector,
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            name: el.textContent?.trim().slice(0, 100) || 
                  el.getAttribute('aria-label') ||
                  el.getAttribute('title'),
            type: el.type,
          });
        });
      });

      return elements;
    });

    return elements;
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T = any>(sessionId: string, pageFunction: string | ((...args: any[]) => T)): Promise<T> {
    const session = await this.getOrCreateSession(sessionId);
    
    if (typeof pageFunction === 'string') {
      return session.page.evaluate(pageFunction);
    }
    
    return session.page.evaluate(pageFunction);
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.context.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Cleanup old sessions
   */
  private async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    this.sessions.forEach((session, id) => {
      if (now - session.lastUsed > this.sessionTimeout) {
        toDelete.push(id);
      }
    });

    for (const id of toDelete) {
      await this.closeSession(id);
    }
  }

  /**
   * Close all sessions and browser
   */
  async close(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.closeSession(id);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export singleton instance
export const webHawkManager = new WebHawkManager();
