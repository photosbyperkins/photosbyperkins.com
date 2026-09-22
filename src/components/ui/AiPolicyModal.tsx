import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ShieldBan, ScanFace, Code } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_ai-policy.scss';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
    }),
};

export default function AiPolicyModal() {
    const isAiPolicyOpen = useAppStore((state) => state.isAiPolicyOpen);
    const closeAiPolicy = useAppStore((state) => state.closeAiPolicy);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useBodyScrollLock(isAiPolicyOpen);

    useEffect(() => {
        if (isAiPolicyOpen) {
            previousFocusRef.current = document.activeElement;

            // Auto-focus close button after modal render
            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closeAiPolicy();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                if (previousFocusRef.current instanceof HTMLElement) {
                    previousFocusRef.current.focus();
                }
            };
        }
    }, [isAiPolicyOpen, closeAiPolicy]);

    return (
        <AnimatePresence>
            {isAiPolicyOpen && (
                <motion.div
                    className="ai-policy-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="AI Policy"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="ai-policy-overlay__header-bar">
                        <div className="container ai-policy-overlay__header-bar-inner">
                            <motion.h2
                                className="section-label"
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                            >
                                AI POLICY
                            </motion.h2>
                            <button
                                ref={closeBtnRef}
                                className="ai-policy-overlay__back-btn"
                                onClick={closeAiPolicy}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <section className="ai-policy" id="ai-policy">
                        <div className="container">
                            <div className="ai-policy__container">
                                <motion.div
                                    className="ai-policy__intro"
                                    custom={0}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <h3>Authenticity & Image Integrity</h3>
                                    <p>
                                        Photos featured on this site are authentic records of live sporting and
                                        community events. As the sole photographer and creator of this site, I believe
                                        in complete transparency regarding how technology, including artificial
                                        intelligence, is used in my photography and website workflow.
                                    </p>
                                </motion.div>

                                <div className="ai-policy__cards">
                                    {/* Card 1: Sharpening and Denoising */}
                                    <motion.div
                                        className="ai-policy__card"
                                        custom={1}
                                        initial="hidden"
                                        animate="visible"
                                        variants={fadeUp}
                                    >
                                        <div className="ai-policy__card-icon" aria-hidden="true">
                                            <Sparkles size={22} />
                                        </div>
                                        <div className="ai-policy__card-content">
                                            <h4>Sharpening & Denoising Only</h4>
                                            <p>
                                                I may use AI-assisted tools solely for{' '}
                                                <strong>technical image quality enhancements</strong>, specifically
                                                noise reduction (denoising) and detail sharpening. These adjustments
                                                help manage high digital noise and motion clarity when shooting
                                                fast-paced action in challenging indoor or low-light sports
                                                environments.
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Card 2: Prohibited Alterations */}
                                    <motion.div
                                        className="ai-policy__card"
                                        custom={2}
                                        initial="hidden"
                                        animate="visible"
                                        variants={fadeUp}
                                    >
                                        <div className="ai-policy__card-icon" aria-hidden="true">
                                            <ShieldBan size={22} />
                                        </div>
                                        <div className="ai-policy__card-content">
                                            <h4>No Generative Alterations or Scene Creation</h4>
                                            <p>
                                                I <strong>never</strong> use AI to substantially alter photos, remove
                                                elements or people, add synthetic objects, or invent scenes. What you
                                                see is the genuine moment captured through my lens—preserving the
                                                authenticity and reality of the event.
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Card 3: Build-time Face Detection */}
                                    <motion.div
                                        className="ai-policy__card"
                                        custom={3}
                                        initial="hidden"
                                        animate="visible"
                                        variants={fadeUp}
                                    >
                                        <div className="ai-policy__card-icon" aria-hidden="true">
                                            <ScanFace size={22} />
                                        </div>
                                        <div className="ai-policy__card-content">
                                            <h4>Build-Time Focal Area Detection</h4>
                                            <p>
                                                During the build process of this website, automated computer vision is
                                                used solely to <strong>identify faces to establish focal areas</strong>{' '}
                                                for optimal subject centering and smart cropping across thumbnails and
                                                responsive layouts. No facial recognition, identity tracking, or
                                                biometric profiling is ever performed.
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Card 4: Website Coding Assistance */}
                                    <motion.div
                                        className="ai-policy__card"
                                        custom={4}
                                        initial="hidden"
                                        animate="visible"
                                        variants={fadeUp}
                                    >
                                        <div className="ai-policy__card-icon" aria-hidden="true">
                                            <Code size={22} />
                                        </div>
                                        <div className="ai-policy__card-content">
                                            <h4>Website Development & Coding Assistance</h4>
                                            <p>
                                                For full transparency, AI coding tools and assistants may be used to
                                                help write, refactor, optimize, and maintain the{' '}
                                                <strong>underlying source code for this website</strong>. All code,
                                                infrastructure, and deployment pipelines remain curated, tested, and
                                                engineered by me.
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>

                                <motion.div
                                    className="ai-policy__note"
                                    custom={5}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <p>
                                        <strong>My Commitment to Honest Photography:</strong> While AI aids in technical
                                        refinement and code engineering, every photograph remains an uncompromised,
                                        authentic record of the moment as I captured it in real time.
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </section>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
