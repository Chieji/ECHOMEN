// Onboarding router procedures to add to server/routers.ts

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getOnboardingSession, updateUserOnboarding } from "./db";

export const onboardingRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const session = await getOnboardingSession(ctx.user.id);
    return {
      completed: ctx.user.onboardingCompleted === 1,
      currentStep: ctx.user.onboardingStep || 0,
      cliConnected: session?.cliConnected === 1 || false,
      firstAgentCreated: ctx.user.firstAgentCreated === 1,
      firstAgentId: session?.firstAgentId,
    };
  }),

  updateStep: protectedProcedure
    .input(z.object({ step: z.number().min(0).max(5) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserOnboarding(ctx.user.id, { onboardingStep: input.step });
      return { success: true };
    }),

  markCompleted: protectedProcedure.mutation(async ({ ctx }) => {
    await updateUserOnboarding(ctx.user.id, { onboardingCompleted: 1 });
    return { success: true };
  }),

  checkCliStatus: protectedProcedure.query(async ({ ctx }) => {
    const session = await getOnboardingSession(ctx.user.id);
    return { connected: session?.cliConnected === 1 || false };
  }),

  setCliConnected: protectedProcedure
    .input(z.object({ connected: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await updateOnboardingSession(ctx.user.id, { cliConnected: input.connected ? 1 : 0 });
      return { success: true };
    }),

  setFirstAgent: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await updateUserOnboarding(ctx.user.id, { firstAgentCreated: 1 });
      await updateOnboardingSession(ctx.user.id, { firstAgentId: input.agentId });
      return { success: true };
    }),
});
