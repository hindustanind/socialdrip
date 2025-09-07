
import React from 'react';
import { UploadTask } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';

interface BulkUploadModalProps {
    tasks: UploadTask[];
    onClose: () => void;
    onRetry: (taskId: string) => void;
    onCancel: (taskId: string) => void;
    onCancelAll: () => void;
    isOpen: boolean;
}

const getStageText = (stage: string) => stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const TaskItem: React.FC<{ task: UploadTask; onRetry: (id: string) => void; onCancel: (id: string) => void; }> = ({ task, onRetry, onCancel }) => {
    const isTerminated = task.stage === 'done' || task.stage === 'failed' || task.stage === 'canceled';
    return (
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-lg">
            <img src={task.previewUrl} alt={task.file.name} className="w-16 h-20 object-cover rounded-md" />
            <div className="flex-grow">
                <p className="text-sm font-semibold truncate text-gray-200">{task.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-gradient-to-r from-[#f400f4] to-[#00f2ff] h-2 rounded-full" style={{ width: `${task.progress}%`, transition: 'width 0.3s ease' }}></div></div>
                    <span className="text-xs font-mono w-10 text-right">{task.progress}%</span>
                </div>
                {task.stage === 'failed' ? (
                     <p className="text-xs text-red-400 mt-1 truncate" title={task.error}>Error: {task.error}</p>
                ) : (
                    <p className="text-xs text-gray-400 mt-1">{getStageText(task.stage)}</p>
                )}
            </div>
            <div className="flex flex-col gap-1">
                {task.stage === 'failed' && <Button onClick={() => onRetry(task.id)} variant="secondary" className="px-2 py-1 text-xs">Retry</Button>}
                {!isTerminated && <Button onClick={() => onCancel(task.id)} variant="secondary" className="px-2 py-1 text-xs">Cancel</Button>}
            </div>
        </div>
    );
};


const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ tasks, isOpen, onClose, onRetry, onCancel, onCancelAll }) => {
    const completedTasks = tasks.filter(t => t.stage === 'done').length;
    const failedTasks = tasks.filter(t => t.stage === 'failed' || t.stage === 'canceled').length;
    const isProcessing = tasks.some(t => !['done', 'failed', 'canceled'].includes(t.stage));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Outfit Upload (Dev Mode)">
            <div className="flex flex-col h-[60vh]">
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-md mb-4">
                    <p className="text-sm">Status: <span className="font-bold text-green-400">{completedTasks} Succeeded</span>, <span className="font-bold text-red-400">{failedTasks} Failed</span>, <span className="font-bold text-cyan-400">{tasks.length - completedTasks - failedTasks} Pending</span></p>
                    <Button onClick={onCancelAll} variant="secondary" disabled={!isProcessing} className="text-xs px-3 py-1">Cancel All</Button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {tasks.map(task => <TaskItem key={task.id} task={task} onRetry={onRetry} onCancel={onCancel} />)}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                    <Button onClick={onClose} disabled={isProcessing}>
                        {isProcessing ? 'Uploading...' : 'Done'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default BulkUploadModal;
