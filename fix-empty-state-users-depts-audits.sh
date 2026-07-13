#!/bin/bash
# Re-add the import since we removed it in the script above
sed -i '3i import { EmptyState } from "@/components/shared/EmptyState";' src/app/users/page.tsx
sed -i '3i import { EmptyState } from "@/components/shared/EmptyState";' src/app/departments/page.tsx
sed -i '3i import { EmptyState } from "@/components/shared/EmptyState";' src/app/audit-logs/page.tsx
