import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0714] text-white p-6 flex flex-col items-center justify-center font-sans">
          <div className="bg-[#130f26] border border-red-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <h1 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
              <span className="text-2xl">⚠️</span> Erreur Critique
            </h1>
            <p className="text-[#a29bfe] text-sm mb-4">
              L'application a rencontré un problème inattendu et n'a pas pu s'afficher correctement.
            </p>
            
            {this.state.error && (
              <div className="bg-black/50 p-4 rounded-xl mb-4 overflow-auto max-h-40">
                <code className="text-xs text-red-300 font-mono break-words">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            
            {this.state.errorInfo && (
              <div className="bg-black/50 p-4 rounded-xl mb-6 overflow-auto max-h-64">
                <code className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </code>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                🔄 Recharger la page (Conserver mes données)
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr de vouloir réinitialiser l'application ? Vos identifiants locaux seront effacés.")) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition-colors border border-red-500/20"
              >
                ⚠️ Réinitialiser l'application (Efface les données locales)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
