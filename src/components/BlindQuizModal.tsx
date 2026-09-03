import React, { useState } from 'react';
import { 
  X, Eye, EyeOff, Lock, Unlock, Sparkles, Heart, Check, 
  Send, Plus, Flame, HelpCircle, MessageSquare, ChevronRight
} from 'lucide-react';
import { User, BlindQuizQuestion } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface BlindQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions?: BlindQuizQuestion[];
  quizzes?: BlindQuizQuestion[];
  currentUser: User;
  partnerUser: User;
  onAnswerQuestion?: (questionId: string, answerText: string) => void;
  onAnswerQuiz?: (questionId: string, answerText: string) => void;
  onAddCustomQuestion?: (question: string, category: BlindQuizQuestion['category'], suggestedOptions?: string[]) => void;
  onCreateQuiz?: (quiz: Omit<BlindQuizQuestion, 'id' | 'createdAt' | 'answers' | 'isRevealed'>) => void;
  onShareResultToChat?: (question: BlindQuizQuestion) => void;
  onShareToChat?: (text: string) => void;
}

export const BlindQuizModal: React.FC<BlindQuizModalProps> = ({
  isOpen,
  onClose,
  questions,
  quizzes,
  currentUser,
  partnerUser,
  onAnswerQuestion,
  onAnswerQuiz,
  onAddCustomQuestion,
  onCreateQuiz,
  onShareResultToChat,
  onShareToChat
}) => {
  const activeQuestions = quizzes || questions || [];
  const handleAnswerCallback = onAnswerQuiz || onAnswerQuestion;
  const handleCreateCallback = onAddCustomQuestion || ((q, cat, opts) => onCreateQuiz?.({ question: q, category: cat, suggestedOptions: opts }));
  
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(activeQuestions[0]?.id || '');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newCategory, setNewCategory] = useState<BlindQuizQuestion['category']>('intimité');
  const [newOptionsText, setNewOptionsText] = useState('');

  if (!isOpen) return null;

  const currentQ = activeQuestions.find(q => q.id === selectedQuestionId) || activeQuestions[0];
  const myAnswer = currentQ?.answers?.[currentUser.id];
  const partnerAnswer = currentQ?.answers?.[partnerUser.id];
  const isBothAnswered = Boolean(myAnswer && partnerAnswer);

  const handleSendAnswer = (answer: string) => {
    if (!answer.trim() || !currentQ) return;
    handleAnswerCallback?.(currentQ.id, answer.trim());
    triggerHaptic(40);
    soundEffects.playSent();
    setTypedAnswer('');
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const options = newOptionsText.trim()
      ? newOptionsText.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined;

    handleCreateCallback(newQuestionText.trim(), newCategory, options);
    triggerHaptic(40);
    soundEffects.playSent();
    setNewQuestionText('');
    setNewOptionsText('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-lg border border-[#2d2254] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d2254] flex items-center justify-between shrink-0 bg-[#1b1435]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#00b894] flex items-center justify-center text-white shadow-lg">
              <EyeOff size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-1.5">
                Quiz Double Aveugle Intime
              </h3>
              <p className="text-xs text-[#a29bfe]">Les réponses restent secrètes jusqu'à ce que vous ayez tous les deux répondu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Question Selector Carousel / Badges */}
        <div className="p-3 bg-[#130f26] border-b border-[#2d2254] flex items-center gap-2 overflow-x-auto">
          {activeQuestions.map((q, idx) => {
            const hasMine = Boolean(q.answers?.[currentUser.id]);
            const hasPartner = Boolean(q.answers?.[partnerUser.id]);
            const isUnlocked = hasMine && hasPartner;
            const isSelected = q.id === currentQ?.id;

            return (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQuestionId(q.id);
                  setTypedAnswer('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#6c5ce7] text-white border-[#a29bfe]/50 shadow-md'
                    : 'bg-[#1b1435] text-[#a29bfe] border-[#2d2254] hover:border-[#6c5ce7]'
                }`}
              >
                <span>Q{idx + 1}</span>
                {isUnlocked ? (
                  <Sparkles size={12} className="text-[#ffeaa7]" />
                ) : hasMine ? (
                  <Lock size={12} className="text-[#00b894]" />
                ) : (
                  <HelpCircle size={12} className="text-[#a29bfe]" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00b894] hover:bg-[#00a884] text-[#130f26] shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Nouvelle Question</span>
          </button>
        </div>

        {/* Main Quiz Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Custom Question Form */}
          {showAddForm && (
            <form onSubmit={handleCreateCustom} className="bg-[#1b1435] border border-[#00b894]/50 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#55efc4] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Poser une Question Secrète</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-[#a29bfe] hover:text-white"
                >
                  Annuler
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Votre question complice</label>
                <input
                  type="text"
                  placeholder="ex: Quel est l'endroit le plus insolite où tu aimerais m'embrasser ?"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="intimité">Intimité & Sensualité</option>
                    <option value="romantisme">Romantisme & Sentiments</option>
                    <option value="souvenirs">Souvenirs & Passé</option>
                    <option value="désirs">Désirs & Fantasmes</option>
                    <option value="futur">Futur & Projets à deux</option>
                    <option value="vérité">Vérité Complice</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Options suggérées (facultatif)</label>
                  <input
                    type="text"
                    placeholder="Séparez par des virgules"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock size={15} />
                <span>Enregistrer sous scellé double aveugle</span>
              </button>
            </form>
          )}

          {/* Current Question Card */}
          {currentQ && (
            <div className="space-y-4">
              
              {/* Question Header */}
              <div className="bg-[#1b1435] border border-[#2d2254] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/30">
                    {currentQ.category}
                  </span>
                  
                  {isBothAnswered ? (
                    <span className="text-[10px] font-bold bg-[#00b894]/20 text-[#55efc4] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Unlock size={11} />
                      <span>Révélé & Synchronisé !</span>
                    </span>
                  ) : myAnswer ? (
                    <span className="text-[10px] font-bold bg-[#ffeaa7]/20 text-[#ffeaa7] px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Lock size={11} />
                      <span>Votre réponse scellée • En attente</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-[#ff7675]/20 text-[#ff7675] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff size={11} />
                      <span>À vous de répondre</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base sm:text-lg text-white leading-snug">
                  {currentQ.question}
                </h3>
              </div>

              {/* CASE 1: BOTH ANSWERED -> REVELATION BOX */}
              {isBothAnswered ? (
                <div className="space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="bg-gradient-to-tr from-[#00b894]/15 via-[#6c5ce7]/15 to-[#fd79a8]/15 border border-[#00b894]/40 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center justify-center gap-1.5 text-center mb-3">
                      <Sparkles size={18} className="text-[#ffeaa7]" />
                      <h4 className="font-bold text-sm text-white">Révélation Complice</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* My Answer */}
                      <div className="bg-[#130f26]/90 border border-[#2d2254] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-[#2d2254]">
                          <img src={currentUser.avatar} alt="You" className="w-5 h-5 rounded-full object-cover" />
                          <span className="text-xs font-bold text-[#55efc4]">Votre réponse</span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">
                          "{myAnswer?.answerText}"
                        </p>
                      </div>

                      {/* Partner Answer */}
                      <div className="bg-[#130f26]/90 border border-[#2d2254] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-[#2d2254]">
                          <img src={partnerUser.avatar} alt={partnerUser.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="text-xs font-bold text-[#fd79a8]">{partnerUser.name}</span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">
                          "{partnerAnswer?.answerText}"
                        </p>
                      </div>
                    </div>

                    {currentQ.funFact && (
                      <div className="mt-3 p-2.5 bg-[#171230] rounded-xl border border-[#2d2254] text-[11px] text-[#a29bfe] flex items-center gap-2">
                        <Heart size={14} className="text-[#fd79a8] shrink-0" />
                        <span>{currentQ.funFact}</span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-[#2d2254] flex justify-end">
                      <button
                        onClick={() => {
                          if (onShareResultToChat) {
                            onShareResultToChat(currentQ);
                          } else if (onShareToChat) {
                            onShareToChat(`✨ *Résultats de notre Quiz Double Aveugle* :\n❓ "${currentQ.question}"\n👤 ${currentUser.name} : "${myAnswer?.answerText}"\n❤️ ${partnerUser.name} : "${partnerAnswer?.answerText}"`);
                          }
                          triggerHaptic(40);
                          soundEffects.playSent();
                        }}
                        className="px-4 py-2 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>Partager le Match dans le Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : myAnswer ? (
                /* CASE 2: I HAVE ANSWERED, WAITING FOR PARTNER */
                <div className="bg-[#1b1435] border border-[#ffeaa7]/40 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#ffeaa7]/20 flex items-center justify-center text-[#ffeaa7] mx-auto animate-pulse">
                    <Lock size={24} />
                  </div>
                  <h4 className="font-bold text-sm text-white">Votre réponse est scellée 🔒</h4>
                  <p className="text-xs text-[#a29bfe] max-w-xs mx-auto">
                    Vous avez répondu : <span className="text-white italic font-medium">"{myAnswer.answerText}"</span>.
                    La réponse de <strong className="text-[#55efc4]">{partnerUser.name}</strong> sera révélée automatiquement dès qu'elle/il aura validé la sienne !
                  </p>
                </div>
              ) : (
                /* CASE 3: I NEED TO ANSWER */
                <div className="space-y-3">
                  {/* Suggested Options if any */}
                  {currentQ.suggestedAnswers && currentQ.suggestedAnswers.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-[#a29bfe] block">Choisissez une réponse rapide :</span>
                      <div className="grid grid-cols-1 gap-2">
                        {currentQ.suggestedAnswers.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendAnswer(opt)}
                            className="text-left p-3 rounded-xl bg-[#1b1435] hover:bg-[#281e4b] border border-[#2d2254] hover:border-[#00b894] text-xs text-white font-medium transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <span>{opt}</span>
                            <ChevronRight size={14} className="text-[#a29bfe] group-hover:text-[#00b894] transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Or Custom Free Text Answer */}
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-[#a29bfe] block mb-1">Ou écrivez votre réponse personnalisée :</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Votre réponse secrète et sincère..."
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendAnswer(typedAnswer);
                          }
                        }}
                        className="flex-1 bg-[#130f26] border border-[#2d2254] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894]"
                      />
                      <button
                        onClick={() => handleSendAnswer(typedAnswer)}
                        disabled={!typedAnswer.trim()}
                        className="px-4 py-2.5 bg-[#00b894] disabled:opacity-40 hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Lock size={14} />
                        <span>Sceller</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#130f26] border-t border-[#2d2254] text-center text-[11px] text-[#a29bfe]">
          <span>Garantie Double Aveugle : Aucun tiers ni partenaire ne peut déchiffrer avant synchronisation 🔒</span>
        </div>

      </div>
    </div>
  );
};
