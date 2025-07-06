# Jump Physics Formula Analysis

## Current Problem
- Variable Jump Boost and Max Fall Speed don't seem to affect jump behavior significantly
- Hard to achieve desired air time (1.5x) with reasonable height (70%)

## Physics Formulas

### Basic Jump Physics
- **Jump Height** = (v₀²) / (2g)
  - v₀ = initial velocity (jumpPower)
  - g = gravity

- **Air Time** = 2v₀ / g
  - Time to reach peak and fall back

### Current Values
- Original: g=0.65, v₀=10
- Current: g=0.433, v₀=6.83

### Calculations
Original:
- Height = 10² / (2 × 0.65) = 100 / 1.3 = 76.9 pixels
- Air Time = 2 × 10 / 0.65 = 30.77 frames

Current:
- Height = 6.83² / (2 × 0.433) = 46.65 / 0.866 = 53.9 pixels (70% of original)
- Air Time = 2 × 6.83 / 0.433 = 31.5 frames (102% of original)

## Problem Analysis
The issue is that to get 1.5x air time with 70% height:
- Need gravity = original_gravity / 1.5 = 0.433
- Need jumpPower = original_jumpPower × √(0.7 / 1.5) = 10 × √0.467 = 6.83

But this gives us only 102% air time, not 150%!

## Solution Options

### Option 1: Adjust the formula
To get exactly 1.5x air time with 70% height:
- g = 0.433 (for 1.5x time)
- v₀ = 10 × 0.7 × 0.75 = 5.25 (for 70% height with 1.5x time)

### Option 2: Use different gravity for up/down
- Lower gravity when going up (vy < 0)
- Normal gravity when falling (vy > 0)

### Option 3: Air resistance
- Add upward force proportional to -vy when falling
- This slows down the fall without affecting jump height

## Recommended Values for Testing
1. **For 1.5x air time, 70% height**:
   - Gravity: 0.433
   - Jump Power: 5.25
   - Variable Boost: 0.15

2. **For 2x air time, 50% height**:
   - Gravity: 0.325
   - Jump Power: 5.0
   - Variable Boost: 0.1