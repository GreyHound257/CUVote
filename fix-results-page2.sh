#!/bin/bash
sed -i 's/<p className="text-sm text-muted-foreground">No candidates or votes calculated yet.<\/p>/<EmptyState title="No candidates or votes" description="There are no candidates or votes calculated for this position yet." \/>/g' src/app/elections/\[id\]/results/page.tsx
sed -i '3i import { EmptyState } from "@/components/shared/EmptyState";' src/app/elections/\[id\]/results/page.tsx
