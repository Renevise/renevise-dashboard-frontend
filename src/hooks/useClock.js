import { useState, useEffect } from "react";

export function useClock(isClockedIn, clockInTimestamp) {
    const [elapsed, setElapsed] = useState(() => {
        if (isClockedIn && clockInTimestamp) {
            return Math.max(0, Math.floor((Date.now() - clockInTimestamp) / 1000));
        }
        return 0;
    });

    useEffect(() => {
        if (!isClockedIn || !clockInTimestamp) {
            setElapsed(0);
            return;
        }
        setElapsed(Math.max(0, Math.floor((Date.now() - clockInTimestamp) / 1000)));

        const id = setInterval(() => {
            setElapsed(Math.max(0, Math.floor((Date.now() - clockInTimestamp) / 1000)));
        }, 1000);

        return () => clearInterval(id);
    }, [isClockedIn, clockInTimestamp]);

    return elapsed;
}
