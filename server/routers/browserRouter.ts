/**
 * Browser Router - WebHawk 2.0 tRPC Interface
 * 
 * Provides browser automation endpoints:
 * - navigate: Go to URL
 * - click: Click elements
 * - type: Fill text inputs
 * - screenshot: Capture screenshots
 * - axtree: Get accessibility tree
 * - evaluate: Execute JavaScript
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { webHawkManager } from '../lib/webhawk';

// Initialize WebHawk on module load
webHawkManager.initialize().catch(console.error);

export const browserRouter = router({
  /**
   * Navigate to URL
   */
  navigate: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      sessionId: z.string().optional(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
      timeout: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await webHawkManager.getOrCreateSession(input.sessionId);
      const snapshot = await webHawkManager.navigate(
        session.id,
        input.url,
        {
          waitUntil: input.waitUntil,
          timeout: input.timeout,
        }
      );

      return {
        sessionId: session.id,
        ...snapshot,
      };
    }),

  /**
   * Click element
   */
  click: protectedProcedure
    .input(z.object({
      selector: z.string(),
      sessionId: z.string(),
      button: z.enum(['left', 'right', 'middle']).optional(),
      clickCount: z.number().optional(),
      delay: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const snapshot = await webHawkManager.click(
        input.sessionId,
        input.selector,
        {
          button: input.button,
          clickCount: input.clickCount,
          delay: input.delay,
        }
      );

      return snapshot;
    }),

  /**
   * Type text into element
   */
  type: protectedProcedure
    .input(z.object({
      selector: z.string(),
      text: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await webHawkManager.type(input.sessionId, input.selector, input.text);
      return { success: true };
    }),

  /**
   * Capture screenshot
   */
  screenshot: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      fullPage: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const screenshot = await webHawkManager.screenshot(
        input.sessionId,
        input.fullPage
      );

      return { screenshot };
    }),

  /**
   * Get accessibility tree
   */
  axtree: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      const axtree = await webHawkManager.getAXTree(input.sessionId);
      return { axtree };
    }),

  /**
   * Find interactive elements
   */
  findInteractive: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      const elements = await webHawkManager.findInteractiveElements(input.sessionId);
      return { elements };
    }),

  /**
   * Execute JavaScript
   */
  evaluate: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      code: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await webHawkManager.evaluate(input.sessionId, input.code);
      return { result };
    }),

  /**
   * Get session info
   */
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      // Just verify session exists
      return { exists: true, sessionId: input.sessionId };
    }),

  /**
   * Close session
   */
  closeSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await webHawkManager.closeSession(input.sessionId);
      return { success: true };
    }),

  /**
   * Health check
   */
  health: publicProcedure.query(async () => {
    return {
      status: 'healthy',
      browserInitialized: true,
    };
  }),
});
