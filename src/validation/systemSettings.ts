import { z } from "zod";

export const SYSTEM_SETTING_KEYS = {
  LIVE_RESULTS_ENABLED: "liveResultsEnabled",
} as const;

export const updateSystemSettingsSchema = z.object({
  liveResultsEnabled: z.boolean(),
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;

export type SystemSettings = {
  liveResultsEnabled: boolean;
};
