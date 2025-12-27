# Group Ride & Live Tracking App - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required** - Multi-user social app with data sync and group features.

**Implementation:**
- **SSO Login Flow:**
  - Apple Sign-In (required for iOS)
  - Google Sign-In (for Android/cross-platform)
  - Phone number authentication as alternative
- **Onboarding After SSO:**
  - Profile completion screen (Name, Age, Vehicle Name, Vehicle Number)
  - Optional profile picture upload or avatar selection
- **Account Management:**
  - Settings > Account section with:
    - Edit profile
    - Log out (with confirmation alert)
    - Delete account (nested: Settings > Account > Delete Account with double confirmation)
    - Privacy policy & terms links

### Navigation Architecture
**Hybrid Navigation:**
- **Pre-Ride State:** Tab Navigation (4 tabs + FAB)
  - Home (discover/upcoming rides)
  - My Rides (ride history)
  - Profile
  - Notifications
  - Floating Action Button: "Create Ride" (primary action)
- **During Active Ride:** Full-screen modal stack
  - Replaces entire UI until ride ends
  - Back navigation disabled to prevent accidental exit
  - "End Ride" requires confirmation

## Screen Specifications

### 1. Home Screen (Tab 1)
**Purpose:** Discover nearby ride groups and view upcoming rides.

**Layout:**
- **Header:** Transparent, no title
  - Right: Settings icon button
  - Top inset: `headerHeight + Spacing.xl`
- **Content:** Scrollable list
  - Section 1: "Upcoming Rides" horizontal scroll cards
  - Section 2: "Suggested Rides" vertical list
  - Empty state: "No rides available. Create your first ride!"
- **Safe Area:** Bottom: `tabBarHeight + Spacing.xl`

**Components:**
- Ride preview cards showing: destination, start time, rider count
- Pull-to-refresh

### 2. Create Ride Screen (Modal from FAB)
**Purpose:** Set up a new ride group.

**Layout:**
- **Header:** Default navigation header, non-transparent
  - Title: "Create Ride"
  - Left: Cancel button
  - Right: None (submit button below form)
  - Top inset: `Spacing.xl`
- **Content:** Scrollable form
  - Source location (auto-detect current location + manual input)
  - Destination (search + map picker)
  - Optional waypoints (add multiple)
  - Departure time picker
  - Submit button: "Create & Share QR Code"
- **Safe Area:** Bottom: `insets.bottom + Spacing.xl`

### 3. QR Code Share Screen (Stack within Create flow)
**Purpose:** Display and share ride QR code.

**Layout:**
- **Header:** Default, non-transparent
  - Title: "Invite Riders"
  - Left: Back arrow
  - Top inset: `Spacing.xl`
- **Content:** Centered, non-scrollable
  - Large QR code (60% screen width)
  - Ride summary: source → destination
  - "Share QR" button (native share sheet)
  - "Start Ride" button (primary, appears when ≥1 rider joins)
- **Safe Area:** Bottom: `insets.bottom + Spacing.xl`

### 4. Join Ride via QR (Modal)
**Purpose:** Scan QR to join a group.

**Layout:**
- **Header:** Transparent
  - Left: Close button (X icon)
  - Top inset: `headerHeight + Spacing.xl`
- **Content:** Full-screen camera view
  - Center: Scan frame overlay
  - Bottom card: "Position QR code within frame"
- **Safe Area:** Bottom: `insets.bottom + Spacing.xl`

### 5. Active Ride Map (Full-screen modal)
**Purpose:** Live tracking of all riders during ride.

**Layout:**
- **Header:** Transparent, overlays map
  - Title: "Ride in Progress"
  - Left: None
  - Right: End Ride button (text-based, subtle)
  - Top inset: `headerHeight + Spacing.xl`
- **Content:** Full-screen map
  - Real-time rider markers (custom icons with vehicle info)
  - Route polyline (source → waypoints → destination)
  - User's location: distinct pulsing marker
- **Floating Elements:**
  - Bottom sheet (draggable):
    - Collapsed: Rider count, distance to destination
    - Expanded: List of all riders with profile previews
  - SOS button (bottom-right corner, red, floating with drop shadow)
    - shadowOffset: {width: 0, height: 2}
    - shadowOpacity: 0.10
    - shadowRadius: 2
  - Chat button (bottom-left corner, floating with drop shadow)
- **Safe Area:** Floating buttons: `insets.bottom + Spacing.xl` from bottom

**Interactions:**
- Tap rider marker → Show profile card modal
- Long-press map → Add waypoint (if ride creator)

### 6. Group Chat (Modal over Active Ride)
**Purpose:** Real-time communication during ride.

**Layout:**
- **Header:** Default, semi-transparent blur
  - Title: "Group Chat"
  - Left: Back arrow
  - Top inset: `Spacing.xl`
