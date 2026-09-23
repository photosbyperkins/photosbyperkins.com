import { motion } from 'framer-motion';
import { Sparkles, ShieldBan, ScanFace, Code } from 'lucide-react';
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
                        Photos featured on this site are authentic records of live sporting and community events. As the
                        sole photographer and creator of this site, I believe in complete transparency regarding how
                        technology, including artificial intelligence, is used in my photography and website workflow.
                    </p>
                </motion.div>

                <div className="ai-policy__cards">
                    {/* Card 1: Sharpening and Denoising */}
                    <motion.div
                        className="ai-policy__card"
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <Sparkles size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>Sharpening & Denoising Only</h4>
                            <p>
                                I may use AI-assisted tools solely for{' '}
                                <strong>technical image quality enhancements</strong>, specifically noise reduction
                                (denoising) and detail sharpening. These adjustments help manage high digital noise and
                                motion clarity when shooting fast-paced action in challenging indoor or low-light sports
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
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <ShieldBan size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>No Generative Alterations or Scene Creation</h4>
                            <p>
                                I <strong>never</strong> use AI to substantially alter photos, remove elements or
                                people, add synthetic objects, or invent scenes. What you see is the genuine moment
                                captured through my lens—preserving the authenticity and reality of the event.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3: Build-time Face Detection */}
                    <motion.div
                        className="ai-policy__card"
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <ScanFace size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>Build-Time Focal Area Detection</h4>
                            <p>
                                During the build process of this website, automated computer vision is used solely to{' '}
                                <strong>identify faces to establish focal areas</strong> for optimal subject centering
                                and smart cropping across thumbnails and responsive layouts. No facial recognition,
                                identity tracking, or biometric profiling is ever performed.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 4: Website Coding Assistance */}
                    <motion.div
                        className="ai-policy__card"
                        custom={4}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="ai-policy__card-icon" aria-hidden="true">
                            <Code size={22} />
                        </div>
                        <div className="ai-policy__card-content">
                            <h4>Website Development & Coding Assistance</h4>
                            <p>
                                For full transparency, AI coding tools and assistants may be used to help write,
                                refactor, optimize, and maintain the{' '}
                                <strong>underlying source code for this website</strong>. All code, infrastructure, and
                                deployment pipelines remain curated, tested, and engineered by me.
                            </p>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    className="ai-policy__note"
                    custom={5}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <p>
                        <strong>My Commitment to Honest Photography:</strong> While AI aids in technical refinement and
                        code engineering, every photograph remains an uncompromised, authentic record of the moment as I
                        captured it in real time.
                    </p>
                </motion.div>
            </div>
        </ModalShell>
    );
}
