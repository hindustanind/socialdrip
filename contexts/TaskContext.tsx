import React, { createContext, useContext, ReactNode } from 'react';

// This context is a placeholder for a removed feature.
const TaskContext = createContext<any>(undefined);

export const useTasks = () => {
  return useContext(TaskContext);
};

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Providing an empty object as the value to avoid errors.
  return <TaskContext.Provider value={{}}>{children}</TaskContext.Provider>;
};

export default TaskContext;
