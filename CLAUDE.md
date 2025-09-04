# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview
```

## 🗄️ Database Tools for Claude Code Agents

### SQL Direct Access Tool
**Location**: `tools/sql-direct.js`  
**Purpose**: Прямой доступ к базе данных Supabase для всех агентов

```bash
# Quick database diagnostics
node tools/sql-direct.js tables                    # List all tables
node tools/sql-direct.js describe equipment_templates  # Table structure  
node tools/sql-direct.js select equipment_templates    # Sample data

# Integration in code
import { executeSelect, describeTable } from './tools/sql-direct.js';
```

**Key Database Facts**:
- ✅ **Schema**: Uses `is_active` (boolean), NOT `status` (string)
- ✅ **IDs**: All UUIDs, not strings 
- ✅ **Access**: Service Role Key for development (full access)
- ✅ **Tables**: 8 main tables available (equipment_templates, equipment, networks, etc.)

See `tools/README.md` for complete documentation.

## Architecture Overview

This is a React-based trading platform UI built with:
- **Vite** - Build tool and dev server
- **React 18** with TypeScript
- **React Router v6** - Routing with pages in `src/pages/`
- **shadcn/ui components** - UI components in `src/components/ui/`
- **Tailwind CSS** - Styling with custom trade platform colors
- **React Query (TanStack Query)** - Data fetching and caching
- **React Hook Form + Zod** - Form handling and validation

## Project Structure

### Key Directories
- `src/pages/` - Route components mapped in App.tsx
- `src/components/` - Reusable components organized by feature
- `src/services/` - API clients and service layer
- `src/contexts/` - React contexts (Auth, Selection)
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions

### Routing Pattern
All routes are defined in `src/App.tsx`:
- Admin routes: `/admin/*`
- Settings routes: `/settings/*`
- Network routes: `/network/*`
- Point routes: `/point/*`

### API Integration
- HTTP clients in `src/services/httpClients.ts` with full auth support
- Mock services available for development
- API base URL configured via `VITE_API_URL` env variable
- Automatic auth token handling from localStorage/sessionStorage

## Component Patterns

### UI Components
- All UI primitives from shadcn/ui in `src/components/ui/`
- Follow existing patterns when creating new components
- Use CVA (class-variance-authority) for component variants
- Leverage Tailwind utility classes with `cn()` helper

### Form Components
- Use React Hook Form with Zod schemas
- Form components use the `<Form>` wrapper from `src/components/ui/form.tsx`
- Validation schemas should be defined with Zod

### Data Fetching
- Use React Query hooks for API calls
- Services layer handles HTTP requests
- Loading states handled with Skeleton components
- Error states use ErrorState/EmptyState components

## TypeScript Configuration

- Path alias `@/*` maps to `./src/*`
- Relaxed TypeScript settings (no implicit any, unused params allowed)
- Type definitions should be in `src/types/`

## Styling Conventions

- Tailwind CSS for all styling
- Custom theme colors: trade.blue, trade.purple, trade.green, trade.orange
- Status colors: success, warning, error
- Container width set to 100% with 1.5rem padding
- Use existing shadow and border radius variables

## Important Notes

- This is a Lovable.dev project with automatic Git sync
- Component tagger active in development mode
- Supports PM2 deployment with `ecosystem.config.js`
- Express server available for production deployment