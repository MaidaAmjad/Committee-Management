# Winner Selection System - Architecture Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Create          │  │  Winner          │  │  Committee       │  │
│  │  Committee       │  │  Management      │  │  Detail          │  │
│  │  Page            │  │  Page            │  │  Page            │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │              │
│           │  Select Method      │  Select Winner      │  View Info   │
│           ▼                     ▼                     ▼              │
└───────────────────────────────────────────────────────────────────────┘
            │                     │                     │
            │                     │                     │
┌───────────▼─────────────────────▼─────────────────────▼─────────────┐
│                        COMPONENT LAYER                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Winner          │  │  Winner Payment  │  │  Committee       │  │
│  │  Selection       │  │  Details         │  │  Announcement    │  │
│  │  Component       │  │  Component       │  │  Component       │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │              │
│           │  Emit Events        │  Display Data       │  Show List   │
│           ▼                     ▼                     ▼              │
└───────────────────────────────────────────────────────────────────────┘
            │                     │                     │
            │                     │                     │
┌───────────▼─────────────────────▼─────────────────────▼─────────────┐
│                         SERVICE LAYER                                 │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           WinnerSelectionService                              │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • getEligibleMembers()                                       │   │
│  │  • selectRandomWinner()                                       │   │
│  │  • selectManualWinner()                                       │   │
│  │  • getCurrentWinner()                                         │   │
│  │  • getAllWinners()                                            │   │
│  │  • getWinnerPaymentDetails()                                  │   │
│  │  • sendWinnerAnnouncement()                                   │   │
│  └────────┬─────────────────────────────────────────────────────┘   │
│           │                                                           │
│  ┌────────▼─────────────────────────────────────────────────────┐   │
│  │           CommitteeService                                    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • createCommittee() [with distribution_method]               │   │
│  │  • getCommitteeById()                                         │   │
│  │  • getCommitteeMembers()                                      │   │
│  │  • sendBroadcast()                                            │   │
│  └────────┬─────────────────────────────────────────────────────┘   │
│           │                                                           │
└───────────▼───────────────────────────────────────────────────────────┘
            │
            │  Supabase Client
            │
┌───────────▼───────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  committees      │  │  winner_         │  │  committee_      │  │
│  │                  │  │  selections      │  │  members         │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  │
│  │  id              │  │  id              │  │  id              │  │
│  │  name            │  │  committee_id ───┼──▶  committee_id    │  │
│  │  distribution_   │  │  member_id ──────┼──▶  user_id         │  │
│  │    method        │  │  member_name     │  │  full_name       │  │
│  │  monthly_amount  │  │  member_email    │  │  email           │  │
│  │  max_members     │  │  cycle_number    │  │  status          │  │
│  │  ...             │  │  selected_at     │  │  slot_type       │  │
│  └──────────────────┘  │  selection_      │  └──────────────────┘  │
│                        │    method        │                         │
│  ┌──────────────────┐  │  selected_by     │  ┌──────────────────┐  │
│  │  payment_        │  └──────────────────┘  │  committee_      │  │
│  │  methods         │                        │  messages        │  │
│  ├──────────────────┤                        ├──────────────────┤  │
│  │  user_id         │                        │  committee_id    │  │
│  │  jazzcash_       │                        │  sender_id       │  │
│  │    number        │                        │  sender_name     │  │
│  │  easypaisa_      │                        │  message         │  │
│  │    number        │                        │  created_at      │  │
│  │  bank_account_   │                        └──────────────────┘  │
│  │    number        │                                               │
│  │  primary_method  │                                               │
│  └──────────────────┘                                               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Helper Functions                                             │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • get_eligible_members(committee_id)                         │   │
│  │  • get_current_winner(committee_id)                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  RLS Policies                                                 │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • Members can view winners for their committees              │   │
│  │  • Only owners can insert winner selections                   │   │
│  │  • Payment details visible to committee members               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### Flow 1: Random Winner Selection

```
┌─────────────┐
│   Admin     │
│   Clicks    │
│  "Select    │
│   Random    │
│   Winner"   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionComponent            │
│  • Validates user is admin           │
│  • Calls selectRandomWinner()        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionService              │
│  • Gets eligible members             │
│  • Generates random index            │
│  • Selects random member             │
│  • Gets next cycle number            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database (Supabase)                 │
│  • Inserts winner_selections record  │
│  • Validates constraints             │
│  • Returns winner data               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionService              │
│  • Sends announcement broadcast      │
│  • Inserts committee_messages        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionComponent            │
│  • Emits winnerSelected event        │
│  • Shows success message             │
│  • Refreshes eligible members        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Parent Component                    │
│  • Updates current winner            │
│  • Displays payment details          │
│  • Shows announcement                │
└──────────────────────────────────────┘
```

### Flow 2: Manual Winner Selection

```
┌─────────────┐
│   Admin     │
│  Selects    │
│  Member     │
│   from      │
│  Dropdown   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionComponent            │
│  • Validates selection               │
│  • Calls selectManualWinner()        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionService              │
│  • Validates member is eligible      │
│  • Gets member details               │
│  • Gets next cycle number            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database (Supabase)                 │
│  • Inserts winner_selections record  │
│  • Validates constraints             │
│  • Returns winner data               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionService              │
│  • Sends announcement broadcast      │
│  • Inserts committee_messages        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionComponent            │
│  • Emits winnerSelected event        │
│  • Shows success message             │
│  • Resets dropdown                   │
│  • Refreshes eligible members        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Parent Component                    │
│  • Updates current winner            │
│  • Displays payment details          │
│  • Shows announcement                │
└──────────────────────────────────────┘
```

### Flow 3: Display Payment Details

