# Project Rules

## TypeScript Import Ordering

All TypeScript/TSX files must follow this import ordering convention:

### Order
1. **External package imports** — sorted alphabetically by module specifier
2. **Internal imports** — deeper paths first (more `../` segments = higher priority), then alphabetical

### Sub-ordering
- Within each group, **value imports** come before **type-only imports** (`import type`)
- **Style imports** (`.scss`, `.css`) are placed at the very end

### Formatting
- **No blank lines** between import statements
- **Exactly one blank line** between the last import and the rest of the code

### Example
```typescript
import { motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { formatTeamName } from '../../../utils/formatters';
import ProgressiveImage from '../../ui/ProgressiveImage';
import type { PhotoInput } from '../../../types';
import '../../../styles/_portfolio.scss';

const MyComponent = () => { ... };
```

### Enforcement
Run `.gemini/sort_imports.cjs` to auto-sort all imports project-wide.
