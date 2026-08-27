import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import { PollData } from '../types';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (poll: PollData) => void;
}

export const PollModal: React.FC<PollModalProps> = ({ isOpen, onClose, onCreatePoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 12) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    onCreatePoll({
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        votes: []
      })),
      allowMultiple
    });

    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  const isValid = question.trim().length > 0 && options.filter(o => o.trim().length > 0).length >= 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl w-full max-w-md p-5 border border-[#374248] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#374248]">
          <div className="flex items-center gap-2 text-[#00a884]">
            <BarChart2 size={20} />
            <h3 className="font-semibold text-base text-[#e9edef]">Créer un sondage</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* Question */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Question
            </label>
            <input
              type="text"
              placeholder="Posez une question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3.5 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
              autoFocus
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Options
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    className="flex-1 bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-[#8696a0] hover:text-[#ea4335] p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-xs text-[#00a884] font-medium flex items-center gap-1.5 hover:underline py-1"
              >
                <Plus size={15} />
                <span>Ajouter une option</span>
              </button>
            )}
          </div>

          {/* Multiple answers switch */}
          <div className="flex items-center justify-between pt-2 border-t border-[#374248]">
            <span className="text-sm text-[#e9edef]">Autoriser plusieurs réponses</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#374248] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-2 border-t border-[#374248]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                isValid
                  ? 'bg-[#00a884] text-[#111b21] hover:bg-[#029070] shadow-md'
                  : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed'
              }`}
            >
              Envoyer le sondage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
