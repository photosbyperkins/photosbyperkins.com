import { motion } from 'framer-motion';
import { Camera, Sparkles, Code } from './icons';
import { useAppStore } from '../../store/useAppStore';
import ModalShell from './ModalShell';
import { modalFadeUp } from './modalAnimation';
import '../../styles/_ai-policy.scss';

export default function AiPolicyModal() {
    const isAiPolicyOpen = useAppStore((state) => state.isAiPolicyOpen);
    const closeAiPolicy = useAppStore((state) => state.closeAiPolicy);

    return (
        <ModalShell
            isOpen={isAiPolicyOpen}
            onClose={closeAiPolicy}
            title="AI POLICY"
            ariaLabel="AI Policy"
            className="ai-policy-overlay"
            maxWidth="default"
        >
            <div className="ai-policy__container">
                <motion.div
                    className="ai-policy__intro"
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <p>
                        Every photo on this site is a real moment captured from a live event. Here is exactly how modern
                        software touches my work—and where the line stays drawn:
                    </p>
                </motion.div>

                <div className="ai-policy__cards">
                    {/* Card 1: Real Moments */}
                    <motion.div
                        className="ai-policy__card"
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <Camera size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>Real Moments, Not Prompts</h4>
                            <p>
                                Generative AI is never used to add, remove, alter, or fabricate anything in a photo. No
                                swapped faces, no erased referees, and no synthetic backgrounds. What you see is exactly
                                what happened in front of the lens.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2: High-ISO Cleanup */}
                    <motion.div
                        className="ai-policy__card"
                        custom={2}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <Sparkles size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>High-ISO Cleanup Only</h4>
                            <p>
                                Shooting fast action in dim indoor venues pushes camera sensors hard. I use AI-assisted
                                tools strictly for technical cleanup—taming digital grain and restoring edge clarity.
                                It’s modern darkroom work: the light, the athletes, and the action remain untouched.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3: Site Plumbing */}
                    <motion.div
                        className="ai-policy__card"
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <Code size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>Site Plumbing: Cropping & Code</h4>
                            <p>
                                Behind the scenes, automated face detection keeps athletes centered in thumbnail crops
                                so nobody gets cut off on mobile, and AI tools assist with site code. It’s routine
                                plumbing—neither touches the pixels of the original photographs.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </ModalShell>
    );
}
