/** framer-motion-only props that React warns about when a test mock spreads them onto a DOM element. */
const MOTION_ONLY_PROPS = new Set([
    'layout',
    'layoutId',
    'layoutDependency',
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileInView',
    'whileDrag',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragTransition',
    'dragMomentum',
    'dragListener',
    'dragControls',
    'dragSnapToOrigin',
    'onAnimationComplete',
    'onDragStart',
    'onDrag',
    'onDragEnd',
]);

/** Returns `props` without framer-motion-only keys, so mocked `motion.*` components render clean DOM. */
export function stripMotionProps<T extends object>(props: T): T {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        if (!MOTION_ONLY_PROPS.has(key)) out[key] = value;
    }
    return out as T;
}
