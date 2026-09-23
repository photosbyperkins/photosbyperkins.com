import { useAppStore } from '../../store/useAppStore';
import ModalShell from './ModalShell';
import '../../styles/_gear-modal.scss';

export default function GearModal() {
    const activeGear = useAppStore((state) => state.activeGear);
    const closeGearModal = useAppStore((state) => state.closeGearModal);

    const titleNode = activeGear ? (
        <>
            <span className="gear-modal__name-full">{activeGear.name}</span>
            <span className="gear-modal__name-compact">{activeGear.compactName || activeGear.name}</span>
        </>
    ) : (
        ''
    );

    return (
        <ModalShell
            isOpen={Boolean(activeGear)}
            onClose={closeGearModal}
            title={titleNode}
            ariaLabel={activeGear?.name || 'Gear Specifications'}
            className="gear-modal-overlay"
            contentClassName="gear-modal"
            maxWidth="default"
            externalUrl={activeGear?.officialUrl}
            externalTitle="Open official product page"
        >
            {activeGear && (
                <div className="gear-modal__card">
                    <div className="gear-modal__spec-grid">
                        {Object.entries(activeGear.specs).map(([key, val]) => (
                            <div key={key} className="gear-modal__spec-item">
                                <div className="gear-modal__spec-label">{key}</div>
                                <div className="gear-modal__spec-val">{val}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </ModalShell>
    );
}
