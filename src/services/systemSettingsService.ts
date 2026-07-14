import { prisma } from "@/lib/prisma";
import {
  SYSTEM_SETTING_KEYS,
  SystemSettings,
  UpdateSystemSettingsInput,
} from "@/validation/systemSettings";

const DEFAULTS: SystemSettings = {
  liveResultsEnabled: true,
};

export class SystemSettingsService {
  static async getSettings(): Promise<SystemSettings> {
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: { in: Object.values(SYSTEM_SETTING_KEYS) },
      },
    });

    const map = new Map(rows.map((r) => [r.key, r.value]));
    const live = map.get(SYSTEM_SETTING_KEYS.LIVE_RESULTS_ENABLED);

    return {
      liveResultsEnabled:
        typeof live === "boolean" ? live : DEFAULTS.liveResultsEnabled,
    };
  }

  static async isLiveResultsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.liveResultsEnabled;
  }

  static async updateSettings(
    data: UpdateSystemSettingsInput,
    userId: string
  ): Promise<SystemSettings> {
    await prisma.systemSetting.upsert({
      where: { key: SYSTEM_SETTING_KEYS.LIVE_RESULTS_ENABLED },
      create: {
        key: SYSTEM_SETTING_KEYS.LIVE_RESULTS_ENABLED,
        value: data.liveResultsEnabled,
        updatedBy: userId,
      },
      update: {
        value: data.liveResultsEnabled,
        updatedBy: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SYSTEM_SETTINGS_UPDATED",
        entity: "SystemSetting",
        entityId: SYSTEM_SETTING_KEYS.LIVE_RESULTS_ENABLED,
        details: `liveResultsEnabled set to ${data.liveResultsEnabled}`,
      },
    });

    return this.getSettings();
  }
}
