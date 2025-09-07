import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { tutorialSteps, TutorialStep } from '../tutorialSteps';

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface TutorialContextType {
  isTutorialActive: boolean;
  currentStep: TutorialStep | null;
  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  hasCompletedTutorial: boolean;
  setPageNavigator: (navigator: (page: Page) => void) => void;
}

export const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useLocalStorage('dripsocial-tutorial-completed', false);
  const [pageNavigator, setPageNavigator] = useState<(page: Page) => void>(() => () => {});

  const startTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setCurrentStepIndex(0);
    const firstStep = tutorialSteps[0];
    if (firstStep.page) {
        pageNavigator(firstStep.page);
    }
  }, [pageNavigator]);
  
  const stopTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setCurrentStepIndex(-1);
    setHasCompletedTutorial(true);
  }, [setHasCompletedTutorial]);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= tutorialSteps.length) {
      stopTutorial();
    } else {
      setCurrentStepIndex(nextIndex);
      const nextStepDef = tutorialSteps[nextIndex];
      if (nextStepDef.page) {
        pageNavigator(nextStepDef.page);
      }
    }
  }, [currentStepIndex, stopTutorial, pageNavigator]);
  
  const setPageNavigatorCallback = useCallback((navigator: (page: Page) => void) => {
    setPageNavigator(() => navigator);
  }, []);

  const value = {
    isTutorialActive,
    currentStep: isTutorialActive && currentStepIndex >= 0 ? tutorialSteps[currentStepIndex] : null,
    startTutorial,
    stopTutorial,
    nextStep,
    hasCompletedTutorial,
    setPageNavigator: setPageNavigatorCallback,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};