import { z } from "zod";

export const announcementAudienceSchema = z.enum([
  "EVERYONE",
  "STUDENTS",
  "ADMINS",
  "DEPARTMENT",
]);

export const announcementStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
    body: z.string().trim().min(10, "Body must be at least 10 characters").max(10000),
    audience: announcementAudienceSchema,
    departmentId: z.string().cuid().optional().nullable(),
    status: announcementStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.audience === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({
        code: "custom",
        message: "Department is required for department-scoped announcements",
        path: ["departmentId"],
      });
    }
  });

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(160).optional(),
    body: z.string().trim().min(10, "Body must be at least 10 characters").max(10000).optional(),
    audience: announcementAudienceSchema.optional(),
    departmentId: z.string().cuid().optional().nullable(),
    status: announcementStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.audience === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({
        code: "custom",
        message: "Department is required for department-scoped announcements",
        path: ["departmentId"],
      });
    }
  });

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