```
┌─────────────┐
│   Winner    │
│  Selected   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerPaymentDetailsComponent       │
│  • Receives userId input             │
│  • Calls getWinnerPaymentDetails()   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerSelectionService              │
│  • Queries payment_methods table     │
│  • Filters by user_id                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database (Supabase)                 │
│  • Checks RLS policies               │
│  • Returns payment details           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  WinnerPaymentDetailsComponent       │
│  • Displays JazzCash number          │
│  • Displays Easypaisa number         │
│  • Displays Bank account details     │
│  • Highlights primary method         │
│  • Enables copy-to-clipboard         │
└──────────────────────────────────────┘
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 1: Authentication                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Supabase Auth                                     │    │
│  │  • JWT tokens                                        │    │
│  │  • User session management                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  Layer 2: Authorization                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Committee ownership verification                  │    │
│  │  • Member status checks (approved)                   │    │
│  │  • Admin-only operations                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  Layer 3: Row Level Security (RLS)                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Policy 1: Members can view winners                  │    │
│  │    WHERE committee_id IN (user's committees)         │    │
│  │                                                       │    │
│  │  Policy 2: Owners can insert winners                 │    │
│  │    WHERE committee_id IN (owned committees)          │    │
│  │                                                       │    │
│  │  Policy 3: Members can view payment details          │    │
│  │    WHERE user is committee member                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  Layer 4: Database Constraints                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • UNIQUE(committee_id, cycle_number)                │    │
│  │  • UNIQUE(committee_id, member_id)                   │    │
│  │  • CHECK(cycle_number > 0)                           │    │
│  │  • CHECK(distribution_method IN (...))               │    │
│  │  • Foreign key constraints                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  Layer 5: Business Logic Validation                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Eligible members only                             │    │
│  │  • No duplicate winners                              │    │
│  │  • Sequential cycle numbers                          │    │
│  │  • Approved members only                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Component Hierarchy

```
App Root
│
├── Sidebar
│
├── Topnav
│
└── Router Outlet
    │
    ├── CreateCommitteePage
    │   ├── Form with Distribution Method Selection
    │   └── Radio Buttons (Random | Manual)
    │
    ├── WinnerManagementPage
    │   ├── Committee Info Card
    │   ├── WinnerSelectionComponent
    │   │   ├── Random Selection UI
    │   │   └── Manual Selection UI
    │   ├── WinnerPaymentDetailsComponent
    │   │   ├── Primary Method Badge
    │   │   ├── JazzCash Card
    │   │   ├── Easypaisa Card
    │   │   └── Bank Account Card
    │   └── CommitteeAnnouncementComponent
    │       ├── Current Winner Card
    │       └── Winner History List
    │
    └── CommitteeDetailPage
        ├── Committee Info
        ├── Members List
        ├── WinnerSelectionComponent (if owner)
        ├── CommitteeAnnouncementComponent
        └── WinnerPaymentDetailsComponent (if winner exists)
```

## 🔄 State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL-BASED STATE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Component State (Signals)                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WinnerSelectionComponent                            │    │
│  │  • eligibleMembers = signal<EligibleMember[]>([])    │    │
│  │  • selectedMemberId = ''                             │    │
│  │  • loading = signal(false)                           │    │
│  │  • error = signal('')                                │    │
│  │  • success = signal(false)                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WinnerPaymentDetailsComponent                       │    │
│  │  • paymentDetails = signal<WinnerPaymentDetails>()   │    │
│  │  • loading = signal(true)                            │    │
│  │  • error = signal('')                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CommitteeAnnouncementComponent                      │    │
│  │  • currentWinner = signal<WinnerSelection | null>()  │    │
│  │  • allWinners = signal<WinnerSelection[]>([])        │    │
│  │  • loading = signal(true)                            │    │
│  │  • error = signal('')                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WinnerManagementPage                                │    │
│  │  • committee = signal<Committee | null>(null)        │    │
│  │  • currentWinner = signal<WinnerSelection | null>()  │    │
│  │  • loading = signal(true)                            │    │
│  │  • error = signal('')                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Design System

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN TOKENS                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Colors                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Primary:   #004ac6 (Blue)                           │    │
│  │  Secondary: #2563eb (Light Blue)                     │    │
│  │  Success:   #16a34a (Green)                          │    │
│  │  Warning:   #f59e0b (Amber)                          │    │
│  │  Error:     #ba1a1a (Red)                            │    │
│  │  Accent:    #ea580c (Orange)                         │    │
│  │  Gray:      #737686 (Text Gray)                      │    │
│  │  Border:    #c3c6d7 (Border Gray)                    │    │
│  │  Background:#f7f9fb (Light Gray)                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Typography                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Font Family: System UI, sans-serif                  │    │
│  │  Heading 1:   32px, bold                             │    │
│  │  Heading 2:   24px, bold                             │    │
│  │  Heading 3:   18px, bold                             │    │
│  │  Body:        14px, regular                          │    │
│  │  Small:       12px, regular                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Spacing                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  xs:  4px                                            │    │
│  │  sm:  8px                                            │    │
│  │  md:  16px                                           │    │
│  │  lg:  24px                                           │    │
│  │  xl:  32px                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Border Radius                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  sm:  8px                                            │    │
│  │  md:  12px                                           │    │
│  │  lg:  16px                                           │    │
│  │  xl:  20px                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Shadows                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  sm:  0 1px 2px rgba(0,0,0,0.05)                    │    │
│  │  md:  0 4px 6px rgba(0,0,0,0.1)                     │    │
│  │  lg:  0 10px 15px rgba(0,0,0,0.1)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

**This architecture provides:**
- ✅ Clear separation of concerns
- ✅ Scalable component structure
- ✅ Secure data access
- ✅ Efficient state management
- ✅ Consistent design system
- ✅ Maintainable codebase
