# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
```bash
# Development server
npm run dev

# Build project
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Testing
```bash
# Unit tests (Jest)
npm test

# End-to-end tests (Playwright)
npm run test:e2e

# Mobile-specific E2E tests
npm run test:mobile
```

### Agent-Specific Development
```bash
# Start individual agents on different ports
npm run agent1  # Foundation (3001)
npm run agent2  # Mobile Interface (3002)  
npm run agent3  # Business Features (3003)
npm run agent4  # Quality & Integration (3004)
```

### Checkpoint Validation
```bash
# Validate development checkpoints
npm run checkpoint:alpha    # 25% complete
npm run checkpoint:beta     # 50% complete
npm run checkpoint:gamma    # 75% complete
npm run checkpoint:delta    # 100% complete

# Integration command
npm run integrate
```

## Architecture Overview

ScanStock Pro uses a **4-agent parallel development architecture** with strict mobile-first design requirements:

### Agent Structure
- **Agent 1 (Foundation)**: Database, auth, API routes, real-time infrastructure
- **Agent 2 (Interface)**: Mobile-first PWA, camera, touch UI, offline capabilities  
- **Agent 3 (Features)**: AI recognition, inventory logic, analytics, integrations
- **Agent 4 (Quality)**: Testing, security, monitoring, billing, documentation

### Key Technologies
- **Framework**: Next.js 14 with TypeScript
- **Database**: Supabase (PostgreSQL with real-time)
- **Authentication**: Supabase Auth with JWT
- **AI**: OpenAI API (client-provided keys)
- **Mobile**: PWA with camera/barcode scanning
- **State**: Zustand for state management
- **Testing**: Jest (unit) + Playwright (E2E)
- **Styling**: Tailwind CSS

## Critical Design Requirements

### Mobile-First Mandate
- **95% of usage will be mobile devices**
- **One-handed operation** - all core features work with thumb only
- **Touch targets**: Minimum 44x44px for all interactive elements
- **Offline capable** - must work without internet connection
- **Performance**: Lighthouse score > 95 for mobile

### File Structure
```
src/
├── agent1-foundation/     # Database, auth, API
├── agent2-interface/      # Mobile UI, PWA, camera
├── agent3-features/       # Business logic, AI
├── agent4-quality/        # Tests, security, monitoring  
└── shared/                # Contracts, mocks, events
```

## Development Patterns

### Agent Communication
Uses event bus and shared state for coordination:
```typescript
import { eventBus } from '@/shared/events/event-bus';

// Broadcast to all agents
eventBus.broadcast('inventory:updated', { productId: '123' });

// Point-to-point communication  
eventBus.send('agent2', { type: 'camera:request' });
```

### Import Aliases
```typescript
// Agent-specific imports
import { auth } from '@/agent1/auth/supabase-auth';
import { BarcodeScanner } from '@/agent2/camera/BarcodeScanner';
import { aiService } from '@/agent3/ai-recognition/openai-service';
import { performanceMonitor } from '@/agent4/monitoring/performance-monitor';

// Shared imports
import { AgentInterfaces } from '@/shared/contracts/agent-interfaces';
```

### Environment Configuration
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# OpenAI (client-provided)
OPENAI_API_KEY=

# Stripe (for billing)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Testing Strategy

### Coverage Requirements
- **Unit tests**: > 80% overall coverage
- **E2E tests**: All critical user flows
- **Mobile tests**: Touch interactions, responsive design
- **Performance tests**: Load times, sync speeds

### Test Commands by Type
```bash
# All tests
npm test

# Specific agent tests  
AGENT=1 npm test  # Foundation
AGENT=2 npm test  # Interface
AGENT=3 npm test  # Features
AGENT=4 npm test  # Quality

# Mobile device simulation
npm run test:mobile
```

## Key Implementation Notes

### Mobile PWA Features
- Camera access for barcode scanning
- Service worker for offline functionality
- App-like installation experience
- Touch-optimized gestures and interactions

### Real-time Sync
- Supabase real-time subscriptions for live data
- Offline queue for disconnected operations
- Conflict resolution for concurrent changes

### AI Integration
- OpenAI API for product recognition from images
- Automatic categorization and description generation
- Client provides their own OpenAI API key

### Security Patterns
- Row Level Security (RLS) in Supabase
- Business data isolation
- Secure API key handling
- Role-based access control

## Development Workflow

### Conflict Resolution Priority
1. Agent 1 (Foundation) - Highest priority
2. Agent 3 (Features) - Second priority  
3. Agent 2 (Interface) - Third priority
4. Agent 4 (Quality) - Adapts to others

### Integration Rules
- Never break shared interfaces
- Update mocks before real implementations
- All tests must pass before integration
- Document changes in shared state

## Quality Gates

Before deployment, ensure:
- [ ] All checkpoint validations pass
- [ ] Mobile Lighthouse score > 95
- [ ] All E2E tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Offline functionality working