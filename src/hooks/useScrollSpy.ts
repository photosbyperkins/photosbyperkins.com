import { useEffect, useRef } from 'react';

export function useScrollSpy(
    sections: string[],
    onSectionChange: (activeId: string) => void,
    options: IntersectionObserverInit = { rootMargin: '-49% 0px -49% 0px', threshold: 0 }
) {
    // Store latest callback to avoid re-binding observer
    const callbackRef = useRef(onSectionChange);
    useEffect(() => {
        callbackRef.current = onSectionChange;
    }, [onSectionChange]);

    // Store options/sections as stable stringified values to avoid deep dependencies
    const sectionsKey = sections.join(',');
    const optionsKey = JSON.stringify(options);

    useEffect(() => {
        const observed = new Set<string>();

        const observer = new IntersectionObserver((entries) => {
            const visibleEntries = entries.filter((e) => e.isIntersecting);
            if (visibleEntries.length === 0) return;

            const bestEntry = visibleEntries[0];
            callbackRef.current(bestEntry.target.id);
        }, JSON.parse(optionsKey));

        const observeSections = () => {
            const sectionArray = sectionsKey.split(',');
            sectionArray.forEach((id) => {
                if (!observed.has(id)) {
                    const el = document.getElementById(id);
                    if (el) {
                        observer.observe(el);
                        observed.add(id);
                    }
                }
            });
            return observed.size === sectionArray.length;
        };

        let interval: ReturnType<typeof setInterval>;

        if (!observeSections()) {
            interval = setInterval(() => {
                if (observeSections()) clearInterval(interval);
            }, 500);
        }

        return () => {
            if (interval) clearInterval(interval);
            observer.disconnect();
        };
    }, [sectionsKey, optionsKey]);
}
