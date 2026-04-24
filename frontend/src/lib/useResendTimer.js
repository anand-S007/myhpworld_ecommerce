import { useEffect, useRef, useState } from 'react';

// useResendTimer — a small countdown hook for "Resend OTP in Xs" buttons.
// Call `start()` after a successful send; the countdown runs to zero once
// per second, at which point the button can be clicked again. Starting it
// again (e.g. after resending) restarts the timer from the top.
//
//   const { remaining, active, start } = useResendTimer(30);
//   <button disabled={active} onClick={async () => { await resend(); start(); }}>
//     {active ? `Resend in ${remaining}s` : 'Resend OTP'}
//   </button>
export function useResendTimer(seconds = 30) {
  const [deadline, setDeadline] = useState(0);
  const [, tick] = useState(0); // force re-render each second
  const intervalRef = useRef(null);

  useEffect(() => {
    if (deadline === 0) return undefined;
    intervalRef.current = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [deadline]);

  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const active = remaining > 0;

  // Clear the interval once we hit zero so we don't keep re-rendering.
  useEffect(() => {
    if (!active && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [active]);

  const start = () => setDeadline(Date.now() + seconds * 1000);
  const reset = () => setDeadline(0);

  return { remaining, active, start, reset };
}
