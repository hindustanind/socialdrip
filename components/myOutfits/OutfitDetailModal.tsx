import React from 'react';
import { Outfit, User } from '../../types';
import Modal from '../shared/Modal';
import OutfitDetailView from './OutfitDetailView';

interface OutfitDetailModalProps {
  outfit: Outfit;
  onClose: () => void;
  isDevMode: boolean;
  currentUser: User;
  onIncrementDripScore: () => void;
}

const OutfitDetailModal: React.FC<OutfitDetailModalProps> = ({ outfit, onClose, isDevMode, currentUser, onIncrementDripScore }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Outfit Details" closeOnBackdropClick={false}>
      <OutfitDetailView outfit={outfit} isDevMode={isDevMode} currentUser={currentUser} onIncrementDripScore={onIncrementDripScore} />
    </Modal>
  );
};

export default OutfitDetailModal;
