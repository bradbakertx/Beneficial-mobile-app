# Signature Pad Render Error Fix

## Problem
The native signature pad on `agreement.tsx` was causing a "Render Error" on Android after signing. The signature was being saved successfully to the backend, but the frontend crashed during re-render due to `useLocalSearchParams()` context issues.

## Root Cause
When the native signature pad's `onOK` callback fired, it immediately updated the component state through `handleSignature`, which triggered a re-render. During this re-render, the `useLocalSearchParams()` hook was being called again in an unstable navigation context, causing the component to crash.

## Solution Implemented

### 1. Stable Parameter Storage (agreement.tsx)
- Changed from using state (`useState`) to using a ref (`useRef`) for storing the inspection ID
- Parameters are now extracted once on mount and stored in `inspectionId.current`
- This prevents re-reading params during re-renders, avoiding navigation context issues

```typescript
// Before:
const [id, setId] = useState<string>('');
useEffect(() => {
  const params = useLocalSearchParams();
  const extractedId = Array.isArray(params.id) ? params.id[0] : params.id;
  if (extractedId) {
    setId(extractedId);
  }
}, []);

// After:
const params = useLocalSearchParams();
const inspectionId = useRef<string>('');
useEffect(() => {
  const extractedId = Array.isArray(params.id) ? params.id[0] : params.id;
  if (extractedId && typeof extractedId === 'string') {
    inspectionId.current = extractedId;
    fetchAgreement();
  }
}, []);
```

### 2. Batched State Updates (agreement.tsx)
- Used `useCallback` to memoize the `handleSignature` function
- Wrapped state updates in `setTimeout(..., 0)` to batch them and avoid synchronous re-render issues
- This ensures React can process the updates in a controlled manner

```typescript
// Before:
const handleSignature = (signature: string) => {
  setSignature(signature);
  setShowSignaturePad(false);
};

// After:
const handleSignature = useCallback((signatureData: string) => {
  console.log('handleSignature called with data length:', signatureData.length);
  setTimeout(() => {
    setSignature(signatureData);
    setShowSignaturePad(false);
  }, 0);
}, []);
```

### 3. Prevent Duplicate Signature Callbacks (SignaturePad.tsx)
- Added guards to prevent calling `onEnd` multiple times with the same signature
- Check if signature has already been captured before processing
- This prevents cascading re-renders from duplicate callbacks

```typescript
// Before:
const handleNativeOK = (signature: string) => {
  console.log('Native signature captured:', signature.substring(0, 50) + '...');
  setNativeSignature(signature);
  onEnd(signature);
};

// After:
const handleNativeOK = (signature: string) => {
  console.log('Native signature captured:', signature.substring(0, 50) + '...');
  if (signature && signature !== nativeSignature) {
    setNativeSignature(signature);
    onEnd(signature);
  }
};
```

### 4. Navigation Improvement
- Changed from `router.replace()` to `router.push()` for better navigation stability
- This preserves the navigation stack and prevents context loss

## Files Modified
- `/app/frontend/app/inspections/agreement.tsx` - Parameter handling, state batching
- `/app/frontend/components/SignaturePad.tsx` - Duplicate callback prevention

## Testing Notes
- Backend successfully receives and saves signatures (confirmed in previous testing)
- Frontend should now handle signature capture without crashes
- Navigation to agent-info screen should proceed smoothly after signing
- Test on both Android and iOS to verify native signature pad behavior

## Expected Behavior
1. User opens agreement screen
2. User clicks "Sign Agreement"
3. Native signature pad appears
4. User signs and clicks "Done"
5. Signature is captured and displayed
6. User clicks "Submit Signed Agreement"
7. Backend saves signature and agreement PDF
8. User is navigated to agent-info screen
9. No render errors or crashes

## Additional Benefits
- More stable parameter handling throughout the component lifecycle
- Better performance with memoized callbacks
- Cleaner state management with refs for non-reactive data
- More predictable navigation behavior