- **Content:** Message list (inverted scroll)
  - Message bubbles: sender name, vehicle number, timestamp
  - Input bar anchored to bottom with keyboard
- **Safe Area:** Top: `Spacing.xl`, Bottom: keyboard height + `Spacing.md`

### 7. SOS Alert (Modal)
**Purpose:** Emergency broadcast to group and emergency contacts.

**Layout:**
- **Header:** None
- **Content:** Centered modal (80% screen width)
  - Alert icon (red exclamation)
  - "Send SOS Alert?"
  - Subtitle: "Your location will be shared with all riders and emergency services"
  - Confirm button: "Send SOS" (large, red)
  - Cancel button: "Cancel" (secondary)
- **Background:** Dimmed overlay (60% opacity)

### 8. Profile Screen (Tab 3)
**Purpose:** View and edit user profile.

**Layout:**
- **Header:** Transparent
  - Title: "Profile"
  - Right: Edit button
  - Top inset: `headerHeight + Spacing.xl`
- **Content:** Scrollable
  - Avatar (tappable to change)
  - Name, Age, Vehicle info cards
  - Ride stats: Total rides, Total distance
  - Settings section (link to settings screen)
- **Safe Area:** Bottom: `tabBarHeight + Spacing.xl`

### 9. Ride History (Tab 2)
**Purpose:** View past rides.

**Layout:**
- **Header:** Transparent
  - Title: "My Rides"
  - Right: Filter icon
  - Search bar (collapsible)
  - Top inset: `headerHeight + Spacing.xl`
- **Content:** List (scrollable)
  - Past ride cards: date, route, riders count
  - Empty state: "No ride history yet"
- **Safe Area:** Bottom: `tabBarHeight + Spacing.xl`

## Design System

### Color Palette
**Primary:**
- Brand: `#2563EB` (vibrant blue, trust & navigation)
- Brand Dark: `#1E40AF`
- Accent: `#10B981` (green, active ride status)
- Danger: `#EF4444` (SOS button)

**Neutrals:**
- Background: `#FFFFFF`
- Surface: `#F9FAFB`
- Border: `#E5E7EB`
- Text Primary: `#111827`
- Text Secondary: `#6B7280`

**Map Overlays:**
- User marker: `#2563EB` with pulsing animation
- Other riders: `#8B5CF6` (purple)
- Route line: `#2563EB`, 4px width, 60% opacity

### Typography
- **Headers:** SF Pro Display (iOS) / Roboto (Android), Bold, 24-28px
- **Body:** SF Pro Text / Roboto, Regular, 16px
- **Captions:** SF Pro Text / Roboto, Medium, 14px, #6B7280

### Component Styling
**Ride Cards:**
- Background: White
- Border radius: 12px
- Padding: 16px
- Drop shadow: None, use 1px border `#E5E7EB`
- Press feedback: Scale 0.98, opacity 0.7

**Floating Action Button (Create Ride):**
- Size: 56x56px
- Background: `#2563EB`
- Icon: Plus (white, 24px)
- Drop shadow (EXACT):
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Press: Scale 0.95

**Tab Bar:**
- Background: White with subtle top border
- Active icon: `#2563EB`
- Inactive icon: `#9CA3AF`
- Height: 60px (iOS), 56px (Android)

**SOS Button:**
- Size: 64x64px
- Background: `#EF4444`
- Icon: Alert Triangle (white, Feather icons)
- Pulse animation when ride active
- Drop shadow (same as FAB)

## Required Assets

### Generated Assets (Critical)
1. **Rider Avatar Set (6 variations):**
   - Motorcycle helmet illustrations (different colors)
   - Style: Minimalist, flat design
   - Format: SVG or PNG (transparent background)
   - Size: 200x200px

2. **Vehicle Type Icons (3 types):**
   - Motorcycle, Scooter, Bicycle
   - Style: Line art, 2px stroke
   - Color: Single-color, tintable
   - Format: SVG

3. **Map Markers:**
   - User location (custom pulsing blue dot)
   - Rider markers (vehicle icon with colored ring)
   - Waypoint pins (numbered)

### System Icons (Feather Icons)
- Navigation: `navigation`, `map-pin`, `home`, `user`, `bell`
- Actions: `plus`, `share-2`, `send`, `message-circle`
- SOS: `alert-triangle`
- Settings: `settings`, `edit-2`, `log-out`, `trash-2`
- Map: `maximize`, `layers`

### Accessibility
- All interactive elements minimum 44x44pt touch target
- VoiceOver labels for all icons and map markers
- High contrast mode support (increase border weights to 2px)
- SOS button accessible via screen reader gesture shortcut
- Live location announcements for VoiceOver users (every 30 seconds during ride)