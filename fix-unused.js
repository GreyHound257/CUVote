const fs = require('fs');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove unused EmptyState imports if they are not used in the file
  if (content.includes('import { EmptyState }') && !content.includes('<EmptyState')) {
    content = content.replace(/import \{ EmptyState \} from "@\/components\/shared\/EmptyState";\n?/g, '');
  }
  // Remove unused Sidebar import from TopNav
  if (filePath.includes('TopNav.tsx') && content.includes('import { Sidebar }')) {
    content = content.replace(/import \{ Sidebar \} from "\.\/Sidebar";\n?/g, '');
  }
  fs.writeFileSync(filePath, content);
};

const files = [
  'src/app/audit-logs/page.tsx',
  'src/app/departments/page.tsx',
  'src/app/elections/[id]/results/page.tsx',
  'src/app/elections/[id]/results/admin/page.tsx',
  'src/app/users/page.tsx',
  'src/components/layout/TopNav.tsx'
];

files.forEach(fixFile);
