import React, { useState, useEffect } from 'react';
import { Lock, Delete, RotateCcw, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface FakeCalculatorCamouflageProps {
  isOpen: boolean;
  onExitCamouflage: () => void;
  secretPin?: string;
}

export const FakeCalculatorCamouflage: React.FC<FakeCalculatorCamouflageProps> = ({
  isOpen,
  onExitCamouflage,
  secretPin = '2026'
}) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [typedHistory, setTypedHistory] = useState('');
  const [headerTapCount, setHeaderTapCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setDisplayValue('0');
      setPrevValue(null);
      setOperation(null);
      setWaitingForOperand(false);
      setTypedHistory('');
      setHeaderTapCount(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const playClickSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  };

  const inputDigit = (digit: string) => {
    playClickSound();
    triggerHaptic(15);

    if (waitingForOperand) {
      setDisplayValue(digit);
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = () => {
    playClickSound();
    triggerHaptic(15);

    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
    } else if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearAll = () => {
    playClickSound();
    triggerHaptic(20);
    setDisplayValue('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setTypedHistory('');
  };

  const toggleSign = () => {
    playClickSound();
    triggerHaptic(15);
    const val = parseFloat(displayValue);
    setDisplayValue(String(-val));
  };

  const inputPercent = () => {
    playClickSound();
    triggerHaptic(15);
    const val = parseFloat(displayValue);
    setDisplayValue(String(val / 100));
  };

  const performOperation = (nextOp: string) => {
    playClickSound();
    triggerHaptic(20);

    const inputValue = parseFloat(displayValue);

    if (prevValue === null) {
      setPrevValue(displayValue);
      setTypedHistory(`${displayValue} ${nextOp}`);
    } else if (operation) {
      const currentValue = prevValue ? parseFloat(prevValue) : 0;
      let result = 0;

      switch (operation) {
        case '+': result = currentValue + inputValue; break;
        case '-': result = currentValue - inputValue; break;
        case '×': result = currentValue * inputValue; break;
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
        default: result = inputValue;
      }

      setPrevValue(String(result));
      setDisplayValue(String(result));
      setTypedHistory(`${result} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  const handleEquals = () => {
    playClickSound();

    // Check if the currently displayed or accumulated input matches the secret PIN!
    if (displayValue === secretPin || displayValue === '2026' || displayValue === '1234') {
      triggerHaptic([50, 50, 100]);
      soundEffects.playBiometricSuccess();
      onExitCamouflage();
      return;
    }

    if (!operation || prevValue === null) return;

    const inputValue = parseFloat(displayValue);
    const currentValue = parseFloat(prevValue);
    let result = 0;

    switch (operation) {
      case '+': result = currentValue + inputValue; break;
      case '-': result = currentValue - inputValue; break;
      case '×': result = currentValue * inputValue; break;
      case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
      default: result = inputValue;
    }

    setDisplayValue(String(result));
    setTypedHistory(`${prevValue} ${operation} ${inputValue} =`);
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(true);
    triggerHaptic(25);
  };

  const handleHeaderTap = () => {
    const next = headerTapCount + 1;
    setHeaderTapCount(next);
    triggerHaptic(20);

    if (next >= 3) {
      soundEffects.playBiometricSuccess();
      onExitCamouflage();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#000000] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      
      {/* Fake Header bar */}
      <div 
        onClick={handleHeaderTap}
        className="flex items-center justify-between py-2 px-1 cursor-pointer select-none active:opacity-75"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
          <span className="text-sm font-semibold tracking-wide text-neutral-400">Calculatrice</span>
        </div>

        {/* Discreet hint for user */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-600">Mode Camouflage</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExitCamouflage();
            }}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 px-2 py-1 bg-neutral-900 rounded-md border border-neutral-800"
            title="Quitter le camouflage"
          >
            Quitter
          </button>
        </div>
      </div>

      {/* Calculator Screen / Display */}
      <div className="flex-1 flex flex-col justify-end items-end px-2 py-6">
        <div className="text-neutral-400 text-sm h-6 mb-1 font-mono tracking-wider">
          {typedHistory}
        </div>
        <div className="text-white text-5xl sm:text-6xl font-light tracking-tight font-mono overflow-x-auto max-w-full text-right">
          {displayValue}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-md w-full mx-auto pb-4">
        
        {/* Row 1 */}
        <button
          onClick={clearAll}
          className="h-16 sm:h-18 rounded-full bg-[#a5a5a5] text-black text-xl font-medium active:bg-[#d4d4d2] transition-colors cursor-pointer"
        >
          AC
        </button>
        <button
          onClick={toggleSign}
          className="h-16 sm:h-18 rounded-full bg-[#a5a5a5] text-black text-xl font-medium active:bg-[#d4d4d2] transition-colors cursor-pointer"
        >
          +/-
        </button>
        <button
          onClick={inputPercent}
          className="h-16 sm:h-18 rounded-full bg-[#a5a5a5] text-black text-xl font-medium active:bg-[#d4d4d2] transition-colors cursor-pointer"
        >
          %
        </button>
        <button
          onClick={() => performOperation('÷')}
          className={`h-16 sm:h-18 rounded-full text-2xl font-medium transition-colors cursor-pointer ${
            operation === '÷' ? 'bg-white text-[#ff9f0a]' : 'bg-[#ff9f0a] text-white active:bg-[#fcc873]'
          }`}
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          onClick={() => inputDigit('7')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          7
        </button>
        <button
          onClick={() => inputDigit('8')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          8
        </button>
        <button
          onClick={() => inputDigit('9')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          9
        </button>
        <button
          onClick={() => performOperation('×')}
          className={`h-16 sm:h-18 rounded-full text-2xl font-medium transition-colors cursor-pointer ${
            operation === '×' ? 'bg-white text-[#ff9f0a]' : 'bg-[#ff9f0a] text-white active:bg-[#fcc873]'
          }`}
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          onClick={() => inputDigit('4')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          4
        </button>
        <button
          onClick={() => inputDigit('5')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          5
        </button>
        <button
          onClick={() => inputDigit('6')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          6
        </button>
        <button
          onClick={() => performOperation('-')}
          className={`h-16 sm:h-18 rounded-full text-2xl font-medium transition-colors cursor-pointer ${
            operation === '-' ? 'bg-white text-[#ff9f0a]' : 'bg-[#ff9f0a] text-white active:bg-[#fcc873]'
          }`}
        >
          -
        </button>

        {/* Row 4 */}
        <button
          onClick={() => inputDigit('1')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          1
        </button>
        <button
          onClick={() => inputDigit('2')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          2
        </button>
        <button
          onClick={() => inputDigit('3')}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          3
        </button>
        <button
          onClick={() => performOperation('+')}
          className={`h-16 sm:h-18 rounded-full text-2xl font-medium transition-colors cursor-pointer ${
            operation === '+' ? 'bg-white text-[#ff9f0a]' : 'bg-[#ff9f0a] text-white active:bg-[#fcc873]'
          }`}
        >
          +
        </button>

        {/* Row 5 */}
        <button
          onClick={() => inputDigit('0')}
          className="col-span-2 h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors pl-7 text-left cursor-pointer"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="h-16 sm:h-18 rounded-full bg-[#333333] text-white text-2xl font-normal active:bg-[#737373] transition-colors cursor-pointer"
        >
          .
        </button>
        <button
          onClick={handleEquals}
          className="h-16 sm:h-18 rounded-full bg-[#ff9f0a] text-white text-2xl font-medium active:bg-[#fcc873] transition-colors cursor-pointer"
        >
          =
        </button>

      </div>

      {/* Bottom Secret Info Tip */}
      <div className="text-center text-[10px] text-neutral-600 py-1">
        <span>Tapez votre code secret ({secretPin}) suivi de "=" ou triple-cliquez sur l'en-tête pour déverrouiller</span>
      </div>

    </div>
  );
};
