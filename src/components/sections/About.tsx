import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import ModalShell from '../ui/ModalShell';
import { modalFadeUp } from '../ui/modalAnimation';
import '../../styles/_about.scss';

declare const __BUILD_NUMBER__: string;

// Lightweight inline markdown renderer: **bold**, *italic*, [text](url)
function parseInline(text: string): React.ReactNode[] {
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g;
    const nodes: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIdx) {
            nodes.push(text.slice(lastIdx, match.index));
        }
        if (match[2]) {
            nodes.push(<strong key={key++}>{match[2]}</strong>);
        } else if (match[3]) {
            nodes.push(<em key={key++}>{match[3]}</em>);
        } else if (match[4] && match[5]) {
            nodes.push(
                <a key={key++} href={match[5]} target="_blank" rel="noopener noreferrer">
                    {match[4]}
                </a>
            );
        }
        lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
    return nodes;
}

export default function About() {
    const isAboutOpen = useAppStore((state) => state.isAboutOpen);
    const closeAbout = useAppStore((state) => state.closeAbout);

    return (
        <ModalShell
            isOpen={isAboutOpen}
            onClose={closeAbout}
            title="BEHIND THE LENS"
            ariaLabel="About the photographer"
            className="about-modal"
            maxWidth="wide"
        >
            <section className="about" id="about">
                <div className="about__grid">
                    {/* Photo column */}
                    <motion.div
                        className="about__photo-wrapper"
                        custom={0}
                        initial="hidden"
                        animate="visible"
                        variants={modalFadeUp}
                    >
                        <div className="about__photo-frame">
                            <img
                                className="about__photo"
                                src={`/photos/profile_photo.jpg?v=${__BUILD_NUMBER__}`}
                                alt={import.meta.env.VITE_ABOUT_PHOTO_ALT || 'Photographer Profile Photo'}
                            />
                        </div>
                    </motion.div>

                    {/* Text column */}
                    <div className="about__text">
                        <motion.div
                            className="about__body"
                            custom={1}
                            initial="hidden"
                            animate="visible"
                            variants={modalFadeUp}
                        >
                            {import.meta.env.VITE_ABOUT_ME ? (
                                import.meta.env.VITE_ABOUT_ME.split('\n').map((paragraph: string, i: number) => {
                                    if (!paragraph.trim()) return null;
                                    return <p key={i}>{parseInline(paragraph)}</p>;
                                })
                            ) : (
                                <p>Welcome to my photography portfolio!</p>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>
        </ModalShell>
    );
}
